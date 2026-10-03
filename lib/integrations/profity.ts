import "server-only";
import { db } from "@/lib/db";
import { dateStrToDb, DEFAULT_TZ, todayStr } from "@/lib/dates";
import { parseProfityItems, profityNotes, type ProfityItem } from "@/lib/integrations/profity-items";

/**
 * Integración con Profity (la web de gastos, pedidos y stock): cada hora
 * Antola pregunta qué hay que pedir (stock a 0 o menos) y crea una tarea por
 * artículo en la cuenta PROFITY_USER_EMAIL. Todo se configura con variables
 * de entorno del servidor (la URL no la elige ningún usuario).
 *
 * - No repite tareas: cada una lleva `externalKey = "profity:<artículo>"`.
 * - Si la tachas y el artículo sigue a 0, no vuelve a crearla; cuando Profity
 *   ya tiene stock, se «suelta» la clave y, si vuelve a faltar, sale otra.
 * - Si aún estaba sin tachar y ya hay stock, se completa sola.
 */

const PREFIX = "profity:";
const TIMEOUT_MS = 10_000;

export function profityConfig() {
  const url = process.env.PROFITY_URL?.trim().replace(/\/+$/, "");
  const token = process.env.PROFITY_TOKEN?.trim();
  const email = process.env.PROFITY_USER_EMAIL?.trim().toLowerCase();
  if (!url || !token || !email) return null;
  if (!/^https?:\/\//.test(url)) return null;
  return { url, token, email };
}

export type ProfitySyncReport = { creadas: number; actualizadas: number; completadas: number; faltan: number } | { error: string } | null;

export async function syncProfityStock(now = new Date()): Promise<ProfitySyncReport> {
  const cfg = profityConfig();
  if (!cfg) return null;
  const user = await db.user.findFirst({
    where: { email: cfg.email, disabledAt: null },
    select: { id: true, settings: { select: { timezone: true } } },
  });
  if (!user) return { error: "No existe ninguna cuenta de Antola con PROFITY_USER_EMAIL" };

  let items: ProfityItem[];
  try {
    const res = await fetch(`${cfg.url}/api/antola/stock`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { error: `Profity respondió ${res.status}` };
    items = parseProfityItems(await res.json());
  } catch (err) {
    return { error: `No se pudo leer Profity: ${(err as Error).message}` };
  }

  const userId = user.id;
  const today = todayStr(user.settings?.timezone ?? DEFAULT_TZ, now);
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
