import "server-only";
import { db } from "@/lib/db";
import { addDays, dateStrToDb, localDateStr, type DateStr, zonedToUtc } from "@/lib/dates";
import { listGoalViews } from "@/lib/data/goals";
import { listHabitViews } from "@/lib/data/habits";
import { habitTally } from "@/lib/habits";

export type StatsPeriod = 7 | 30;

/** Estadísticas del usuario para los últimos `days` días (incluido hoy). */
export async function getStats(userId: string, timeZone: string, today: DateStr, days: StatsPeriod) {
  const from = addDays(today, -(days - 1));
  const fromInstant = zonedToUtc(from, 0, timeZone);

  const [completed, pending, overdue, habitData, goals, achieved] = await Promise.all([
    db.task.findMany({
      where: { userId, completedAt: { gte: fromInstant } },
      select: { completedAt: true },
    }),
    db.task.count({ where: { userId, completedAt: null } }),
    db.task.count({ where: { userId, completedAt: null, dueDate: { lt: dateStrToDb(today) } } }),
    listHabitViews(userId, timeZone, today),
    listGoalViews(userId, "ACTIVE"),
    db.goal.count({ where: { userId, status: "ACHIEVED" } }),
  ]);

  // Tareas completadas por día local
  const perDay = new Map<DateStr, number>();
  for (const t of completed) {
    const d = localDateStr(t.completedAt!, timeZone);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  const series = Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return { date, count: perDay.get(date) ?? 0 };
  });
  const totalCompleted = series.reduce((a, d) => a + d.count, 0);
  const best = series.reduce((a, d) => (d.count > a.count ? d : a), series[0]);

  // Hábitos: % sobre los días programados del periodo (desde que existe cada hábito)
  let scheduled = 0;
  let hit = 0;
  const habits = habitData.habits.map((h) => {
    const start = h.since > from ? h.since : from;
    const tally = habitTally(h.daysOfWeek, habitData.logs.get(h.id) ?? new Set(), start, today);
    scheduled += tally.scheduled;
    hit += tally.hit;
    return {
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      color: h.color,
      rate: tally.scheduled ? tally.hit / tally.scheduled : null,
      hit: tally.hit,
      scheduled: tally.scheduled,
      currentStreak: h.currentStreak,
      bestStreak: h.bestStreak,
    };
  });

  return {
    from,
    series,
    tasks: { completed: totalCompleted, perDay: totalCompleted / days, best, pending, overdue },
    habits: { rate: scheduled ? hit / scheduled : null, hit, scheduled, list: habits },
    goals: { active: goals, achieved },
  };
}
