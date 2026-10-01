import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth/session";

export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 10;

/**
 * Límite de peticiones de "he olvidado mi contraseña": 3 por email y 10 por
 * IP cada hora. Se apunta en LoginAttempt con el prefijo "reset:" (como
 * success=true para no contar como fallo de login).
 */
export async function resetRequestAllowed(email: string, ip: string | null): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    db.loginAttempt.count({ where: { email: `reset:${email}`, createdAt: { gt: since } } }),
    ip ? db.loginAttempt.count({ where: { ip, email: { startsWith: "reset:" }, createdAt: { gt: since } } }) : 0,
  ]);
  await db.loginAttempt.create({ data: { email: `reset:${email}`, ip, success: true } });
  return byEmail < MAX_PER_EMAIL && byIp < MAX_PER_IP;
}

/** Crea un enlace de un solo uso (en la BD solo se guarda su hash). Anula los anteriores. */
export async function createResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    db.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    }),
  ]);
  return token;
}

/** Token válido (sin usar, sin caducar y de una cuenta activa) o null. */
export async function findValidResetToken(token: string) {
  if (!token || token.length > 200) return null;
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, disabledAt: true } } },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now() || record.user.disabledAt) return null;
  return record;
}
