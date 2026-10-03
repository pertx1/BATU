import "server-only";
import type { NotificationKind, Priority } from "@prisma/client";
import { db } from "@/lib/db";
import { dateStrToDb, dbToDateStr, DEFAULT_TZ, localDateStr, todayStr, type DateStr } from "@/lib/dates";
import { rollAllRecurringTasks } from "@/lib/data/tasks";
import { closeAllDays, ensureAllWeekChallenges, todayState, visibleStreak } from "@/lib/gamification";
import type { Tone } from "@/lib/antola/messages";
import { isScheduledOn } from "@/lib/habits";
import { nextHabitReminderAt } from "@/lib/schedule";
import { vapidConfig } from "@/lib/push";
import { deliver } from "@/lib/notifications/deliver";
import { runNutritionTick, type NutritionTickReport } from "@/lib/notifications/nutrition-tick";
import { syncAllProfity } from "@/lib/integrations/profity";
import {
  antolaEvening,
  antolaMissYou,
  antolaMorning,
  antolaOverdue,
  antolaStreak,
  antolaWeekly,
  type AntolaVoice,
  eventMessage,
  eveningMessage,
  habitMessage,
  morningMessage,
  overdueMessage,
  taskMessage,
  weeklyMessage,
  type PushPayload,
} from "@/lib/notifications/messages";
import { NEXT_FIELD, nextPeriodicAt, PERIODIC_KINDS, readiness, type PeriodicKind } from "@/lib/notifications/timing";

/** Máximo de elementos de cada tipo por llamada; lo que sobre sale en la siguiente. */
const LIMIT = 500;
const LOG_RETENTION_DAYS = 30;

const settingsSelect = {
  userId: true,
  timezone: true,
  morningTime: true,
  eveningTime: true,
  overdueTime: true,
  weeklyReviewTime: true,
  dndEnabled: true,
  dndStart: true,
  dndEnd: true,
  notifyTasks: true,
  notifyEvents: true,
  notifyHabits: true,
  notifyMorning: true,
  notifyEvening: true,
  notifyOverdue: true,
  notifyWeekly: true,
  nextMorningAt: true,
  nextEveningAt: true,
  nextOverdueAt: true,
  nextWeeklyAt: true,
  nextStreakAt: true,
  nextMissYouAt: true,
  notifyStreakRisk: true,
  notifyMissYou: true,
  gamificationEnabled: true,
  antolaTone: true,
  user: { select: { name: true } },
} as const;

type UserSettings = {
  userId: string;
  timezone: string;
  morningTime: number;
  eveningTime: number;
  overdueTime: number;
  weeklyReviewTime: number;
  dndEnabled: boolean;
  dndStart: number;
  dndEnd: number;
  notifyTasks: boolean;
  notifyEvents: boolean;
  notifyHabits: boolean;
  notifyMorning: boolean;
  notifyEvening: boolean;
  notifyOverdue: boolean;
  notifyWeekly: boolean;
  nextMorningAt: Date | null;
  nextEveningAt: Date | null;
  nextOverdueAt: Date | null;
  nextWeeklyAt: Date | null;
  nextStreakAt: Date | null;
  nextMissYouAt: Date | null;
  notifyStreakRisk: boolean;
  notifyMissYou: boolean;
  gamificationEnabled: boolean;
  antolaTone: Tone;
  user: { name: string | null };
};

/** Por si a alguien le falta la fila de ajustes: los mismos valores por defecto que el esquema. */
function defaultSettings(userId: string): UserSettings {
  return {
    userId,
    timezone: DEFAULT_TZ,
    morningTime: 480,
    eveningTime: 1290,
    overdueTime: 540,
    weeklyReviewTime: 1080,
    dndEnabled: false,
    dndStart: 1380,
    dndEnd: 450,
    notifyTasks: true,
    notifyEvents: true,
    notifyHabits: true,
    notifyMorning: true,
    notifyEvening: true,
    notifyOverdue: true,
    notifyWeekly: true,
    nextMorningAt: null,
    nextEveningAt: null,
    nextOverdueAt: null,
    nextWeeklyAt: null,
    nextStreakAt: null,
    nextMissYouAt: null,
    notifyStreakRisk: true,
    notifyMissYou: true,
    gamificationEnabled: true,
    antolaTone: "LIVELY",
    user: { name: null },
  };
}

const PERIODIC_TOGGLE = {
  morning: "notifyMorning",
  evening: "notifyEvening",
  overdue: "notifyOverdue",
  weekly: "notifyWeekly",
  streak: "notifyStreakRisk",
  missyou: "notifyMissYou",
} as const satisfies Record<PeriodicKind, keyof UserSettings>;

/** Avisos que solo existen con la gamificación activa. */
const ANTOLA_ONLY: PeriodicKind[] = ["streak", "missyou"];

const PERIODIC_NOTIFICATION_KIND = {
  morning: "MORNING",
  evening: "EVENING",
  overdue: "OVERDUE",
  weekly: "WEEKLY",
  streak: "STREAK_RISK",
  missyou: "MISS_YOU",
} as const satisfies Record<PeriodicKind, NotificationKind>;

/** Aviso decidido pero aún sin texto (los resúmenes necesitan datos del día). */
type Candidate = {
  userId: string;
  kind: NotificationKind;
  key: string;
  scheduledFor: Date;
  build: (ctx: UserDay) => PushPayload | null; // null = no hace falta avisar
};

type UserDay = {
  today: DateStr;
  todayTasks: { title: string; priority: Priority }[];
  overdueCount: number;
  habitsToday: number;
  habitsPendingToday: number;
  eventsToday: number;
  /** Con la gamificación activa: la voz de Antola y los datos de racha/inactividad. */
  antola: (AntolaVoice & { streak: number; productive: boolean; missYou: boolean }) | null;
};

export type TickReport = {
  ok: true;
  ms: number;
  clavesVapid: boolean;
  pendientes: { tareas: number; eventos: number; habitos: number; ajustes: number };
  avisos: number;
  enviados: number;
  fallidos: number;
  sinDispositivo: number;
  duplicados: number;
  esperandoNoMolestar: number;
  descartados: number;
  dispositivosBorrados: number;
  comida: NutritionTickReport | { error: string };
};

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/**
 * Una pasada del programador de avisos. Idempotente: cada aviso tiene una clave
 * única por usuario en NotificationLog, así que llamarlo dos veces a la vez o
 * repetir un minuto no duplica nada.
 */
export async function runTick(now: Date = new Date()): Promise<TickReport> {
  const started = Date.now();
  const vapid = vapidConfig();
  const active = { disabledAt: null };

  // 1. Todo lo que vence ya, de todos los usuarios activos (consultas en bloque).
  const [tasks, events, habits, periodic] = await Promise.all([
    db.task.findMany({
      where: { remindAt: { lte: now }, completedAt: null, user: active },
      select: { id: true, userId: true, title: true, dueDate: true, dueAt: true, remindAt: true },
      orderBy: { remindAt: "asc" },
      take: LIMIT,
    }),
    db.event.findMany({
      where: { remindAt: { lte: now }, user: active },
      select: {
        id: true,
        userId: true,
        title: true,
        allDay: true,
        startDate: true,
        startAt: true,
        location: true,
        remindAt: true,
      },
      orderBy: { remindAt: "asc" },
      take: LIMIT,
    }),
    db.habit.findMany({
      where: { nextReminderAt: { lte: now }, archivedAt: null, user: active },
      select: { id: true, userId: true, name: true, emoji: true, daysOfWeek: true, reminderTime: true, nextReminderAt: true },
      orderBy: { nextReminderAt: "asc" },
      take: LIMIT,
    }),
    db.settings.findMany({
      where: {
        user: active,
        OR: [
          { nextMorningAt: { lte: now } },
          { nextEveningAt: { lte: now } },
          { nextOverdueAt: { lte: now } },
          { nextWeeklyAt: { lte: now } },
          { nextStreakAt: { lte: now } },
          { nextMissYouAt: { lte: now } },
          { nextMorningAt: null },
          { nextEveningAt: null },
          { nextOverdueAt: null },
          { nextWeeklyAt: null },
          { nextStreakAt: null },
          { nextMissYouAt: null },
        ],
      },
      select: settingsSelect,
      take: LIMIT,
    }),
  ]);

  // 2. Ajustes (zona horaria, no molestar, interruptores) de los demás usuarios implicados.
  const settings = new Map<string, UserSettings>(periodic.map((s) => [s.userId, s]));
  const missing = [
    ...new Set([...tasks, ...events, ...habits].map((x) => x.userId).filter((id) => !settings.has(id))),
  ];
  if (missing.length) {
    for (const s of await db.settings.findMany({ where: { userId: { in: missing } }, select: settingsSelect })) {
      settings.set(s.userId, s);
    }
  }
  const settingsOf = (userId: string) => settings.get(userId) ?? defaultSettings(userId);

  // 3. Decidir qué se envía, qué espera a que acabe "no molestar" y qué se descarta.
  const candidates: Candidate[] = [];
  const consumedTasks: { id: string; remindAt: Date }[] = [];
  const consumedEvents: { id: string; remindAt: Date }[] = [];
  const habitMoves: { id: string; prev: Date; next: Date | null }[] = [];
  const periodicMoves: Record<PeriodicKind, { userId: string; prev: Date | null; next: Date }[]> = {
    morning: [],
    evening: [],
    overdue: [],
    weekly: [],
    streak: [],
    missyou: [],
  };
  const habitChecks: { habitId: string; date: DateStr }[] = [];
  let waiting = 0;
  let stale = 0;

  for (const t of tasks) {
    const s = settingsOf(t.userId);
    const r = readiness(t.remindAt!, s, now);
    if (r === "wait") {
      waiting++;
      continue;
    }
    consumedTasks.push({ id: t.id, remindAt: t.remindAt! });
    if (r === "stale") stale++;
    else if (s.notifyTasks) {
      candidates.push({
        userId: t.userId,
        kind: "TASK",
        key: `task:${t.id}:${t.remindAt!.toISOString()}`,
        scheduledFor: t.remindAt!,
        build: (day) =>
          taskMessage({ ...t, dueDate: t.dueDate ? dbToDateStr(t.dueDate) : null }, s.timezone, day.today),
      });
    }
  }

  for (const e of events) {
    const s = settingsOf(e.userId);
    const r = readiness(e.remindAt!, s, now);
    if (r === "wait") {
      waiting++;
      continue;
    }
    consumedEvents.push({ id: e.id, remindAt: e.remindAt! });
    if (r === "stale") stale++;
    else if (s.notifyEvents) {
      candidates.push({
        userId: e.userId,
        kind: "EVENT",
        key: `event:${e.id}:${e.remindAt!.toISOString()}`,
        scheduledFor: e.remindAt!,
        build: (day) => eventMessage({ ...e, startDate: dbToDateStr(e.startDate) }, s.timezone, day.today),
      });
    }
  }

  const habitDoneKey = (habitId: string, date: DateStr) => `${habitId}|${date}`;
  const habitsDone = new Set<string>(); // se rellena en el paso 4
  for (const h of habits) {
    const s = settingsOf(h.userId);
    const r = readiness(h.nextReminderAt!, s, now);
    if (r === "wait") {
      waiting++;
      continue;
    }
    habitMoves.push({
      id: h.id,
      prev: h.nextReminderAt!,
      next: nextHabitReminderAt(h.daysOfWeek, h.reminderTime, s.timezone, todayStr(s.timezone, now), now),
    });
    if (r === "stale") stale++;
    else if (s.notifyHabits) {
      const date = localDateStr(h.nextReminderAt!, s.timezone);
      habitChecks.push({ habitId: h.id, date });
      candidates.push({
        userId: h.userId,
        kind: "HABIT",
        key: `habit:${h.id}:${date}`,
        scheduledFor: h.nextReminderAt!,
        // Solo si aún no está hecho ese día.
        build: () => (habitsDone.has(habitDoneKey(h.id, date)) ? null : habitMessage(h)),
      });
    }
  }

  for (const s of periodic) {
    for (const kind of PERIODIC_KINDS) {
      const prev = s[NEXT_FIELD[kind]];
      if (!prev) {
        // Primera vez (usuario nuevo o anterior a esta función): solo se programa.
        periodicMoves[kind].push({ userId: s.userId, prev: null, next: nextPeriodicAt(kind, s, now) });
        continue;
      }
      if (prev.getTime() > now.getTime()) continue;
      const r = readiness(prev, s, now);
      if (r === "wait") {
        waiting++;
        continue;
      }
      periodicMoves[kind].push({ userId: s.userId, prev, next: nextPeriodicAt(kind, s, now) });
      if (r === "stale") {
        stale++;
        continue;
      }
      if (!s[PERIODIC_TOGGLE[kind]]) continue;
      if (ANTOLA_ONLY.includes(kind) && !s.gamificationEnabled) continue;
      candidates.push({
        userId: s.userId,
        kind: PERIODIC_NOTIFICATION_KIND[kind],
        key: `${kind}:${localDateStr(prev, s.timezone)}`,
        scheduledFor: prev,
        build: (day) => {
          // Con la gamificación activa, los resúmenes los escribe Antola.
          const voice = day.antola;
          switch (kind) {
            case "morning": {
              const top = [...day.todayTasks].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])[0];
              const counts = { tasks: day.todayTasks.length, habits: day.habitsToday, events: day.eventsToday };
              return voice ? antolaMorning(voice, counts, top?.title ?? null) : morningMessage(s.user.name, counts, top?.title ?? null);
            }
            case "evening": {
              const pending = day.todayTasks.length + day.habitsPendingToday;
              if (pending <= 0) return null;
              return voice ? antolaEvening(voice, pending) : eveningMessage(pending);
            }
            case "overdue":
              if (day.overdueCount <= 0) return null;
              return voice ? antolaOverdue(voice, day.overdueCount) : overdueMessage(day.overdueCount);
            case "weekly":
              return voice ? antolaWeekly(voice) : weeklyMessage();
            case "streak":
              // Solo si la racha es de 3 días o más y hoy aún no es productivo.
              return voice && voice.streak >= 3 && !voice.productive ? antolaStreak(voice, voice.streak) : null;
            case "missyou":
              return voice?.missYou ? antolaMissYou(voice) : null;
          }
        },
      });
    }
  }

  // 4. Datos del día de los usuarios que van a recibir algo (resúmenes, hábitos y badge).
  const userIds = [...new Set(candidates.map((c) => c.userId))];
  const todayOf = new Map(userIds.map((id) => [id, todayStr(settingsOf(id).timezone, now)]));
  const days = new Map<string, UserDay>(
    userIds.map((id) => [
      id,
      { today: todayOf.get(id)!, todayTasks: [], overdueCount: 0, habitsToday: 0, habitsPendingToday: 0, eventsToday: 0, antola: null },
    ]),
  );

  if (userIds.length) {
    const todays = [...new Set(todayOf.values())].sort();
    const minToday = todays[0];
    const maxToday = todays[todays.length - 1];
    const summaryUsers = [
      ...new Set(candidates.filter((c) => c.kind === "MORNING" || c.kind === "EVENING").map((c) => c.userId)),
    ];

    const [pendingTasks, summaryHabits, summaryEvents] = await Promise.all([
      db.task.findMany({
        where: { userId: { in: userIds }, completedAt: null, dueDate: { lte: dateStrToDb(maxToday) } },
        select: { userId: true, title: true, priority: true, dueDate: true },
      }),
      summaryUsers.length
        ? db.habit.findMany({
            where: { userId: { in: summaryUsers }, archivedAt: null },
            select: { id: true, userId: true, daysOfWeek: true },
          })
        : [],
      summaryUsers.length
        ? db.event.findMany({
            where: {
              userId: { in: summaryUsers },
              startDate: { lte: dateStrToDb(maxToday) },
              endDate: { gte: dateStrToDb(minToday) },
            },
            select: { userId: true, startDate: true, endDate: true },
          })
        : [],
    ]);

    const scheduledToday = summaryHabits.filter((h) => isScheduledOn(h.daysOfWeek, todayOf.get(h.userId)!));
    for (const h of scheduledToday) habitChecks.push({ habitId: h.id, date: todayOf.get(h.userId)! });
    if (habitChecks.length) {
      const logs = await db.habitLog.findMany({
        where: {
          habitId: { in: [...new Set(habitChecks.map((c) => c.habitId))] },
          date: { in: [...new Set(habitChecks.map((c) => c.date))].map(dateStrToDb) },
        },
        select: { habitId: true, date: true },
      });
      for (const l of logs) habitsDone.add(habitDoneKey(l.habitId, dbToDateStr(l.date)));
    }

    for (const t of pendingTasks) {
      const day = days.get(t.userId)!;
      const due = dbToDateStr(t.dueDate!);
      if (due === day.today) day.todayTasks.push(t);
      else if (due < day.today) day.overdueCount++;
    }
    for (const h of scheduledToday) {
      const day = days.get(h.userId)!;
      day.habitsToday++;
      if (!habitsDone.has(habitDoneKey(h.id, day.today))) day.habitsPendingToday++;
    }
    for (const e of summaryEvents) {
      const day = days.get(e.userId)!;
      if (dbToDateStr(e.startDate) <= day.today && dbToDateStr(e.endDate) >= day.today) day.eventsToday++;
    }
  }

  // 4b. Antola: voz (tono, nombre, frases recientes) y datos de racha e inactividad.
  const voiceUsers = [
    ...new Set(
      candidates
        .filter((c) => ["MORNING", "EVENING", "OVERDUE", "WEEKLY", "STREAK_RISK", "MISS_YOU"].includes(c.kind))
        .map((c) => c.userId)
        .filter((id) => settingsOf(id).gamificationEnabled),
    ),
  ];
  if (voiceUsers.length) {
    const needStats = new Set(candidates.filter((c) => c.kind === "STREAK_RISK" || c.kind === "MISS_YOU").map((c) => c.userId));
    const [recentLogs, stats, users] = await Promise.all([
      db.antolaMessageLog.findMany({
        where: { userId: { in: voiceUsers }, shownAt: { gte: new Date(now.getTime() - 14 * 86400000) } },
        orderBy: { shownAt: "desc" },
        select: { userId: true, messageId: true },
        take: voiceUsers.length * 30,
      }),
      db.userStats.findMany({
        where: { userId: { in: [...needStats] } },
        select: { userId: true, currentStreak: true, lastMissYouAt: true },
      }),
      db.user.findMany({ where: { id: { in: [...needStats] } }, select: { id: true, lastActiveAt: true } }),
    ]);
    const recentBy = Map.groupBy(recentLogs, (l) => l.userId);
    const statsBy = new Map(stats.map((s) => [s.userId, s]));
    const activeBy = new Map(users.map((u) => [u.id, u.lastActiveAt]));
    await Promise.all(
      voiceUsers.map(async (id) => {
        const s = settingsOf(id);
        let streak = 0;
        let productive = false;
        let missYou = false;
        const st = statsBy.get(id);
        if (needStats.has(id) && st) {
          const state = await todayState(db, id, s.timezone, now);
          streak = visibleStreak(st, state);
          productive = state.productive;
          const lastActive = activeBy.get(id);
          missYou =
            !!lastActive &&
            now.getTime() - lastActive.getTime() >= 2 * 86400000 &&
            (!st.lastMissYouAt || now.getTime() - st.lastMissYouAt.getTime() >= 3 * 86400000);
        }
        days.get(id)!.antola = {
          tone: s.antolaTone,
          name: s.user.name,
          recent: (recentBy.get(id) ?? []).slice(0, 10).map((l) => l.messageId),
          used: [],
          streak,
          productive,
          missYou,
        };
      }),
    );
  }

  // 5. Texto final de cada aviso; los que ya no hacen falta se descartan.
  const ready = candidates.flatMap((c) => {
    const day = days.get(c.userId)!;
    const payload = c.build(day);
    if (!payload) return [];
    return [{ ...c, payload: { ...payload, badgeCount: day.todayTasks.length + day.overdueCount } }];
  });

  // 6. Reservar cada aviso en NotificationLog. La clave única (userId, key) hace
  //    que un aviso ya reservado por otra llamada no se devuelva aquí.
  const claimed =
    ready.length && vapid
      ? await db.notificationLog.createManyAndReturn({
          data: ready.map((c) => ({ userId: c.userId, kind: c.kind, key: c.key, scheduledFor: c.scheduledFor })),
          skipDuplicates: true,
          select: { id: true, userId: true, key: true },
        })
      : [];
  const payloadOf = new Map(ready.map((c) => [`${c.userId}|${c.key}`, c.payload]));

  // Frases de Antola usadas (para no repetirlas) y "te echo de menos" enviado.
  if (claimed.length) {
    const claimedUsers = new Set(claimed.map((l) => l.userId));
    const used = [...days.entries()].flatMap(([userId, d]) =>
      claimedUsers.has(userId) ? (d.antola?.used ?? []).map((u) => ({ userId, messageId: u.id, situation: u.situation, text: u.text })) : [],
    );
    const missYouSent = claimed.filter((l) => l.key.startsWith("missyou:")).map((l) => l.userId);
    await Promise.all([
      used.length ? db.antolaMessageLog.createMany({ data: used }) : null,
      missYouSent.length ? db.userStats.updateMany({ where: { userId: { in: missYouSent } }, data: { lastMissYouAt: now } }) : null,
    ]);
  }

  // 7. Enviar y, a la vez, mover los próximos disparos.
  const [delivery, , , comida] = await Promise.all([
    vapid
      ? deliver(
          claimed.map((l) => ({ logId: l.id, userId: l.userId, payload: payloadOf.get(`${l.userId}|${l.key}`)! })),
          vapid,
        )
      : null,
    advance(consumedTasks, consumedEvents, habitMoves, periodicMoves, vapid !== null),
    now.getUTCMinutes() === 0 ? housekeeping(now) : null,
    // Agua y pesaje: aparte, para que un fallo no frene el resto de avisos.
    runNutritionTick(now, vapid).catch((err: Error) => {
      console.error("[antola] avisos de comida:", err);
      return { error: err.message };
    }),
  ]);

  return {
    ok: true,
    ms: Date.now() - started,
    clavesVapid: vapid !== null,
    pendientes: { tareas: tasks.length, eventos: events.length, habitos: habits.length, ajustes: periodic.length },
    avisos: ready.length,
    enviados: delivery?.counts.SENT ?? 0,
    fallidos: delivery?.counts.FAILED ?? 0,
    sinDispositivo: delivery?.counts.SKIPPED ?? 0,
    duplicados: vapid ? ready.length - claimed.length : 0,
    esperandoNoMolestar: waiting,
    descartados: stale,
    dispositivosBorrados: delivery?.removedDevices ?? 0,
    comida,
  };
}

/**
 * Limpieza horaria: registros viejos, sesiones caducadas y enlaces de
 * recuperación usados. Además pasa al día las tareas repetitivas sin hacer
 * (y con ellas su aviso de hoy), cierra el día de Antola (rachas) y crea los
 * retos semanales.
 */
async function housekeeping(now: Date) {
  const ago = (days: number) => new Date(now.getTime() - days * 86400000);
  await Promise.allSettled([
    db.notificationLog.deleteMany({ where: { createdAt: { lt: ago(LOG_RETENTION_DAYS) } } }),
    db.loginAttempt.deleteMany({ where: { createdAt: { lt: ago(1) } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } }),
    rollAllRecurringTasks(now),
    // Profity: una tarea por artículo que haya que pedir, para cada usuario conectado.
    syncAllProfity(now),
    db.antolaMessageLog.deleteMany({ where: { shownAt: { lt: ago(LOG_RETENTION_DAYS) } } }),
    // Antola: cierre del día (rachas y protectores) y retos de la semana, por zona horaria.
    closeAllDays(now).then(() => ensureAllWeekChallenges(now)),
  ]);
}

/**
 * Marca como atendidos los recordatorios y programa los siguientes. Cada
 * actualización comprueba el valor anterior: si el usuario lo ha cambiado
 * mientras tanto (p. ej. ha pospuesto la tarea), no se pisa.
 */
async function advance(
  tasks: { id: string; remindAt: Date }[],
  events: { id: string; remindAt: Date }[],
  habits: { id: string; prev: Date; next: Date | null }[],
  periodic: Record<PeriodicKind, { userId: string; prev: Date | null; next: Date }[]>,
  canSend: boolean,
) {
  // Sin claves VAPID no se consume nada (se enviará cuando estén), salvo la
  // programación inicial de los avisos periódicos.
  const ops: Promise<unknown>[] = [];
  if (canSend) {
    if (tasks.length) {
      ops.push(db.task.updateMany({ where: { OR: tasks.map((t) => ({ id: t.id, remindAt: t.remindAt })) }, data: { remindAt: null } }));
    }
    if (events.length) {
      ops.push(db.event.updateMany({ where: { OR: events.map((e) => ({ id: e.id, remindAt: e.remindAt })) }, data: { remindAt: null } }));
    }
    if (habits.length) {
      ops.push(
        db.$executeRawUnsafe(
          `UPDATE "Habit" h SET "nextReminderAt" = (v.next::timestamptz AT TIME ZONE 'UTC')
           FROM unnest($1::text[], $2::text[], $3::text[]) AS v(id, prev, next)
           WHERE h.id = v.id AND h."nextReminderAt" = (v.prev::timestamptz AT TIME ZONE 'UTC')`,
          habits.map((h) => h.id),
          habits.map((h) => h.prev.toISOString()),
          habits.map((h) => h.next?.toISOString() ?? null),
        ),
      );
    }
  }
  for (const kind of PERIODIC_KINDS) {
    const rows = canSend ? periodic[kind] : periodic[kind].filter((r) => r.prev === null);
    if (!rows.length) continue;
    const col = NEXT_FIELD[kind];
    ops.push(
      db.$executeRawUnsafe(
        `UPDATE "Settings" s SET "${col}" = (v.next::timestamptz AT TIME ZONE 'UTC')
         FROM unnest($1::text[], $2::text[], $3::text[]) AS v(uid, prev, next)
         WHERE s."userId" = v.uid AND s."${col}" IS NOT DISTINCT FROM (v.prev::timestamptz AT TIME ZONE 'UTC')`,
        rows.map((r) => r.userId),
        rows.map((r) => r.prev?.toISOString() ?? null),
        rows.map((r) => r.next.toISOString()),
      ),
    );
  }
  await Promise.all(ops);
}
