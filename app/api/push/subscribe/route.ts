import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
import { isAllowedPushEndpoint } from "@/lib/push";

const subscriptionSchema = z.object({
  endpoint: z.string().max(1000).refine(isAllowedPushEndpoint, "Servicio de notificaciones no admitido"),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

/**
 * Guarda la suscripción push de ESTE dispositivo, ligada al usuario y a la
 * sesión actuales (al cerrar sesión se borra en cascada). Si el dispositivo
 * estaba suscrito con otra cuenta, pasa a esta.
 */
export const POST = withUser(async (req, { userId, sessionId }) => {
  const body = await parseBody(req, subscriptionSchema);
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  const data = { userId, sessionId, p256dh: body.keys.p256dh, auth: body.keys.auth, userAgent };
  await db.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: { endpoint: body.endpoint, ...data },
    update: data,
  });
  const devices = await db.pushSubscription.count({ where: { userId } });
  return NextResponse.json({ ok: true, devices });
});

const deleteSchema = z.object({ endpoint: z.string().max(1000) });

/** Da de baja este dispositivo (solo si la suscripción es del usuario). */
export const DELETE = withUser(async (req, { userId }) => {
  const body = await parseBody(req, deleteSchema);
  await db.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId } });
  return NextResponse.json({ ok: true });
});
