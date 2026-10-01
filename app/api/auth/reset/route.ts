import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, parseBody, withPublic } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { findValidResetToken } from "@/lib/auth/reset";
import { createSession } from "@/lib/auth/session";
import { passwordSchema } from "@/lib/validation";

const schema = z.object({ token: z.string().min(1).max(200), password: passwordSchema });

/**
 * Cambia la contraseña con un enlace de recuperación: lo marca como usado,
 * cierra todas las sesiones abiertas (en cualquier dispositivo) y abre una nueva aquí.
 */
export const POST = withPublic(async (req) => {
  const { token, password } = await parseBody(req, schema);
  const record = await findValidResetToken(token);
  const invalid = new HttpError(400, "El enlace no es válido o ha caducado. Pide uno nuevo.");
  if (!record) throw invalid;

  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    // Solo un uso, aunque lleguen dos peticiones a la vez.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw invalid;
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } });
    await tx.loginAttempt.deleteMany({ where: { email: record.user.email, success: false } });
  });

  await createSession(record.userId, req.headers.get("user-agent"));
  const user = await db.user.findUnique({ where: { id: record.userId }, select: { onboardedAt: true } });
  return NextResponse.json({ ok: true, redirect: user?.onboardedAt ? "/" : "/bienvenida" });
});
