import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, notFound, parseBody, withUser } from "@/lib/api";
import { assertAdmin } from "@/lib/auth/admin";

const schema = z.object({ disabled: z.boolean() });

/** Desactivar o reactivar una cuenta (solo ADMIN_EMAIL). */
export const POST = withUser<{ id: string }>(async (req, { user, userId }, { id }) => {
  assertAdmin(user);
  const { disabled } = await parseBody(req, schema);
  if (id === userId) throw new HttpError(400, "No puedes desactivar tu propia cuenta");
  const target = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) throw notFound();

  await db.$transaction([
    db.user.update({ where: { id }, data: { disabledAt: disabled ? new Date() : null } }),
    // Al desactivar: fuera de todas sus sesiones (y sus suscripciones push, en cascada).
    ...(disabled
      ? [db.session.deleteMany({ where: { userId: id } }), db.passwordResetToken.deleteMany({ where: { userId: id } })]
      : []),
  ]);
  return NextResponse.json({ ok: true });
});
