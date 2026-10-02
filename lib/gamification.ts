import "server-only";
import { Prisma, type AntolaTone, type ChallengeKind, type XpKind } from "@prisma/client";
import { after } from "next/server";
import { db } from "@/lib/db";
import {
  addDays,
  dateStrToDb,
  dbToDateStr,
  diffDays,
  localDateStr,
  localHour,
  localMinutes,
  startOfWeekMonday,
  todayStr,
  zonedToUtc,
  type DateStr,
} from "@/lib/dates";
import { isScheduledOn } from "@/lib/habits";
import { vapidConfig } from "@/lib/push";
import { deliver } from "@/lib/notifications/deliver";
import { readiness } from "@/lib/notifications/timing";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, type AchievementMetrics, type MetricKey } from "@/lib/antola/achievements";
import { pickChallenges, type Activity } from "@/lib/antola/challenges";
import { levelFromXp, levelTitle, stageForLevel, unlocksAtLevel, type Stage } from "@/lib/antola/levels";
import {
  MESSAGES,
  SITUATION_EXPRESSION,
  pickMessage,
  renderMessage,
  type Expression,
  type MessageVars,
  type Situation,
} from "@/lib/antola/messages";
import { ACCESSORY_IDS, SHOP_BY_ID } from "@/lib/antola/shop";
import { crumbsForXp, closeStreak, FOOD_XP, foodXpDay, isDayComplete, isProductiveDay, MAX_HUNGER_XP_PER_DAY, MAX_SHIELDS, MEALS_FOR_XP, taskXp, XP } from "@/lib/antola/xp";
import { logStreak } from "@/lib/nutrition/meals";
import { progressKg, weightMilestones, weightSummary } from "@/lib/nutrition/weight";

/**
 * Servicio central de la gamificación. TODO se calcula aquí, en el servidor, y
 * siempre filtrando por el userId de la sesión. Las acciones (completar una
 * tarea, un hábito…) llaman a `award()`, que devuelve lo ganado para que la
 * interfaz lo celebre.
 *
 * Reglas clave:
 * - Cada acción da XP una sola vez: XpEvent tiene clave única
 *   (userId, tipo, id del elemento). Desmarcar borra la fila y resta.
 * - Las migas salen de los XP (1 por cada 10) más las extra de logros y retos.
 * - El cierre del día (rachas, protectores) es idempotente: avanza desde
 *   `lastClosedDay` con un bloqueo por usuario.
 */

type Tx = Prisma.TransactionClient;
type Client = Tx | typeof db;

const RECENT_MESSAGES = 10;
const STABLE_MESSAGE_MS = 3 * 60 * 60 * 1000; // el bocadillo no cambia en cada recarga
const MAX_CLOSE_DAYS = 60;
const BACKFILL_MAX_DAYS = 400;

// ─── Ajustes ────────────────────────────────────────────────────────────────

export type AntolaSettings = {
  timezone: string;
  gamificationEnabled: boolean;
  antolaOnToday: boolean;
  soundsEnabled: boolean;
  antolaTone: AntolaTone;
  notifyRewards: boolean;
  dndEnabled: boolean;
  dndStart: number;
  dndEnd: number;
};

export async function antolaSettings(userId: string): Promise<AntolaSettings> {
  const s = await db.settings.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: {
      timezone: true,
      gamificationEnabled: true,
      antolaOnToday: true,
      soundsEnabled: true,
      antolaTone: true,
      notifyRewards: true,
      dndEnabled: true,
      dndStart: true,
      dndEnd: true,
    },
  });
  return s;
}

// ─── Utilidades de fechas ───────────────────────────────────────────────────

function dayStart(day: DateStr, tz: string) {
  return zonedToUtc(day, 0, tz);
}

function daysBetween(from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

type HabitRow = { id: string; daysOfWeek: number[]; createdAt: Date; archivedAt: Date | null };

/** ¿Tocaba ese hábito ese día? (existía, no estaba archivado y era uno de sus días). */
function habitScheduled(h: HabitRow, day: DateStr, tz: string) {
  if (!isScheduledOn(h.daysOfWeek, day)) return false;
  if (localDateStr(h.createdAt, tz) > day) return false;
  if (h.archivedAt && localDateStr(h.archivedAt, tz) <= day) return false;
  return true;
}

// ─── Movimientos de XP ──────────────────────────────────────────────────────

/** Suma (o resta) XP y migas extra; las migas de los XP salen de la propia suma. */
async function applyDelta(tx: Tx, userId: string, dXp: number, dCrumbs: number) {
  const rows = await tx.$queryRaw<{ xp: number; level: number }[]>`
    UPDATE "UserStats" SET
      "xp" = GREATEST(0, "xp" + ${dXp}::int),
      "crumbs" = GREATEST(0, "crumbs" + (GREATEST(0, "xp" + ${dXp}::int) / 10 - "xp" / 10) + ${dCrumbs}::int),
      "updatedAt" = now()
    WHERE "userId" = ${userId}
    RETURNING "xp", "level"`;
  const row = rows[0];
  if (!row) return;
  const level = levelFromXp(row.xp);
  if (level !== row.level) await tx.userStats.update({ where: { userId }, data: { level } });
}

/** Da XP por un elemento. Si ya se dio antes (clave única), no hace nada. */
async function grant(tx: Tx, userId: string, kind: XpKind, refId: string, xp: number, crumbs: number, day: DateStr) {
  const res = await tx.xpEvent.createMany({
    data: [{ userId, kind, refId, xp, crumbs, day: dateStrToDb(day) }],
    skipDuplicates: true,
  });
  if (!res.count) return false;
  await applyDelta(tx, userId, xp, crumbs);
  return true;
}

/** Quita lo que dio un elemento (al desmarcarlo). */
async function revoke(tx: Tx, userId: string, kind: XpKind, refId: string) {
  const ev = await tx.xpEvent.findUnique({ where: { userId_kind_refId: { userId, kind, refId } } });
  if (!ev) return false;
  const res = await tx.xpEvent.deleteMany({ where: { id: ev.id, userId } });
  if (!res.count) return false;
  await applyDelta(tx, userId, -ev.xp, -ev.crumbs);
  return true;
}

async function addShields(tx: Tx, userId: string, n: number) {
  if (n <= 0) return;
  await tx.$executeRaw`UPDATE "UserStats" SET "streakShields" = LEAST(${MAX_SHIELDS}::int, "streakShields" + ${n}::int) WHERE "userId" = ${userId}`;
}

async function lockUser(tx: Tx, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"antola:" + userId}))`;
}

// ─── Estado del día ─────────────────────────────────────────────────────────

export type TodayState = {
  today: DateStr;
  tasksTotal: number; // con fecha de hoy
  tasksDone: number;
  tasksCompleted: number; // completadas hoy (de cualquier fecha)
  habitsScheduled: number;
  habitsDone: number;
  productive: boolean;
  complete: boolean;
};

export async function todayState(client: Client, userId: string, tz: string, now: Date): Promise<TodayState> {
  const today = todayStr(tz, now);
  const [due, completed, habits, logs] = await Promise.all([
    client.task.findMany({ where: { userId, dueDate: dateStrToDb(today) }, select: { completedAt: true } }),
    client.task.count({ where: { userId, completedAt: { gte: dayStart(today, tz), lt: dayStart(addDays(today, 1), tz) } } }),
    client.habit.findMany({ where: { userId, archivedAt: null }, select: { id: true, daysOfWeek: true } }),
    client.habitLog.findMany({ where: { userId, date: dateStrToDb(today) }, select: { habitId: true } }),
  ]);
  const done = new Set(logs.map((l) => l.habitId));
  const scheduled = habits.filter((h) => isScheduledOn(h.daysOfWeek, today));
  const counts = {
    tasksTotal: due.length,
    tasksDone: due.filter((t) => t.completedAt).length,
    tasksCompleted: completed,
    habitsScheduled: scheduled.length,
    habitsDone: scheduled.filter((h) => done.has(h.id)).length,
  };
  return {
    today,
    ...counts,
    productive: isProductiveDay({ habitsScheduled: counts.habitsScheduled, habitsDone: counts.habitsDone, tasksCompleted: counts.tasksCompleted }),
    complete: isDayComplete(counts),
  };
}

/** Productividad de una serie de días pasados (para cierres y retroactivos). */
async function productiveDays(client: Client, userId: string, tz: string, from: DateStr, to: DateStr) {
  const [completed, habits, logs] = await Promise.all([
    client.task.findMany({
      where: { userId, completedAt: { gte: dayStart(from, tz), lt: dayStart(addDays(to, 1), tz) } },
      select: { completedAt: true },
    }),
    client.habit.findMany({ where: { userId }, select: { id: true, daysOfWeek: true, createdAt: true, archivedAt: true } }),
    client.habitLog.findMany({
      where: { userId, date: { gte: dateStrToDb(from), lte: dateStrToDb(to) } },
      select: { habitId: true, date: true },
    }),
  ]);
  const tasksByDay = new Map<DateStr, number>();
  for (const t of completed) {
    const d = localDateStr(t.completedAt!, tz);
    tasksByDay.set(d, (tasksByDay.get(d) ?? 0) + 1);
  }
  const logSet = new Set(logs.map((l) => `${l.habitId}|${dbToDateStr(l.date)}`));
  return daysBetween(from, to).map((day) => {
    const scheduled = habits.filter((h) => habitScheduled(h, day, tz));
    const habitsDone = scheduled.filter((h) => logSet.has(`${h.id}|${day}`)).length;
    return {
      day,
      productive: isProductiveDay({ habitsScheduled: scheduled.length, habitsDone, tasksCompleted: tasksByDay.get(day) ?? 0 }),
    };
  });
}

// ─── Alta y puntos de la actividad anterior ─────────────────────────────────

/**
 * Crea las estadísticas del usuario la primera vez, con los XP, migas, rachas
 * y logros que corresponden a lo que ya había hecho (para no empezar de cero).
 */
export async function ensureStats(userId: string, tz: string, now = new Date()) {
  const existing = await db.userStats.findUnique({ where: { userId } });
  if (existing?.backfilledAt) return existing;
  await backfill(userId, tz, now);
  await checkAchievements(userId, tz, now, { full: true });
  return db.userStats.findUniqueOrThrow({ where: { userId } });
}

async function backfill(userId: string, tz: string, now: Date) {
  await db.$transaction(
    async (tx) => {
      await lockUser(tx, userId);
      const current = await tx.userStats.findUnique({ where: { userId }, select: { backfilledAt: true } });
      if (current?.backfilledAt) return;

      const today = todayStr(tz, now);
      const yesterday = addDays(today, -1);
      const [user, tasks, habits, logs, reviews, milestones, goals] = await Promise.all([
        tx.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true } }),
        tx.task.findMany({
          where: { userId, OR: [{ completedAt: { not: null } }, { dueDate: { not: null, lt: dateStrToDb(today) } }] },
          select: { id: true, priority: true, createdAt: true, completedAt: true, dueDate: true },
          take: 20000,
        }),
        tx.habit.findMany({ where: { userId }, select: { id: true, daysOfWeek: true, createdAt: true, archivedAt: true } }),
        tx.habitLog.findMany({ where: { userId }, select: { habitId: true, date: true }, take: 50000 }),
        tx.weeklyReview.findMany({ where: { userId }, select: { weekStart: true, createdAt: true } }),
        tx.goalMilestone.findMany({ where: { userId, doneAt: { not: null } }, select: { id: true, doneAt: true } }),
        tx.goal.findMany({ where: { userId, status: "ACHIEVED" }, select: { id: true, achievedAt: true, updatedAt: true } }),
      ]);

      const events: Prisma.XpEventCreateManyInput[] = [];
      const add = (kind: XpKind, refId: string, xp: number, day: DateStr) =>
        events.push({ userId, kind, refId, xp, crumbs: 0, day: dateStrToDb(day) });

      const completedByDay = new Map<DateStr, number>();
      for (const t of tasks) {
        if (!t.completedAt) continue;
        const day = localDateStr(t.completedAt, tz);
        completedByDay.set(day, (completedByDay.get(day) ?? 0) + 1);
        add(
          "TASK",
          t.id,
          taskXp({
            priority: t.priority,
            createdAt: t.createdAt,
            completedAt: t.completedAt,
            dueDate: t.dueDate ? dbToDateStr(t.dueDate) : null,
            completedDay: day,
          }),
          day,
        );
      }
      for (const l of logs) add("HABIT", `${l.habitId}:${dbToDateStr(l.date)}`, XP.habit, dbToDateStr(l.date));
      for (const r of reviews) add("REVIEW", dbToDateStr(r.weekStart), XP.review, localDateStr(r.createdAt, tz));
      for (const m of milestones) add("MILESTONE", m.id, XP.milestone, localDateStr(m.doneAt!, tz));
      for (const g of goals) add("GOAL", g.id, XP.goal, localDateStr(g.achievedAt ?? g.updatedAt, tz));

      // Días pasados: completos (bonus) y productivos (racha).
      const firstActivity = [
        localDateStr(user.createdAt, tz),
        ...tasks.map((t) => (t.completedAt ? localDateStr(t.completedAt, tz) : dbToDateStr(t.dueDate!))),
        ...logs.map((l) => dbToDateStr(l.date)),
      ].sort()[0];
      const from = firstActivity > addDays(yesterday, -BACKFILL_MAX_DAYS) ? firstActivity : addDays(yesterday, -BACKFILL_MAX_DAYS);
      const logSet = new Set(logs.map((l) => `${l.habitId}|${dbToDateStr(l.date)}`));
      const dueByDay = Map.groupBy(
        tasks.filter((t) => t.dueDate),
        (t) => dbToDateStr(t.dueDate!),
      );
      const streakDays: { day: DateStr; productive: boolean }[] = [];
      let lastProductive: DateStr | null = null;
      for (const day of from <= yesterday ? daysBetween(from, yesterday) : []) {
        const scheduled = habits.filter((h) => habitScheduled(h, day, tz));
        const habitsDone = scheduled.filter((h) => logSet.has(`${h.id}|${day}`)).length;
        const due = dueByDay.get(day) ?? [];
        if (
          isDayComplete({
            tasksTotal: due.length,
            tasksDone: due.filter((t) => t.completedAt).length,
            habitsScheduled: scheduled.length,
            habitsDone,
          })
        ) {
          add("DAY_COMPLETE", day, XP.dayComplete, day);
        }
        const productive = isProductiveDay({ habitsScheduled: scheduled.length, habitsDone, tasksCompleted: completedByDay.get(day) ?? 0 });
        if (productive) lastProductive = day;
        streakDays.push({ day, productive });
      }
      const streak = closeStreak({ current: 0, best: 0, shields: 0 }, streakDays.map((d) => d.productive));

      const xp = events.reduce((sum, e) => sum + e.xp, 0);
      await tx.userStats.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      for (let i = 0; i < events.length; i += 2000) {
        await tx.xpEvent.createMany({ data: events.slice(i, i + 2000), skipDuplicates: true });
      }
      for (let i = 0; i < streakDays.length; i += 2000) {
        await tx.streakDay.createMany({
          data: streakDays.slice(i, i + 2000).map((d) => ({ userId, day: dateStrToDb(d.day), productive: d.productive })),
          skipDuplicates: true,
        });
      }
      await tx.userStats.update({
        where: { userId },
        data: {
          xp,
          level: levelFromXp(xp),
          crumbs: crumbsForXp(0, xp),
          currentStreak: streak.current,
          bestStreak: streak.best,
          lastProductiveDay: lastProductive ? dateStrToDb(lastProductive) : null,
          lastClosedDay: dateStrToDb(yesterday),
          backfilledAt: now,
        },
      });
    },
    { maxWait: 20000, timeout: 120000 },
  );
}

// ─── Cierre de días y rachas ────────────────────────────────────────────────

/**
 * Cierra los días que faltan hasta ayer (zona del usuario): suma a la racha
 * los productivos y, en los que no, gasta un protector o la reinicia.
 * Idempotente: se puede llamar desde el cron y al abrir la app a la vez.
 */
export async function closeDays(userId: string, tz: string, now = new Date()) {
  const yesterday = addDays(todayStr(tz, now), -1);
  const quick = await db.userStats.findUnique({ where: { userId }, select: { lastClosedDay: true, backfilledAt: true } });
  if (!quick?.backfilledAt) return;
  if (quick.lastClosedDay && dbToDateStr(quick.lastClosedDay) >= yesterday) return;

  await db.$transaction(
    async (tx) => {
      await lockUser(tx, userId);
      const s = await tx.userStats.findUniqueOrThrow({ where: { userId } });
      const last = s.lastClosedDay ? dbToDateStr(s.lastClosedDay) : addDays(yesterday, -1);
      if (last >= yesterday) return;
      let from = addDays(last, 1);
      let state = { current: s.currentStreak, best: s.bestStreak, shields: s.streakShields };
      // Mucho tiempo sin abrir la app y sin cron: lo anterior no cuenta para la racha.
      if (diffDays(yesterday, from) >= MAX_CLOSE_DAYS) {
        from = addDays(yesterday, -(MAX_CLOSE_DAYS - 1));
        state = { ...state, current: 0 };
      }
      const days = await productiveDays(tx, userId, tz, from, yesterday);
      const result = closeStreak(state, days.map((d) => d.productive));
      await tx.streakDay.createMany({
        data: days.map((d, i) => ({ userId, day: dateStrToDb(d.day), productive: d.productive, shieldUsed: result.shieldUsed[i] })),
        skipDuplicates: true,
      });
      const lastProductive = [...days].reverse().find((d) => d.productive)?.day;
      await tx.userStats.update({
        where: { userId },
        data: {
          currentStreak: result.current,
          bestStreak: result.best,
          streakShields: result.shields,
          lastClosedDay: dateStrToDb(yesterday),
          ...(lastProductive ? { lastProductiveDay: dateStrToDb(lastProductive) } : {}),
        },
      });
    },
    { maxWait: 20000, timeout: 60000 },
  );
}

/** Para el cron: cierra el día de todos los usuarios activos que lo tengan pendiente. */
export async function closeAllDays(now = new Date()) {
  const cutoff = dateStrToDb(addDays(localDateStr(now, "UTC"), 0));
  const rows = await db.userStats.findMany({
    where: { backfilledAt: { not: null }, OR: [{ lastClosedDay: null }, { lastClosedDay: { lt: cutoff } }], user: { disabledAt: null } },
    select: { userId: true, user: { select: { settings: { select: { timezone: true } } } } },
    take: 500,
  });
  let closed = 0;
  for (const r of rows) {
    try {
      await closeDays(r.userId, r.user.settings?.timezone ?? "Europe/Madrid", now);
      closed++;
    } catch (err) {
      console.error("[antola] cierre del día:", (err as Error).message);
    }
  }
  return closed;
}

/** Racha que se ve: la cerrada hasta ayer más hoy si ya es productivo. */
export function visibleStreak(stats: { currentStreak: number }, today: TodayState) {
  return stats.currentStreak + (today.productive ? 1 : 0);
}

// ─── Objetivo de peso ───────────────────────────────────────────────────────

/** El objetivo «Peso» con la tendencia actual y sus hitos (null si no hay). */
async function weightGoalState(userId: string, tz: string, now: Date) {
  const profile = await db.nutritionProfile.findUnique({ where: { userId }, select: { goalId: true } });
  if (!profile?.goalId) return null;
  const goal = await db.goal.findFirst({
    where: { id: profile.goalId, userId, type: "WEIGHT" },
    select: { id: true, startValue: true, targetValue: true, status: true },
  });
  if (!goal || goal.startValue == null || goal.targetValue == null) return null;
  const today = todayStr(tz, now);
  const logs = await db.weightLog.findMany({
    where: { userId, day: { gte: dateStrToDb(addDays(today, -730)) } },
    orderBy: { day: "asc" },
    select: { day: true, kg: true },
  });
  const { current } = weightSummary(
    logs.map((l) => ({ day: dbToDateStr(l.day), kg: l.kg })),
    today,
  );
  return {
    goalId: goal.id,
    start: goal.startValue,
    target: goal.targetValue,
    current,
    achieved: goal.status === "ACHIEVED",
    milestones: weightMilestones(goal.startValue, goal.targetValue, current),
  };
}

// ─── Logros ─────────────────────────────────────────────────────────────────

export type UnlockedAchievement = { id: string; name: string; icon: string; description: string; crumbs: number; shields: number };

type AchievementCtx = { earlyTask?: boolean; nightTask?: boolean; inboxZero?: boolean; full?: boolean };

async function loadMetrics(userId: string, tz: string, now: Date, needs: Set<MetricKey>, ctx: AchievementCtx) {
  const m: Partial<AchievementMetrics> = {};
  const jobs: Promise<void>[] = [];
  const need = (k: MetricKey) => needs.has(k);
  let todayP: Promise<TodayState> | null = null;
  const today = () => (todayP ??= todayState(db, userId, tz, now));

  if (need("tasksDone")) jobs.push(db.task.count({ where: { userId, completedAt: { not: null } } }).then((n) => void (m.tasksDone = n)));
  if (need("habitsDone")) jobs.push(db.habitLog.count({ where: { userId } }).then((n) => void (m.habitsDone = n)));
  if (need("reviews")) jobs.push(db.weeklyReview.count({ where: { userId } }).then((n) => void (m.reviews = n)));
  if (need("goalsCreated")) jobs.push(db.goal.count({ where: { userId } }).then((n) => void (m.goalsCreated = n)));
  if (need("goalsAchieved")) jobs.push(db.goal.count({ where: { userId, status: "ACHIEVED" } }).then((n) => void (m.goalsAchieved = n)));
  if (need("perfectDays")) jobs.push(db.xpEvent.count({ where: { userId, kind: "DAY_COMPLETE" } }).then((n) => void (m.perfectDays = n)));
  if (need("challengesDone")) jobs.push(db.weeklyChallenge.count({ where: { userId, completedAt: { not: null } } }).then((n) => void (m.challengesDone = n)));
  if (need("accessories")) {
    jobs.push(db.userItem.count({ where: { userId, itemId: { in: ACCESSORY_IDS } } }).then((n) => void (m.accessories = n)));
  }
  if (need("level")) jobs.push(db.userStats.findUnique({ where: { userId }, select: { level: true } }).then((s) => void (m.level = s?.level ?? 1)));
  if (need("tasksToday")) jobs.push(today().then((t) => void (m.tasksToday = t.tasksCompleted)));
  if (need("streak")) {
    jobs.push(
      Promise.all([db.userStats.findUnique({ where: { userId }, select: { currentStreak: true } }), today()]).then(([s, t]) => {
        m.streak = s ? visibleStreak(s, t) : 0;
      }),
    );
  }
  if (need("productiveRun")) {
    jobs.push(
      Promise.all([
        db.streakDay.findMany({ where: { userId }, orderBy: { day: "desc" }, take: 7, select: { day: true, productive: true, shieldUsed: true } }),
        today(),
      ]).then(([days, t]) => {
        let run = t.productive ? 1 : 0;
        let expected = addDays(t.today, -1);
        for (const d of days) {
          if (dbToDateStr(d.day) !== expected || !d.productive || d.shieldUsed) break;
          run++;
          expected = addDays(expected, -1);
        }
        m.productiveRun = run;
      }),
    );
  }
  if ((need("earlyTask") || need("nightTask")) && ctx.full) {
    jobs.push(
      db.task
        .findMany({ where: { userId, completedAt: { not: null } }, select: { completedAt: true }, take: 5000, orderBy: { completedAt: "desc" } })
        .then((rows) => {
          const minutes = rows.map((r) => localMinutes(r.completedAt!, tz));
          m.earlyTask = minutes.some((x) => x < 8 * 60);
          m.nightTask = minutes.some((x) => x < 5 * 60);
        }),
    );
  }
  // Comida: rachas a partir de los XP diarios (solo existen los días que se ganaron).
  const xpRun = (kind: XpKind) =>
    db.xpEvent
      .findMany({ where: { userId, kind }, orderBy: { day: "desc" }, take: 400, select: { day: true } })
      .then((rows) => logStreak(rows.map((r) => dbToDateStr(r.day)), todayStr(tz, now), addDays));
  if (need("waterRun")) jobs.push(xpRun("WATER_GOAL").then((n) => void (m.waterRun = n)));
  if (need("proteinRun")) jobs.push(xpRun("PROTEIN_GOAL").then((n) => void (m.proteinRun = n)));
  if (need("mealDays")) {
    jobs.push(
      db.mealLog.findMany({ where: { userId }, distinct: ["day"], select: { day: true }, take: 400 }).then((r) => void (m.mealDays = r.length)),
    );
  }
  if (need("weightProgressKg") || need("weightHalf") || need("weightGoalAchieved")) {
    jobs.push(
      weightGoalState(userId, tz, now).then((w) => {
        m.weightProgressKg = w ? progressKg(w.start, w.target, w.current) : 0;
        m.weightHalf = !!w && (w.achieved || w.milestones.some((x) => x.reached && (x.id === "half" || x.label.includes("mitad"))));
        m.weightGoalAchieved = !!w?.achieved;
      }),
    );
  }
  await Promise.all(jobs);
  m.earlyTask = m.earlyTask || !!ctx.earlyTask;
  m.nightTask = m.nightTask || !!ctx.nightTask;
  m.inboxZero = !!ctx.inboxZero;
  return m as AchievementMetrics;
}

/** Comprueba los logros que faltan y entrega los nuevos (con sus migas y protectores). */
export async function checkAchievements(userId: string, tz: string, now: Date, ctx: AchievementCtx = {}): Promise<UnlockedAchievement[]> {
  const unlocked = new Set(
    (await db.userAchievement.findMany({ where: { userId }, select: { achievementId: true } })).map((a) => a.achievementId),
  );
  const pending = ACHIEVEMENTS.filter((a) => !unlocked.has(a.id));
  if (!pending.length) return [];
  const metrics = await loadMetrics(userId, tz, now, new Set(pending.flatMap((a) => a.needs)), ctx);
  const reached = pending.filter((a) => a.test(metrics));
  if (!reached.length) return [];

  const today = todayStr(tz, now);
  const won: UnlockedAchievement[] = [];
  await db.$transaction(async (tx) => {
    for (const a of reached) {
      const res = await tx.userAchievement.createMany({ data: [{ userId, achievementId: a.id }], skipDuplicates: true });
      if (!res.count) continue;
      await grant(tx, userId, "ACHIEVEMENT", a.id, 0, a.reward.crumbs, today);
      await addShields(tx, userId, a.reward.shields ?? 0);
      won.push({ id: a.id, name: a.name, icon: a.icon, description: a.description, crumbs: a.reward.crumbs, shields: a.reward.shields ?? 0 });
    }
  });
  return won;
}

// ─── Retos semanales ────────────────────────────────────────────────────────

async function weekActivity(userId: string, tz: string, weekStart: DateStr): Promise<Activity> {
  const from = addDays(weekStart, -28);
  const [completed, productive, habits, pendingByProject] = await Promise.all([
    db.task.findMany({
      where: { userId, completedAt: { gte: dayStart(from, tz), lt: dayStart(weekStart, tz) } },
      select: { priority: true, completedAt: true },
    }),
    db.streakDay.count({ where: { userId, productive: true, day: { gte: dateStrToDb(from), lt: dateStrToDb(weekStart) } } }),
    db.habit.count({ where: { userId, archivedAt: null } }),
    db.task.groupBy({
      by: ["projectId"],
      where: { userId, completedAt: null, projectId: { not: null }, project: { archivedAt: null } },
      _count: { _all: true },
      orderBy: { _count: { projectId: "desc" } },
      take: 1,
    }),
  ]);
  const top = pendingByProject[0];
  const project = top?.projectId
    ? await db.project.findFirst({ where: { id: top.projectId, userId }, select: { id: true, name: true } })
    : null;
  return {
    tasksPerWeek: completed.length / 4,
    highPerWeek: completed.filter((t) => t.priority === "HIGH").length / 4,
    earlyPerWeek: completed.filter((t) => localMinutes(t.completedAt!, tz) < 12 * 60).length / 4,
    productivePerWeek: productive / 4,
    activeHabits: habits,
    topProject: project && top ? { id: project.id, name: project.name, pending: top._count._all } : null,
  };
}

/** Crea los 3 retos de esta semana si aún no existen (idempotente). */
export async function ensureWeekChallenges(userId: string, tz: string, now = new Date()) {
  const weekStart = startOfWeekMonday(todayStr(tz, now));
  const existing = await db.weeklyChallenge.count({ where: { userId, weekStart: dateStrToDb(weekStart) } });
  if (existing) return weekStart;
  const specs = pickChallenges(await weekActivity(userId, tz, weekStart), `${userId}:${weekStart}`);
  await db.weeklyChallenge.createMany({
    data: specs.map((c, slot) => ({ userId, weekStart: dateStrToDb(weekStart), slot, ...c })),
    skipDuplicates: true,
  });
  return weekStart;
}

async function challengeProgress(
  userId: string,
  tz: string,
  now: Date,
  weekStart: DateStr,
  kinds: { kind: ChallengeKind; refId: string | null }[],
): Promise<Map<string, number>> {
  const today = todayStr(tz, now);
  const end = addDays(weekStart, 6) < today ? addDays(weekStart, 6) : today;
  const out = new Map<string, number>();
  const keyOf = (k: ChallengeKind, ref: string | null) => `${k}|${ref ?? ""}`;
  const needTasks = kinds.some((k) => ["TASKS", "HIGH_PRIORITY", "PROJECT_TASKS", "EARLY_TASKS"].includes(k.kind));
  const needDays = kinds.some((k) => k.kind === "HABIT_DAYS" || k.kind === "PRODUCTIVE_DAYS");

  const [tasks, habits, logs, closed, todayNow] = await Promise.all([
    needTasks
      ? db.task.findMany({
          where: { userId, completedAt: { gte: dayStart(weekStart, tz), lt: dayStart(addDays(end, 1), tz) } },
          select: { priority: true, projectId: true, completedAt: true },
        })
      : [],
    needDays ? db.habit.findMany({ where: { userId }, select: { id: true, daysOfWeek: true, createdAt: true, archivedAt: true } }) : [],
    needDays
      ? db.habitLog.findMany({ where: { userId, date: { gte: dateStrToDb(weekStart), lte: dateStrToDb(end) } }, select: { habitId: true, date: true } })
      : [],
    needDays
      ? db.streakDay.findMany({ where: { userId, day: { gte: dateStrToDb(weekStart), lt: dateStrToDb(today) } }, select: { productive: true } })
      : [],
    needDays ? todayState(db, userId, tz, now) : null,
  ]);
  const logSet = new Set(logs.map((l) => `${l.habitId}|${dbToDateStr(l.date)}`));
  const habitDays = needDays
    ? daysBetween(weekStart, end).filter((day) => {
        const scheduled = habits.filter((h) => habitScheduled(h, day, tz));
        return scheduled.length > 0 && scheduled.every((h) => logSet.has(`${h.id}|${day}`));
      }).length
    : 0;
  const productive = closed.filter((d) => d.productive).length + (todayNow?.productive && today <= addDays(weekStart, 6) ? 1 : 0);

  for (const k of kinds) {
    let n = 0;
    switch (k.kind) {
      case "TASKS":
        n = tasks.length;
        break;
      case "HIGH_PRIORITY":
        n = tasks.filter((t) => t.priority === "HIGH").length;
        break;
      case "PROJECT_TASKS":
        n = tasks.filter((t) => t.projectId === k.refId).length;
        break;
      case "EARLY_TASKS":
        n = tasks.filter((t) => localMinutes(t.completedAt!, tz) < 12 * 60).length;
        break;
      case "HABIT_DAYS":
        n = habitDays;
        break;
      case "PRODUCTIVE_DAYS":
        n = productive;
        break;
    }
    out.set(keyOf(k.kind, k.refId), n);
  }
  return new Map([...out].map(([k, v]) => [k, v]));
}

export type CompletedChallenge = { id: string; label: string; xp: number; crumbs: number };

/** Recalcula el progreso de los retos de esta semana y entrega los completados. */
export async function refreshChallenges(userId: string, tz: string, now = new Date()): Promise<CompletedChallenge[]> {
  const weekStart = await ensureWeekChallenges(userId, tz, now);
  const open = await db.weeklyChallenge.findMany({ where: { userId, weekStart: dateStrToDb(weekStart), completedAt: null } });
  if (!open.length) return [];
  const progress = await challengeProgress(userId, tz, now, weekStart, open);
  const today = todayStr(tz, now);
  const done: CompletedChallenge[] = [];
  await db.$transaction(async (tx) => {
    for (const c of open) {
      const value = Math.min(c.target, progress.get(`${c.kind}|${c.refId ?? ""}`) ?? 0);
      if (value >= c.target) {
        const res = await tx.weeklyChallenge.updateMany({
          where: { id: c.id, userId, completedAt: null },
          data: { progress: value, completedAt: now },
        });
        if (res.count && (await grant(tx, userId, "CHALLENGE", c.id, c.rewardXp, c.rewardCrumbs, today))) {
          done.push({ id: c.id, label: c.label, xp: c.rewardXp, crumbs: c.rewardCrumbs });
        }
      } else if (value !== c.progress) {
        await tx.weeklyChallenge.updateMany({ where: { id: c.id, userId, completedAt: null }, data: { progress: value } });
      }
    }
  });
  return done;
}

/** Para el cron: retos de la semana para los usuarios activos que aún no los tengan. */
export async function ensureAllWeekChallenges(now = new Date()) {
  const recent = new Date(now.getTime() - 30 * 86400000);
  const users = await db.userStats.findMany({
    where: { backfilledAt: { not: null }, user: { disabledAt: null, lastActiveAt: { gte: recent } } },
    select: { userId: true, user: { select: { settings: { select: { timezone: true } } } } },
    take: 500,
  });
  for (const u of users) {
    try {
      await ensureWeekChallenges(u.userId, u.user.settings?.timezone ?? "Europe/Madrid", now);
    } catch (err) {
      console.error("[antola] retos semanales:", (err as Error).message);
    }
  }
}

// ─── Comida, agua y peso ────────────────────────────────────────────────────

/**
 * XP de Comida para un día (solo hoy o ayer). Cada premio se da una vez:
 * 3 comidas, agua y proteína una vez al día; hambre y saciedad hasta 3
 * comidas al día; el pesaje una vez por semana. Nunca se resta nada.
 * Devuelve la situación con la que reacciona Antola (o null).
 */
async function foodXp(
  tx: Tx,
  userId: string,
  event: Extract<RewardEvent, { type: "food" }>,
  today: DateStr,
  milestones: { id: string; label: string }[],
  tz: string,
  now: Date,
): Promise<Situation | null> {
  let reaction: Situation | null = null;
  const react = (s: Situation) => (reaction ??= s);

  // El objetivo de peso conseguido (lo celebran los logros «Objetivo conseguido» y «¡Lo conseguí!»).
  if (event.goalAchievedId) await grant(tx, userId, "GOAL", event.goalAchievedId, XP.goal, 0, today);
  if (!foodXpDay(event.day, today, addDays(today, -1))) return reaction;

  if (event.weighIn) {
    const weighed = await grant(tx, userId, "WEIGH_IN", startOfWeekMonday(event.day), FOOD_XP.weighIn, 0, event.day);
    // Hitos del objetivo de peso: se celebran una sola vez (sin XP; los logros dan migas).
    const w = await weightGoalState(userId, tz, now);
    for (const m of w?.milestones ?? []) {
      if (m.reached && (await grant(tx, userId, "MILESTONE", `peso:${w!.goalId}:${m.id}`, 0, 0, today))) milestones.push(m);
    }
    if (weighed) react("pesaje");
    return reaction;
  }

  const profile = await tx.nutritionProfile.findUnique({ where: { userId }, select: { waterMl: true, proteinG: true } });
  if (!profile) return reaction;
  const day = dateStrToDb(event.day);
  const [meals, water] = await Promise.all([
    tx.mealLog.findMany({ where: { userId, day }, select: { id: true, status: true, proteinG: true, hungerBefore: true, fullnessAfter: true } }),
    tx.waterLog.aggregate({ where: { userId, day }, _sum: { ml: true } }),
  ]);
  const protein = meals.filter((m) => m.status !== "PENDING").reduce((sum, m) => sum + m.proteinG, 0);
  if (profile.proteinG > 0 && protein >= profile.proteinG && (await grant(tx, userId, "PROTEIN_GOAL", event.day, FOOD_XP.protein, 0, event.day))) {
    react("proteina_objetivo");
  }
  if ((water._sum.ml ?? 0) >= profile.waterMl && (await grant(tx, userId, "WATER_GOAL", event.day, FOOD_XP.water, 0, event.day))) {
    react("agua_objetivo");
  }
  if (meals.length >= MEALS_FOR_XP && (await grant(tx, userId, "MEALS_DAY", event.day, FOOD_XP.mealsDay, 0, event.day))) {
    react("comidas_dia");
  }
  const meal = event.mealId ? meals.find((m) => m.id === event.mealId) : null;
  if (meal?.hungerBefore != null && meal.fullnessAfter != null) {
    const given = await tx.xpEvent.count({ where: { userId, kind: "HUNGER", day } });
    if (given < MAX_HUNGER_XP_PER_DAY && (await grant(tx, userId, "HUNGER", meal.id, FOOD_XP.hunger, 0, event.day))) react("hambre_anotada");
  }
  return reaction;
}

// ─── award(): lo que llaman las acciones ────────────────────────────────────

export type RewardEvent =
  | { type: "task"; taskId: string; done: boolean }
  | { type: "habit"; habitId: string; date: DateStr; done: boolean }
  | { type: "review"; weekStart: DateStr }
  | { type: "milestone"; milestoneId: string; done: boolean }
  | { type: "goal"; goalId: string; achieved: boolean }
  | { type: "check"; inboxZero?: boolean } // sin XP: solo logros (objetivo creado, compra…)
  /**
   * Comida, agua o peso de un día. Da los XP que toquen (una vez por día o
   * semana) y nunca resta: borrar o corregir no quita nada.
   */
  | { type: "food"; day: DateStr; mealId?: string; weighIn?: boolean; goalAchievedId?: string | null };

/** Celebración suelta (p. ej. un hito del objetivo de peso). */
export type Celebration = { icon: string; title: string; text: string };

export type Reward = {
  enabled: boolean;
  sounds: boolean;
  xp: number; // XP ganados (negativo si se han restado)
  crumbs: number;
  totalXp: number;
  level: number;
  levelUp: { from: number; to: number; title: string; stage: Stage; unlocked: string[] } | null;
  achievements: UnlockedAchievement[];
  challenges: CompletedChallenge[];
  dayCompleted: boolean;
  streak: number;
  reaction: string | null;
  levelUpText: string | null;
  celebrations: Celebration[];
};

type UserRef = { id: string; timezone: string; name?: string | null };

/**
 * Aplica una acción a la gamificación y devuelve lo ganado. Nunca rompe la
 * acción original: si algo falla, se registra y devuelve null.
 */
export async function award(user: UserRef, event: RewardEvent, now = new Date()): Promise<Reward | null> {
  try {
    return await awardUnsafe(user, event, now);
  } catch (err) {
    console.error("[antola] award:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function awardUnsafe(user: UserRef, event: RewardEvent, now: Date): Promise<Reward> {
  const userId = user.id;
  const tz = user.timezone;
  const settings = await antolaSettings(userId);
  await ensureStats(userId, tz, now);
  await closeDays(userId, tz, now);
  const before = await db.userStats.findUniqueOrThrow({ where: { userId }, select: { xp: true, level: true, crumbs: true } });
  const today = todayStr(tz, now);
  const ctx: AchievementCtx = {};
  let checkDay = false;
  let dayCompleted = false;
  let reactionSituation: Situation | null = null;
  const reachedMilestones: { id: string; label: string }[] = [];

  await db.$transaction(
    async (tx) => {
      switch (event.type) {
        case "task": {
          const t = await tx.task.findFirst({
            where: { id: event.taskId, userId },
            select: { priority: true, createdAt: true, completedAt: true, dueDate: true, projectId: true },
          });
          if (!t) return;
          if (event.done && t.completedAt) {
            const day = localDateStr(t.completedAt, tz);
            const xp = taskXp({
              priority: t.priority,
              createdAt: t.createdAt,
              completedAt: t.completedAt,
              dueDate: t.dueDate ? dbToDateStr(t.dueDate) : null,
              completedDay: day,
            });
            await grant(tx, userId, "TASK", event.taskId, xp, 0, day);
            const minutes = localMinutes(t.completedAt, tz);
            ctx.earlyTask = minutes < 8 * 60;
            ctx.nightTask = minutes < 5 * 60;
            reactionSituation = "tarea_hecha";
          } else if (!event.done) {
            await revoke(tx, userId, "TASK", event.taskId);
          }
          if (!t.projectId && !t.dueDate && event.done) {
            ctx.inboxZero = (await tx.task.count({ where: { userId, completedAt: null, projectId: null, dueDate: null } })) === 0;
          }
          checkDay = true;
          break;
        }
        case "habit": {
          const refId = `${event.habitId}:${event.date}`;
          if (event.done) {
            await grant(tx, userId, "HABIT", refId, XP.habit, 0, event.date);
            reactionSituation = "habito_hecho";
          } else {
            await revoke(tx, userId, "HABIT", refId);
          }
          checkDay = event.date === today;
          break;
        }
        case "review":
          await grant(tx, userId, "REVIEW", event.weekStart, XP.review, 0, today);
          break;
        case "milestone":
          if (event.done) await grant(tx, userId, "MILESTONE", event.milestoneId, XP.milestone, 0, today);
          else await revoke(tx, userId, "MILESTONE", event.milestoneId);
          break;
        case "goal":
          if (event.achieved) await grant(tx, userId, "GOAL", event.goalId, XP.goal, 0, today);
          else await revoke(tx, userId, "GOAL", event.goalId);
          break;
        case "check":
          ctx.inboxZero = !!event.inboxZero;
          break;
        case "food":
          reactionSituation = await foodXp(tx, userId, event, today, reachedMilestones, tz, now);
          break;
      }

      // Bonus de "todo lo de hoy": se gana al completarlo y se pierde si se desmarca algo.
      if (checkDay) {
        const state = await todayState(tx, userId, tz, now);
        if (state.complete) dayCompleted = await grant(tx, userId, "DAY_COMPLETE", today, XP.dayComplete, 0, today);
        else await revoke(tx, userId, "DAY_COMPLETE", today);
      }
    },
    { maxWait: 10000, timeout: 30000 },
  );

  const [achievements, challenges] = await Promise.all([
    checkAchievements(userId, tz, now, ctx),
    refreshChallenges(userId, tz, now),
  ]);
  // Los retos completados pueden desbloquear «Retadora» y subir de nivel.
  if (challenges.length) achievements.push(...(await checkAchievements(userId, tz, now, {})));
  const [afterStats, todayNow] = await Promise.all([
    db.userStats.findUniqueOrThrow({ where: { userId }, select: { xp: true, level: true, crumbs: true, currentStreak: true } }),
    todayState(db, userId, tz, now),
  ]);
  // Los logros de nivel se comprueban con el nivel ya actualizado.
  if (afterStats.level > before.level) achievements.push(...(await checkAchievements(userId, tz, now, {})));

  const tone = settings.antolaTone;
  const levelUp =
    afterStats.level > before.level
      ? {
          from: before.level,
          to: afterStats.level,
          title: levelTitle(afterStats.level),
          stage: stageForLevel(afterStats.level),
          unlocked: Array.from({ length: afterStats.level - before.level }, (_, i) => unlocksAtLevel(before.level + 1 + i)).flat(),
        }
      : null;
  // Hitos del peso que Antola celebra. Si un logro acaba de celebrar lo mismo
  // («Primeros 2 kg», «Mitad del camino»), no se repite.
  const got = new Set(achievements.map((a) => a.id));
  if (reachedMilestones.length) {
    const recent = await db.userAchievement.findMany({
      where: { userId, achievementId: { in: ["primeros-2-kg", "mitad-del-camino"] }, unlockedAt: { gte: new Date(now.getTime() - 86_400_000) } },
      select: { achievementId: true },
    });
    for (const a of recent) got.add(a.achievementId);
  }
  const celebrations: Celebration[] = reachedMilestones
    .filter((m) => !(m.id === "2kg" && got.has("primeros-2-kg")) && !((m.id === "half" || m.label.includes("mitad")) && got.has("mitad-del-camino")))
    .map((m) => ({
      icon: "🏁",
      title: "¡Hito conseguido!",
      text: renderMessage(pickMessage("hito_peso", tone, []).text, { hito: m.label, nombre: user.name ?? null }),
    }));
  const finalStats = achievements.length
    ? await db.userStats.findUniqueOrThrow({ where: { userId }, select: { crumbs: true } })
    : afterStats;

  const reward: Reward = {
    enabled: settings.gamificationEnabled,
    sounds: settings.soundsEnabled,
    xp: afterStats.xp - before.xp,
    crumbs: finalStats.crumbs - before.crumbs,
    totalXp: afterStats.xp,
    level: afterStats.level,
    levelUp,
    achievements,
    challenges,
    dayCompleted,
    streak: visibleStreak(afterStats, todayNow),
    reaction: reactionSituation ? renderMessage(pickMessage(reactionSituation, tone, []).text, { nombre: user.name ?? null }) : null,
    celebrations,
    levelUpText: levelUp
      ? renderMessage(pickMessage("subida_nivel", tone, []).text, { nivel: levelUp.to, titulo: levelUp.title, nombre: user.name ?? null })
      : null,
  };

  if (settings.gamificationEnabled && settings.notifyRewards && (achievements.length || challenges.length)) {
    after(() => sendRewardPush(userId, settings, achievements, challenges, now).catch((e) => console.error("[antola] aviso de logro:", e.message)));
  }
  return reward;
}

/** Aviso de logro o reto conseguido (respeta "no molestar"; un aviso por logro/reto). */
async function sendRewardPush(
  userId: string,
  s: AntolaSettings,
  achievements: UnlockedAchievement[],
  challenges: CompletedChallenge[],
  now: Date,
) {
  const vapid = vapidConfig();
  if (!vapid || readiness(now, s, now) !== "send") return;
  const tone = s.antolaTone;
  const items = [
    ...achievements.map((a) => ({
      key: `reward:a:${a.id}`,
      body: renderMessage(pickMessage("noti_logro", tone, []).text, { logro: `${a.icon} ${a.name}`, xp: a.crumbs ? `+${a.crumbs} migas` : "" }),
    })),
    ...challenges.map((c) => ({
      key: `reward:c:${c.id}`,
      body: renderMessage(pickMessage("noti_reto", tone, []).text, { reto: c.label, xp: `+${c.xp} XP` }),
    })),
  ];
  const logs = await db.notificationLog.createManyAndReturn({
    data: items.map((i) => ({ userId, kind: "REWARD" as const, key: i.key, scheduledFor: now })),
    skipDuplicates: true,
    select: { id: true, key: true },
  });
  const byKey = new Map(items.map((i) => [i.key, i]));
  await deliver(
    logs.map((l) => ({
      logId: l.id,
      userId,
      payload: { title: "🐜 Antola", body: byKey.get(l.key)!.body, url: "/antola", tag: l.key },
    })),
    vapid,
  );
}

// ─── Lo que dice Antola ─────────────────────────────────────────────────────

export type Said = { id: string; text: string; expression: Expression; situation: Situation };

/**
 * Frase de Antola para una situación, sin repetir las 10 últimas que ha visto
 * el usuario. Con `stable`, si ya dijo algo de esta situación hace poco, lo
 * repite (así el bocadillo no cambia en cada recarga).
 */
export async function antolaSay(
  userId: string,
  situation: Situation,
  vars: MessageVars,
  tone: AntolaTone,
  opts: { stable?: boolean; now?: Date } = {},
): Promise<Said> {
  const now = opts.now ?? new Date();
  const recent = await db.antolaMessageLog.findMany({
    where: { userId },
    orderBy: { shownAt: "desc" },
    take: RECENT_MESSAGES,
    select: { messageId: true, situation: true, text: true, shownAt: true },
  });
  const expression = SITUATION_EXPRESSION[situation] ?? "feliz";
  if (opts.stable) {
    const same = recent.find((r) => r.situation === situation && now.getTime() - r.shownAt.getTime() < STABLE_MESSAGE_MS);
    if (same) {
      // Se vuelve a pintar con los datos de ahora (p. ej. el nº de tareas).
      const msg = MESSAGES[situation].find((m) => m.id === same.messageId);
      return { id: same.messageId, text: msg ? renderMessage(msg.text, vars) : same.text, expression, situation };
    }
  }
  const msg = pickMessage(situation, tone, recent.map((r) => r.messageId));
  const text = renderMessage(msg.text, vars);
  await db.antolaMessageLog.create({ data: { userId, messageId: msg.id, situation, text } });
  return { id: msg.id, text, expression, situation };
}

/** Consejo del día: como mucho uno al día (null si ya se dio hoy). */
export async function dailyTip(userId: string, tz: string, tone: AntolaTone, now = new Date()): Promise<Said | null> {
  const start = dayStart(todayStr(tz, now), tz);
  const given = await db.antolaMessageLog.findFirst({ where: { userId, situation: "consejo", shownAt: { gte: start } } });
  if (given) return null;
  return antolaSay(userId, "consejo", {}, tone, { now });
}

// ─── Perfil para las pantallas ──────────────────────────────────────────────

export type AntolaLook = { stage: Stage; accessories: string[] };

/** Lo que lleva puesto Antola y el tema de color (para el layout). */
export async function antolaChrome(userId: string) {
  const [settings, items, stats] = await Promise.all([
    db.settings.findUnique({ where: { userId }, select: { gamificationEnabled: true, soundsEnabled: true } }),
    db.userItem.findMany({ where: { userId, equipped: true }, select: { itemId: true } }),
    db.userStats.findUnique({ where: { userId }, select: { level: true } }),
  ]);
  const equipped = items.map((i) => i.itemId);
  return {
    enabled: settings?.gamificationEnabled ?? true,
    sounds: settings?.soundsEnabled ?? false,
    look: {
      stage: stageForLevel(stats?.level ?? 1),
      accessories: equipped.filter((id) => SHOP_BY_ID.get(id)?.kind === "accessory"),
    } satisfies AntolaLook,
    theme: equipped.find((id) => SHOP_BY_ID.get(id)?.kind === "theme") ?? null,
  };
}

/** Situación del bocadillo de "Hoy" según la hora y cómo va el día. */
export function todaySituation(input: {
  hour: number;
  complete: boolean;
  productive: boolean;
  streak: number;
  overdue: number;
  pending: number;
  total: number;
  completed: number;
}): Situation {
  const { hour } = input;
  if (input.complete) return "dia_completo";
  if (input.streak >= 3 && !input.productive && hour >= 17) return "racha_peligro";
  if (hour >= 23 || hour < 5) return "noche";
  if (input.overdue > 0) return "vencidas";
  if (input.total === 0) return "dia_vacio";
  if (hour < 12) return input.completed === 0 && hour < 11 ? "buenos_dias" : "pendientes_manana";
  if (hour < 19) return "pendientes_tarde";
  return "pendientes_noche";
}

export function localHourNow(tz: string, now = new Date()) {
  return localHour(now, tz);
}

/** Últimos 30 días de XP (para el gráfico de la pantalla de Antola). */
export async function xpHistory(userId: string, tz: string, now = new Date()) {
  const today = todayStr(tz, now);
  const from = addDays(today, -29);
  const rows = await db.xpEvent.groupBy({
    by: ["day"],
    where: { userId, day: { gte: dateStrToDb(from), lte: dateStrToDb(today) } },
    _sum: { xp: true },
  });
  const byDay = new Map(rows.map((r) => [dbToDateStr(r.day), r._sum.xp ?? 0]));
  return daysBetween(from, today).map((day) => ({ day, xp: byDay.get(day) ?? 0 }));
}
