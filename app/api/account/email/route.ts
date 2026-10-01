import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, parseBody, withUser } from "@/lib/api";
import { confirmPassword } from "@/lib/auth/confirm";
import { emailSchema } from "@/lib/validation";

const schema = z.object({ email: emailSchema, password: z.string().min(1, "Escribe tu contraseña").max(200) });

export const POST = withUser(async (req, { userId, user }) => {
  const body = await parseBody(req, schema);
  if (body.email === user.email) throw new HttpError(400, "Ese ya es tu email");
  await confirmPassword(req, userId, body.password);
  const taken = await db.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (taken) throw new HttpError(409, "Ya existe una cuenta con ese email");
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { email: body.email } }),
    // Un enlace de recuperación pedido para el email anterior deja de valer.
    db.passwordResetToken.deleteMany({ where: { userId } }),
  ]);
  return NextResponse.json({ ok: true });
});
