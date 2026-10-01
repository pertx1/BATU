import "server-only";
import { db } from "@/lib/db";
import { inBatches, sendPush, type VapidConfig } from "@/lib/push";
import type { PushPayload } from "@/lib/notifications/messages";

export type Outgoing = { logId: string; userId: string; payload: PushPayload };
export type DeliveryStatus = "SENT" | "FAILED" | "SKIPPED";

const BATCH_SIZE = 50;

/**
 * Envía cada aviso a todos los dispositivos de su usuario (en lotes, con
 * Promise.allSettled), borra las suscripciones caducadas (404/410) y deja el
 * resultado en NotificationLog.
 */
export async function deliver(items: Outgoing[], vapid: VapidConfig) {
  const counts = { SENT: 0, FAILED: 0, SKIPPED: 0 } satisfies Record<DeliveryStatus, number>;
  if (!items.length) return { counts, devices: 0 };

  const userIds = [...new Set(items.map((i) => i.userId))];
  const subs = await db.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true },
  });
  const subsByUser = Map.groupBy(subs, (s) => s.userId);

  const jobs = items.flatMap((item) => (subsByUser.get(item.userId) ?? []).map((sub) => ({ item, sub })));
  const results = await inBatches(jobs, BATCH_SIZE, ({ item, sub }) => sendPush(sub, item.payload, vapid));

  const ok = new Set<string>(); // logIds con al menos un envío correcto
  const errors = new Map<string, string>();
  const gone = new Set<string>();
  const alive = new Set<string>();
  results.forEach((r, i) => {
    const { item, sub } = jobs[i];
    if (r.status === "fulfilled" && r.value.ok) {
      ok.add(item.logId);
      alive.add(sub.id);
    } else {
      const res = r.status === "fulfilled" ? r.value : { ok: false as const, gone: false, error: String(r.reason) };
      if (!res.ok && res.gone) gone.add(sub.id);
      if (!res.ok && !errors.has(item.logId)) errors.set(item.logId, res.error);
    }
  });

  const byStatus: Record<DeliveryStatus, string[]> = { SENT: [], FAILED: [], SKIPPED: [] };
  for (const item of items) {
    const status: DeliveryStatus = ok.has(item.logId)
      ? "SENT"
      : subsByUser.has(item.userId)
        ? "FAILED"
        : "SKIPPED";
    byStatus[status].push(item.logId);
    counts[status]++;
  }

  const now = new Date();
  await Promise.allSettled([
    byStatus.SENT.length
      ? db.notificationLog.updateMany({ where: { id: { in: byStatus.SENT } }, data: { status: "SENT", sentAt: now } })
      : null,
    byStatus.SKIPPED.length
      ? db.notificationLog.updateMany({
          where: { id: { in: byStatus.SKIPPED } },
          data: { status: "SKIPPED", error: "Sin dispositivos con notificaciones activadas" },
        })
      : null,
    // Los fallos son raros: una actualización por aviso para guardar su error.
    ...byStatus.FAILED.map((id) =>
      db.notificationLog.update({ where: { id }, data: { status: "FAILED", error: errors.get(id) ?? "Error" } }),
    ),
    gone.size ? db.pushSubscription.deleteMany({ where: { id: { in: [...gone] } } }) : null,
    alive.size ? db.pushSubscription.updateMany({ where: { id: { in: [...alive] } }, data: { lastSuccessAt: now } }) : null,
  ]);

  return { counts, devices: subs.length, removedDevices: gone.size };
}
