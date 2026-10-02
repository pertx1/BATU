import "server-only";
import { db } from "@/lib/db";
import { dateStrToDb, DEFAULT_TZ, localDateStr, localMinutes, todayStr } from "@/lib/dates";
import { pickMessage, renderMessage, type Tone } from "@/lib/antola/messages";
import { formatWater } from "@/lib/nutrition/meals";
import { nextWaterCheck, nextWeighInAt, shouldRemindWater } from "@/lib/nutrition/reminders";
import type { VapidConfig } from "@/lib/push";
import { deliver } from "@/lib/notifications/deliver";
import { splitAntola, type PushPayload } from "@/lib/notifications/messages";
import { inDndWindow, readiness } from "@/lib/notifications/timing";

const LIMIT = 500;

type Outgoing = { userId: string; kind: "WATER" | "WEIGH_IN"; key: string; scheduledFor: Date; payload: PushPayload };
type Move = { userId: string; prev: Date | null; next: Date | null };

export type NutritionTickReport = { agua: number; pesaje: number; enviados: number; fallidos: number };

/**
 * Recordatorios de Comida dentro del cron: beber agua (si vas por detrás de
 * lo esperado a esa hora, como mucho uno cada 2 horas, entre despertar y
 * dormir y respetando «no molestar») y pesarse por la mañana los días
 * elegidos. Idempotente como el resto: cada aviso tiene clave única.
 */
export async function runNutritionTick(now: Date, vapid: VapidConfig | null): Promise<NutritionTickReport> {
  const active = { disabledAt: null };
  const profiles = await db.nutritionProfile.findMany({
    where: {
      user: active,
      OR: [
        { waterReminders: true, OR: [{ nextWaterAt: null }, { nextWaterAt: { lte: now } }] },
        { weighInPerWeek: { gt: 0 }, OR: [{ nextWeighInAt: null }, { nextWeighInAt: { lte: now } }] },
      ],
    },
    select: {
      userId: true,
      waterMl: true,
      glassMl: true,
      wakeTime: true,
      sleepTime: true,
      waterReminders: true,
      weighInPerWeek: true,
      nextWaterAt: true,
      nextWeighInAt: true,
      user: {
        select: {
          name: true,
          settings: { select: { timezone: true, dndEnabled: true, dndStart: true, dndEnd: true, gamificationEnabled: true, antolaTone: true } },
        },
      },
    },
    take: LIMIT,
  });
  if (!profiles.length) return { agua: 0, pesaje: 0, enviados: 0, fallidos: 0 };

  const waterDue = profiles.filter((p) => p.waterReminders && p.nextWaterAt && p.nextWaterAt <= now);
  const weighDue = profiles.filter((p) => p.weighInPerWeek > 0 && p.nextWeighInAt && p.nextWeighInAt <= now);

  // Agua bebida hoy y pesajes de hoy (en bloque).
  const todayOf = (p: (typeof profiles)[number]) => todayStr(p.user.settings?.timezone ?? DEFAULT_TZ, now);
  const days = [...new Set([...waterDue, ...weighDue].map(todayOf))].map(dateStrToDb);
  const [water, weights] = await Promise.all([
    waterDue.length
      ? db.waterLog.groupBy({ by: ["userId", "day"], where: { userId: { in: waterDue.map((p) => p.userId) }, day: { in: days } }, _sum: { ml: true } })
      : [],
    weighDue.length ? db.weightLog.findMany({ where: { userId: { in: weighDue.map((p) => p.userId) }, day: { in: days } }, select: { userId: true, day: true } }) : [],
  ]);
  const waterBy = new Map(water.map((w) => [`${w.userId}|${w.day.toISOString().slice(0, 10)}`, w._sum.ml ?? 0]));
  const weighedBy = new Set(weights.map((w) => `${w.userId}|${w.day.toISOString().slice(0, 10)}`));

  const out: Outgoing[] = [];
  const waterMoves: Move[] = [];
  const weighMoves: Move[] = [];

  for (const p of profiles) {
    const s = p.user.settings ?? { timezone: DEFAULT_TZ, dndEnabled: false, dndStart: 1380, dndEnd: 450, gamificationEnabled: true, antolaTone: "LIVELY" as Tone };
    const tz = s.timezone;
    const today = todayStr(tz, now);
    const antola = s.gamificationEnabled;

    // ── Agua ──
    if (p.waterReminders && (!p.nextWaterAt || p.nextWaterAt <= now)) {
      let reminded = false;
      if (p.nextWaterAt) {
        const minutes = localMinutes(now, tz);
        const drunk = waterBy.get(`${p.userId}|${today}`) ?? 0;
        const dnd = s.dndEnabled && inDndWindow(minutes, s.dndStart, s.dndEnd);
        if (!dnd && shouldRemindWater({ minutes, wake: p.wakeTime, sleep: p.sleepTime, drunk, target: p.waterMl, glass: p.glassMl })) {
          reminded = true;
          const vars = { agua: formatWater(drunk), objetivo: formatWater(p.waterMl), nombre: p.user.name };
          const payload: PushPayload = antola
            ? { ...splitAntola(renderMessage(pickMessage("noti_agua", s.antolaTone, []).text, vars)), url: "/comida?anadir=agua", tag: "water" }
            : { title: "💧 Hora de beber agua", body: `Llevas ${vars.agua} de ${vars.objetivo}.`, url: "/comida?anadir=agua", tag: "water" };
          out.push({ userId: p.userId, kind: "WATER", key: `water:${today}:${minutes}`, scheduledFor: now, payload });
        }
      }
      waterMoves.push({ userId: p.userId, prev: p.nextWaterAt, next: nextWaterCheck({ reminded, wake: p.wakeTime, sleep: p.sleepTime, tz, now }) });
    }

    // ── Pesaje ──
    if (p.weighInPerWeek > 0 && (!p.nextWeighInAt || p.nextWeighInAt <= now)) {
      const prev = p.nextWeighInAt;
      if (prev) {
        const r = readiness(prev, s, now);
        if (r === "wait") continue; // «no molestar»: se envía cuando termine
        const day = localDateStr(prev, tz);
        if (r === "send" && !weighedBy.has(`${p.userId}|${today}`)) {
          const payload: PushPayload = antola
            ? { ...splitAntola(renderMessage(pickMessage("noti_pesaje", s.antolaTone, []).text, { nombre: p.user.name })), url: "/comida/peso", tag: "weighin" }
            : { title: "⚖️ Hoy toca pesarte", body: "Mejor por la mañana, después de ir al baño y antes de desayunar.", url: "/comida/peso", tag: "weighin" };
          out.push({ userId: p.userId, kind: "WEIGH_IN", key: `weighin:${day}`, scheduledFor: prev, payload });
        }
      }
      weighMoves.push({ userId: p.userId, prev, next: nextWeighInAt(p.weighInPerWeek, p.wakeTime, tz, now) });
    }
  }

  // Sin claves VAPID no se consume nada (solo se programa la primera vez).
  const claimed =
    out.length && vapid
      ? await db.notificationLog.createManyAndReturn({
          data: out.map((o) => ({ userId: o.userId, kind: o.kind, key: o.key, scheduledFor: o.scheduledFor })),
          skipDuplicates: true,
          select: { id: true, userId: true, key: true },
        })
      : [];
  const byKey = new Map(out.map((o) => [`${o.userId}|${o.key}`, o.payload]));
  const [delivery] = await Promise.all([
    vapid ? deliver(claimed.map((l) => ({ logId: l.id, userId: l.userId, payload: byKey.get(`${l.userId}|${l.key}`)! })), vapid) : null,
    move("nextWaterAt", vapid ? waterMoves : waterMoves.filter((m) => m.prev === null)),
    move("nextWeighInAt", vapid ? weighMoves : weighMoves.filter((m) => m.prev === null)),
  ]);
  return {
    agua: out.filter((o) => o.kind === "WATER").length,
    pesaje: out.filter((o) => o.kind === "WEIGH_IN").length,
    enviados: delivery?.counts.SENT ?? 0,
    fallidos: delivery?.counts.FAILED ?? 0,
  };
}

/** Programa la siguiente comprobación sin pisar un cambio hecho mientras tanto (p. ej. en los ajustes). */
async function move(col: "nextWaterAt" | "nextWeighInAt", rows: Move[]) {
  if (!rows.length) return;
  await db.$executeRawUnsafe(
    `UPDATE "NutritionProfile" p SET "${col}" = (v.next::timestamptz AT TIME ZONE 'UTC')
     FROM unnest($1::text[], $2::text[], $3::text[]) AS v(uid, prev, next)
     WHERE p."userId" = v.uid AND p."${col}" IS NOT DISTINCT FROM (v.prev::timestamptz AT TIME ZONE 'UTC')`,
    rows.map((r) => r.userId),
    rows.map((r) => r.prev?.toISOString() ?? null),
    rows.map((r) => r.next?.toISOString() ?? null),
  );
}
