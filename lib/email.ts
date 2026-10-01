import "server-only";
import { Resend } from "resend";

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim() && !!process.env.EMAIL_FROM?.trim();
}

/** Envía un email con Resend. Devuelve false si falla o no está configurado. */
export async function sendEmail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  if (!emailConfigured()) {
    console.warn(`[antola] Email sin enviar (faltan RESEND_API_KEY o EMAIL_FROM): «${subject}» → ${to}`);
    if (process.env.NODE_ENV !== "production") console.info(`[antola] Contenido:\n${text}`);
    return false;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!.trim());
    const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM!.trim(), to, subject, text, html });
    if (error) {
      console.error("[antola] Resend:", error.name, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[antola] Resend:", (err as Error).message);
    return false;
  }
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function passwordResetEmail(link: string) {
  const text = [
    "Hola:",
    "",
    "Alguien (esperamos que tú) ha pedido restablecer la contraseña de tu cuenta de Antola.",
    "Abre este enlace para elegir una nueva. Caduca en 1 hora y solo se puede usar una vez:",
    "",
    link,
    "",
    "Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambiará.",
  ].join("\n");
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f6f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#16161d">
<div style="max-width:480px;margin:0 auto;padding:32px 24px">
<p style="font-size:22px;font-weight:700;margin:0 0 16px">Antola</p>
<p style="font-size:16px;line-height:1.5">Alguien (esperamos que tú) ha pedido restablecer la contraseña de tu cuenta.</p>
<p style="margin:28px 0"><a href="${escape(link)}" style="background:#5b4cf0;color:#fff;text-decoration:none;font-weight:600;padding:14px 22px;border-radius:12px;display:inline-block">Elegir nueva contraseña</a></p>
<p style="font-size:14px;line-height:1.5;color:#6b6b7b">El enlace caduca en 1 hora y solo se puede usar una vez. Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambiará.</p>
<p style="font-size:12px;color:#6b6b7b;word-break:break-all">${escape(link)}</p>
</div></body></html>`;
  return { subject: "Restablece tu contraseña de Antola", text, html };
}
