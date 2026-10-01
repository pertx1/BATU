import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, parseBody, withPublic } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { checkLoginAllowed, clientIp, recordLoginAttempt } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { emailSchema } from "@/lib/validation";

const schema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contraseña").max(200),
});

export const POST = withPublic(async (req) => {
  const { email, password } = await parseBody(req, schema);
  const ip = clientIp(req.headers);

  const gate = await checkLoginAllowed(email, ip);
  if (!gate.allowed) {
    throw new HttpError(
      429,
      `Demasiados intentos. Vuelve a probar en ${gate.retryAfterMinutes} min.`,
    );
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, disabledAt: true, onboardedAt: true },
  });
  const ok = await verifyPassword(password, user?.passwordHash ?? null);

  if (!user || !ok) {
    await recordLoginAttempt(email, ip, false);
    throw new HttpError(401, "Email o contraseña incorrectos");
  }
  if (user.disabledAt) {
    throw new HttpError(403, "Esta cuenta está desactivada");
  }

  await recordLoginAttempt(email, ip, true);
  await db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  await createSession(user.id, req.headers.get("user-agent"));
  return NextResponse.json({ ok: true, redirect: user.onboardedAt ? "/" : "/bienvenida" });
});
