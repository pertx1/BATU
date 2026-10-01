import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentSession, type CurrentSession } from "@/lib/auth/session";
import { ensureMigrated } from "@/lib/migrate";

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
  console.error(err);
  return jsonError(500, "Error interno");
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
