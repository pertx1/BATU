import { after, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, withPublic } from "@/lib/api";
import { clientIp } from "@/lib/auth/rate-limit";
import { createResetToken, resetRequestAllowed } from "@/lib/auth/reset";
import { passwordResetEmail, sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { emailSchema } from "@/lib/validation";

const schema = z.object({ email: emailSchema });

/**
 * Pide un enlace para restablecer la contraseña. Siempre responde lo mismo
 * (exista o no la cuenta) y el email se envía después de responder, para que
 * ni el mensaje ni el tiempo de respuesta revelen qué emails están registrados.
 */
export const POST = withPublic(async (req) => {
  const { email } = await parseBody(req, schema);
  const ip = clientIp(req.headers);

  after(async () => {
    try {
      if (!(await resetRequestAllowed(email, ip))) return;
      const user = await db.user.findUnique({ where: { email }, select: { id: true, disabledAt: true } });
      if (!user || user.disabledAt) return;
      const token = await createResetToken(user.id);
      const mail = passwordResetEmail(`${appUrl()}/restablecer?token=${token}`);
      await sendEmail(email, mail.subject, mail.text, mail.html);
    } catch (err) {
      console.error("[antola] recuperar contraseña:", (err as Error).message);
    }
  });

  return NextResponse.json({
    ok: true,
    message: "Si hay una cuenta con ese email, te hemos enviado un enlace. Revisa también la carpeta de spam.",
  });
});
