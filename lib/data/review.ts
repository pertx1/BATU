import "server-only";
import { db } from "@/lib/db";
import { addDays, dateStrToDb, dayOfWeek, dbToDateStr, startOfWeekMonday, type DateStr, zonedToUtc } from "@/lib/dates";
import { listHabitViews } from "@/lib/data/habits";
import { taskInclude, taskOrder, toTaskView } from "@/lib/data/tasks";
import { habitTally } from "@/lib/habits";

/**
 * Semana que toca revisar: de viernes a domingo, la semana en curso; de lunes
 * a jueves, la anterior (la revisión se suele hacer el domingo, o con retraso).
 */
export function defaultReviewWeek(today: DateStr): DateStr {
  const monday = startOfWeekMonday(today);
  return [5, 6, 0].includes(dayOfWeek(today)) ? monday : addDays(monday, -7);
}

/** Rango UTC [inicio, fin) de una semana local de lunes a domingo. */
export function weekRange(weekStart: DateStr, timeZone: string) {
  return { start: zonedToUtc(weekStart, 0, timeZone), end: zonedToUtc(addDays(weekStart, 7), 0, timeZone) };
}

/** Pendientes de una semana: sin completar y con fecha hasta el domingo (incluye atrasadas). */
export function pendingWhere(userId: string, weekStart: DateStr) {
  return { userId, completedAt: null, dueDate: { lte: dateStrToDb(addDays(weekStart, 6)) } };
}

export async function getReviewData(userId: string, timeZone: string, weekStart: DateStr, today: DateStr) {
  const weekEnd = addDays(weekStart, 6);
  const { start, end } = weekRange(weekStart, timeZone);

  const [completed, pending, habitData, existing, previous] = await Promise.all([
    db.task.findMany({
      where: { userId, completedAt: { gte: start, lt: end } },
      include: taskInclude,
      orderBy: { completedAt: "asc" },
      take: 200,
    }),
    db.task.findMany({ where: pendingWhere(userId, weekStart), include: taskInclude, orderBy: taskOrder, take: 200 }),
    listHabitViews(userId, timeZone, today),
    db.weeklyReview.findUnique({ where: { userId_weekStart: { userId, weekStart: dateStrToDb(weekStart) } } }),
    db.weeklyReview.findUnique({
      where: { userId_weekStart: { userId, weekStart: dateStrToDb(addDays(weekStart, -7)) } },
      select: { nextWeekFocus: true },
    }),
  ]);

  // Hábitos de la semana (hasta hoy si la semana está en curso)
  const last = weekEnd < today ? weekEnd : today;
  let scheduled = 0;
  let hit = 0;
  for (const h of habitData.habits) {
    const from = h.since > weekStart ? h.since : weekStart;
    if (from > last) continue;
    const t = habitTally(h.daysOfWeek, habitData.logs.get(h.id) ?? new Set(), from, last);
    scheduled += t.scheduled;
    hit += t.hit;
  }

  return {
    weekStart,
    weekEnd,
    completed: completed.map((t) => toTaskView(t, timeZone)),
    pending: pending.map((t) => toTaskView(t, timeZone)),
    habits: { hit, scheduled, rate: scheduled ? hit / scheduled : null },
    existing: existing
      ? { id: existing.id, nextWeekFocus: existing.nextWeekFocus, notes: existing.notes }
      : null,
    previousFocus: previous?.nextWeekFocus ?? null,
  };
}

export async function listReviews(userId: string) {
  const rows = await db.weeklyReview.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
    take: 52,
    select: { id: true, weekStart: true, completedCount: true, pendingCount: true, nextWeekFocus: true },
  });
  return rows.map((r) => ({ ...r, weekStart: dbToDateStr(r.weekStart) }));
}

export async function getReview(userId: string, id: string) {
  const r = await db.weeklyReview.findFirst({ where: { id, userId } });
  if (!r) return null;
  const items = Array.isArray(r.completedItems) ? (r.completedItems as unknown[]).filter((x) => typeof x === "string") : [];
  return { ...r, weekStart: dbToDateStr(r.weekStart), completedItems: items as string[] };
}
