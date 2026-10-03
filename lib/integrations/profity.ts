import "server-only";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { dateStrToDb, DEFAULT_TZ, todayStr } from "@/lib/dates";
import { parseProfityItems, profityNotes, type ProfityItem } from "@/lib/integrations/profity-items";

/**
 * Integración con Profity (la web de gastos, pedidos y stock). Cada usuario
 * genera su clave en Profity (Ajustes → Conectar con Antola) y la pega en
 * Antola (Ajustes → Profity). Cada hora se pregunta qué hay que pedir (stock a
 * 0 o menos) y se crea una tarea por artículo en SU cuenta.
 *
 * - La dirección de Profity la fija el servidor (PROFITY_URL): ningún usuario
 *   puede hacer que Antola llame a otra web.
 * - No repite tareas: cada una lleva `externalKey = "profity:<artículo>"`.
 * - Si la tachas y el artículo sigue a 0, no vuelve a crearla; cuando Profity
 *   ya tiene stock, se «suelta» la clave y, si vuelve a faltar, sale otra.
 * - Si aún estaba sin tachar y ya hay stock, se completa sola.
 */

const PREFIX = "profity:";
const TIMEOUT_MS = 10_000;
const MAX_LINKS_PER_RUN = 500;

export function profityUrl(): string | null {
  const url = process.env.PROFITY_URL?.trim().replace(/\/+$/, "");
  return url && /^https?:\/\//.test(url) ? url : null;
}

class ProfityError extends Error {
  constructor(
    message: string,
    readonly badToken = false,
  ) {
    super(message);
  }
}

/** Lo que hay que pedir según Profity, para la cuenta dueña de la clave. */
async function fetchItems(token: string): Promise<ProfityItem[]> {
  const url = profityUrl();
  if (!url) throw new ProfityError("La conexión con Profity no está configurada en el servidor (falta PROFITY_URL).");
  let res: Response;
  try {
    res = await fetch(`${url}/api/antola/stock`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ProfityError("Profity no responde ahora mismo. Se volverá a intentar en una hora.");
  }
  if (res.status === 401) throw new ProfityError("La clave de Profity no es válida o se ha desconectado. Genera una nueva en Profity.", true);
  if (!res.ok) throw new ProfityError(`Profity ha respondido con un error (${res.status}). Se volverá a intentar en una hora.`);
  try {
    return parseProfityItems(await res.json());
  } catch {
    throw new ProfityError("Profity ha respondido algo inesperado.");
  }
}

export type ProfitySync = { creadas: number; actualizadas: number; completadas: number; faltan: number };

/** Convierte la lista de Profity en tareas de un usuario (crear, actualizar, completar solas). */
async function applyItems(userId: string, tz: string, items: ProfityItem[], now: Date): Promise<ProfitySync> {
  const today = todayStr(tz, now);
  const wanted = new Map(items.map((i) => [PREFIX + i.key, i]));
  const tasks = await db.task.findMany({
    where: { userId, externalKey: { startsWith: PREFIX } },
    select: { id: true, externalKey: true, completedAt: true, notes: true },
  });
  let actualizadas = 0;
  let completadas = 0;

  for (const t of tasks) {
    const item = wanted.get(t.externalKey!);
    if (!item) {
      // Ya hay stock: se libera la clave (y si seguía pendiente, se completa sola).
      await db.task.updateMany({
        where: { id: t.id, userId },
        data: {
          externalKey: null,
          ...(t.completedAt ? {} : { completedAt: now, remindAt: null, notes: `${t.notes ?? ""}\nCompletada sola: Profity ya tiene stock.`.trim() }),
        },
      });
      if (!t.completedAt) completadas++;
    } else if (!t.completedAt) {
      const notes = profityNotes(item.quantity);
      if (notes !== t.notes) {
        await db.task.updateMany({ where: { id: t.id, userId }, data: { notes } });
        actualizadas++;
      }
    }
  }

  const existing = new Set(tasks.map((t) => t.externalKey));
  const fresh = items.filter((i) => !existing.has(PREFIX + i.key));
  const created = fresh.length
    ? await db.task.createMany({
        data: fresh.map((i) => ({
          userId,
          externalKey: PREFIX + i.key,
          title: `Pedir ${i.label}`,
          notes: profityNotes(i.quantity),
          priority: "HIGH" as const,
          dueDate: dateStrToDb(today),
          remindAt: now, // aviso en el móvil en la siguiente pasada del cron
        })),
        skipDuplicates: true,
      })
    : { count: 0 };

  return { creadas: created.count, actualizadas, completadas, faltan: items.length };
}

/** Sincroniza un usuario conectado y guarda el resultado (o el error) en su conexión. */
export async function syncProfityUser(userId: string, now = new Date()): Promise<ProfitySync | null> {
  const link = await db.profityLink.findUnique({
    where: { userId },
    select: { token: true, user: { select: { settings: { select: { timezone: true } } } } },
  });
  if (!link) return null;
  try {
    const items = await fetchItems(link.token);
    const report = await applyItems(userId, link.user.settings?.timezone ?? DEFAULT_TZ, items, now);
    await db.profityLink.updateMany({ where: { userId }, data: { syncedAt: now, error: null } });
    return report;
  } catch (err) {
    const message = err instanceof ProfityError ? err.message : "No se ha podido sincronizar con Profity.";
    if (!(err instanceof ProfityError)) console.error("[antola] Profity:", err);
    await db.profityLink.updateMany({ where: { userId }, data: { error: message } });
    throw new HttpError(err instanceof ProfityError && err.badToken ? 400 : 502, message);
  }
}

/** Conecta la cuenta con una clave de Profity (se comprueba antes de guardarla) y sincroniza ya. */
export async function connectProfity(userId: string, token: string, now = new Date()): Promise<ProfitySync> {
  let items: ProfityItem[];
  try {
    items = await fetchItems(token);
  } catch (err) {
    const message = err instanceof ProfityError ? err.message : "No se ha podido conectar con Profity.";
    throw new HttpError(err instanceof ProfityError && err.badToken ? 400 : 502, message);
  }
  const link = await db.profityLink.upsert({
    where: { userId },
    create: { userId, token, syncedAt: now },
    update: { token, connectedAt: now, syncedAt: now, error: null },
    select: { user: { select: { settings: { select: { timezone: true } } } } },
  });
  return applyItems(userId, link.user.settings?.timezone ?? DEFAULT_TZ, items, now);
}

export async function disconnectProfity(userId: string) {
  await db.profityLink.deleteMany({ where: { userId } });
}

/** Para el cron (cada hora): sincroniza a todos los usuarios conectados y activos. */
export async function syncAllProfity(now = new Date()) {
  if (!profityUrl()) return { usuarios: 0, errores: 0 };
  const links = await db.profityLink.findMany({
    where: { user: { disabledAt: null } },
    select: { userId: true },
    orderBy: { syncedAt: { sort: "asc", nulls: "first" } },
    take: MAX_LINKS_PER_RUN,
  });
  let errores = 0;
  for (const l of links) {
    try {
      await syncProfityUser(l.userId, now);
    } catch {
      errores++;
    }
  }
  return { usuarios: links.length, errores };
}
