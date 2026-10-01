import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensureMigrated } from "@/lib/migrate";

export const SESSION_COOKIE = "antola_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 año
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  onboardedAt: Date | null;
  timezone: string;
};

export type CurrentSession = {
  sessionId: string;
  user: SessionUser;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/** Crea una sesión en la BD y deja la cookie puesta. Solo en route handlers. */
export async function createSession(userId: string, userAgent: string | null): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      id: hashToken(token),
      userId,
      userAgent: userAgent?.slice(0, 300) ?? null,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

/**
 * Sesión actual a partir de la cookie. Es la ÚNICA fuente del userId en el
 * servidor. Se memoiza por petición.
 */
export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  await ensureMigrated().catch((err) => console.error("[antola] migraciones:", err.message));
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          onboardedAt: true,
          disabledAt: true,
          settings: { select: { timezone: true } },
        },
      },
    },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now || session.user.disabledAt) return null;

  // Sesión deslizante: se renueva como mucho cada 5 minutos.
  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    const nowDate = new Date(now);
    await db.$transaction([
      db.session.update({
        where: { id: session.id },
        data: {
          lastSeenAt: nowDate,
          expiresAt: new Date(now + SESSION_MAX_AGE_SECONDS * 1000),
        },
      }),
      db.user.update({ where: { id: session.userId }, data: { lastActiveAt: nowDate } }),
    ]);
  }

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      onboardedAt: session.user.onboardedAt,
      timezone: session.user.settings?.timezone ?? "Europe/Madrid",
    },
  };
});

/** Para páginas: devuelve el usuario o redirige al login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session.user;
}

/** Para páginas de la app: además exige haber completado la bienvenida. */
export async function requireOnboardedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.onboardedAt) redirect("/bienvenida");
  return user;
}

/** Cierra la sesión actual (borra también sus suscripciones push en cascada). */
export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { id: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}
