import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, parseBody, withPublic } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { allowSignup } from "@/lib/env";
import { emailSchema, isValidTimeZone, passwordSchema } from "@/lib/validation";

const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
  acceptPrivacy: z.literal(true, { error: "Debes aceptar la política de privacidad" }),
  timezone: z.string().max(64).optional(),
});

export const POST = withPublic(async (req) => {
  const body = await parseBody(req, schema);

  if (!allowSignup()) {
    throw new HttpError(403, "El registro está cerrado");
  }

  const existing = await db.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (existing) throw new HttpError(409, "Ya existe una cuenta con ese email");

  const timezone = body.timezone && isValidTimeZone(body.timezone) ? body.timezone : "Europe/Madrid";
  const user = await db.user.create({
    data: {
      email: body.email,
      passwordHash: await hashPassword(body.password),
      lastActiveAt: new Date(),
      settings: { create: { timezone } },
    },
    select: { id: true },
  });

  await createSession(user.id, req.headers.get("user-agent"));
  return NextResponse.json({ ok: true, redirect: "/bienvenida" }, { status: 201 });
});
