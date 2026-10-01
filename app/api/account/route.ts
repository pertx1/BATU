import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, parseBody, withUser } from "@/lib/api";
import { confirmPassword } from "@/lib/auth/confirm";
import { SESSION_COOKIE } from "@/lib/auth/session";

const profileSchema = z.object({ name: z.string().trim().min(1, "Escribe tu nombre").max(60) });

/** Cambiar el nombre. */
export const PATCH = withUser(async (req, { userId }) => {
  const { name } = await parseBody(req, profileSchema);
  await db.user.update({ where: { id: userId }, data: { name } });
  return NextResponse.json({ ok: true });
});

const deleteSchema = z.object({
  password: z.string().min(1, "Escribe tu contraseña").max(200),
  confirm: z.string(),
});

/**
 * Elimina la cuenta y TODOS sus datos (borrado en cascada en la BD:
 * sesiones, suscripciones push, tareas, hábitos, eventos, objetivos…).
 */
export const DELETE = withUser(async (req, { userId }) => {
  const body = await parseBody(req, deleteSchema);
  if (body.confirm.trim().toUpperCase() !== "ELIMINAR") throw new HttpError(400, "Escribe ELIMINAR para confirmar");
  const user = await confirmPassword(req, userId, body.password);

  await db.$transaction([
    db.user.delete({ where: { id: userId } }),
    // Los intentos de login no cuelgan del usuario (se guardan por email).
    db.loginAttempt.deleteMany({
      where: { email: { in: [user.email, `reset:${user.email}`, `register:${user.email}`] } },
    }),
  ]);
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
});
