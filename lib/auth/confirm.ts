import "server-only";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { checkLoginAllowed, clientIp, recordLoginAttempt } from "@/lib/auth/rate-limit";

/**
 * Pide la contraseña actual antes de algo delicado (cambiar email o
 * contraseña, borrar la cuenta). Comparte el bloqueo por intentos del login.
 */
export async function confirmPassword(req: Request, userId: string, password: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, passwordHash: true } });
  if (!user) throw new HttpError(401, "No has iniciado sesión");
  const ip = clientIp(req.headers);
  const gate = await checkLoginAllowed(user.email, ip);
  if (!gate.allowed) throw new HttpError(429, `Demasiados intentos. Vuelve a probar en ${gate.retryAfterMinutes} min.`);
  if (!(await verifyPassword(password, user.passwordHash))) {
    await recordLoginAttempt(user.email, ip, false);
    throw new HttpError(403, "La contraseña actual no es correcta");
  }
  return user;
}
