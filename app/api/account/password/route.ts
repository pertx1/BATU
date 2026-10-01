import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
import { confirmPassword } from "@/lib/auth/confirm";
import { hashPassword } from "@/lib/auth/password";
import { passwordSchema } from "@/lib/validation";

const schema = z.object({
  currentPassword: z.string().min(1, "Escribe tu contraseña actual").max(200),
  newPassword: passwordSchema,
});

/** Cambia la contraseña y cierra las demás sesiones (esta sigue abierta). */
export const POST = withUser(async (req, { userId, sessionId }) => {
  const body = await parseBody(req, schema);
  await confirmPassword(req, userId, body.currentPassword);
  const passwordHash = await hashPassword(body.newPassword);
  const [, closed] = await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId, NOT: { id: sessionId } } }),
    db.passwordResetToken.deleteMany({ where: { userId } }),
  ]);
  return NextResponse.json({ ok: true, closedSessions: closed.count });
});
