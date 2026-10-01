import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentSession, type CurrentSession } from "@/lib/auth/session";
import { ensureMigrated } from "@/lib/migrate";

// Mensajes de error de zod en español (los que no tienen uno propio).
z.config(z.locales.es());

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "No encontrado");

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Valida el cuerpo JSON con un esquema zod (400 si no cuadra). */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Cuerpo de la petición no válido");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new HttpError(400, first?.message ?? "Datos no válidos");
  }
  return result.data;
}

/**
 * Protección CSRF básica: las peticiones que modifican datos deben venir de
 * nuestro propio origen (además de la cookie SameSite=Lax).
 */
function checkSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Origen no permitido");
  }
  if (!host || originHost !== host) throw new HttpError(403, "Origen no permitido");
}

function handleError(err: unknown) {
  if (err instanceof HttpError) return jsonError(err.status, err.message);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Registro inexistente (o de otro usuario, que para nosotros es lo mismo).
    if (err.code === "P2025") return jsonError(404, "No encontrado");
    if (err.code === "P2002") return jsonError(409, "Ya existe");
  }
  console.error("[antola] Error en la API:", err);
  return jsonError(...describeServerError(err));
}

/**
 * Traduce los fallos de servidor a un mensaje útil en español, con el código
 * de Prisma/PostgreSQL pero sin datos sensibles (nunca la URL ni la contraseña).
 */
export function describeServerError(err: unknown): [number, string] {
  const help = " Abre /api/salud para ver el detalle.";
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return [503, `No se puede conectar con la base de datos (${err.errorCode ?? "sin código"}).${help}`];
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2021" || err.code === "P2022") {
      return [503, `Faltan tablas en la base de datos (${err.code}). Se crearán al reintentar en unos segundos.${help}`];
    }
    if (err.code.startsWith("P1")) {
      return [503, `No se puede conectar con la base de datos (${err.code}).${help}`];
    }
    return [500, `Error de base de datos (${err.code}).${help}`];
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError || err instanceof Prisma.PrismaClientRustPanicError) {
    const msg = String((err as Error).message ?? "");
    const pg = /prepared statement/i.test(msg) ? "pooler sin pgbouncer=true" : "desconocido";
    return [500, `Error de base de datos (${pg}).${help}`];
  }
  return [500, `Error interno (${err instanceof Error ? err.name : "desconocido"}).${help}`];
}

type RouteCtx<P> = { params: Promise<P> };

/** Endpoint público (login, registro…): solo comprobación de origen y errores. */
export function withPublic<P = Record<string, string>>(
  handler: (req: NextRequest, ctx: RouteCtx<P>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: RouteCtx<P>) => {
    try {
      checkSameOrigin(req);
      await ensureMigrated().catch((err) => console.error("[antola] migraciones:", err.message));
      return await handler(req, ctx);
    } catch (err) {
      return handleError(err);
    }
  };
}

/**
 * Endpoint privado. El userId sale SIEMPRE de la sesión del servidor; nunca
 * se acepta del cliente. Si no hay sesión válida → 401.
 */
export function withUser<P = Record<string, string>>(
  handler: (
    req: NextRequest,
    auth: CurrentSession & { userId: string },
    params: P,
  ) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: RouteCtx<P>) => {
    try {
      checkSameOrigin(req);
      const session = await getCurrentSession();
      if (!session) return jsonError(401, "No has iniciado sesión");
      const params = ctx?.params ? await ctx.params : ({} as P);
      return await handler(req, { ...session, userId: session.user.id }, params);
    } catch (err) {
      return handleError(err);
    }
  };
}
