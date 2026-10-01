import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, withUser } from "@/lib/api";
import { vapidConfig } from "@/lib/push";
import { deliver } from "@/lib/notifications/deliver";
import { testMessage } from "@/lib/notifications/messages";

/** "Enviar notificación de prueba" (Ajustes): a todos los dispositivos del usuario. */
export const POST = withUser(async (_req, { userId }) => {
  const vapid = vapidConfig();
  if (!vapid) {
    throw new HttpError(503, "El servidor no tiene configuradas las claves VAPID (mira el README).");
  }

  // Máximo una prueba cada 10 segundos.
  const recent = await db.notificationLog.findFirst({
    where: { userId, kind: "TEST", createdAt: { gt: new Date(Date.now() - 10_000) } },
    select: { id: true },
  });
  if (recent) throw new HttpError(429, "Espera unos segundos antes de enviar otra prueba.");

  const now = new Date();
  const log = await db.notificationLog.create({
    data: { userId, kind: "TEST", key: `test:${now.getTime()}`, scheduledFor: now },
    select: { id: true },
  });
  const { counts, devices } = await deliver([{ logId: log.id, userId, payload: testMessage() }], vapid);

  if (!devices) throw new HttpError(409, "Ningún dispositivo tiene las notificaciones activadas.");
  if (!counts.SENT) throw new HttpError(502, "No se pudo entregar la notificación. Vuelve a activarlas en este dispositivo.");
  return NextResponse.json({ ok: true, devices });
});
