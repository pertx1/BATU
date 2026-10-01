import "server-only";
import { db } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 20;

export type LoginGate = { allowed: true } | { allowed: false; retryAfterMinutes: number };

/** Bloqueo temporal: 5 fallos por email (o 20 por IP) en 15 minutos. */
export async function checkLoginAllowed(email: string, ip: string | null): Promise<LoginGate> {
  const since = new Date(Date.now() - WINDOW_MS);

  const [emailFailures, ipFailures] = await Promise.all([
    db.loginAttempt.findMany({
      where: { email, success: false, createdAt: { gt: since } },
      orderBy: { createdAt: "desc" },
      take: MAX_FAILURES_PER_EMAIL,
      select: { createdAt: true },
    }),
    ip
      ? db.loginAttempt.findMany({
          where: { ip, success: false, createdAt: { gt: since } },
          orderBy: { createdAt: "desc" },
          take: MAX_FAILURES_PER_IP,
          select: { createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const blockedBy =
    emailFailures.length >= MAX_FAILURES_PER_EMAIL
      ? emailFailures
      : ipFailures.length >= MAX_FAILURES_PER_IP
        ? ipFailures
        : null;
  if (!blockedBy) return { allowed: true };

  // El bloqueo termina cuando el fallo más antiguo de la ventana sale de ella.
  const oldest = blockedBy[blockedBy.length - 1].createdAt.getTime();
  const retryAfterMs = oldest + WINDOW_MS - Date.now();
  return { allowed: false, retryAfterMinutes: Math.max(1, Math.ceil(retryAfterMs / 60000)) };
}

export async function recordLoginAttempt(email: string, ip: string | null, success: boolean) {
  if (success) {
    // Un acceso correcto limpia los fallos previos de ese email.
    await db.loginAttempt.deleteMany({ where: { email, success: false } });
  }
  await db.loginAttempt.create({ data: { email, ip, success } });
}

export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64) || null;
  return headers.get("x-real-ip")?.slice(0, 64) ?? null;
}
