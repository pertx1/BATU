import "server-only";
import { db } from "@/lib/db";
import { addDays, dbToDateStr, type DateStr, localDateStr } from "@/lib/dates";
import { bestStreak, currentStreak, isScheduledOn } from "@/lib/habits";
import type { HabitView } from "@/lib/types";

/** Hábitos del usuario con su estado de hoy y sus rachas (2 consultas en paralelo, sin N+1). */
export async function listHabitViews(userId: string, timeZone: string, today: DateStr) {
  const [habits, logs] = await Promise.all([
    db.habit.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    db.habitLog.findMany({
      where: { userId, habit: { archivedAt: null } },
      select: { habitId: true, date: true },
    }),
  ]);
  if (!habits.length) return { habits: [] as HabitView[], logs: new Map<string, Set<DateStr>>() };
  const byHabit = new Map<string, Set<DateStr>>();
  for (const l of logs) {
    const set = byHabit.get(l.habitId) ?? new Set<DateStr>();
    set.add(dbToDateStr(l.date));
    byHabit.set(l.habitId, set);
  }

  const views: HabitView[] = habits.map((h) => {
    const done = byHabit.get(h.id) ?? new Set<DateStr>();
    const since = earliest(localDateStr(h.createdAt, timeZone), done);
    return {
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      color: h.color,
      daysOfWeek: h.daysOfWeek,
      reminderTime: h.reminderTime,
      doneToday: done.has(today),
      scheduledToday: isScheduledOn(h.daysOfWeek, today),
      currentStreak: currentStreak(h.daysOfWeek, done, today, since),
      bestStreak: bestStreak(h.daysOfWeek, done, today, since),
      since,
    };
  });
  return { habits: views, logs: byHabit };
}

function earliest(created: DateStr, done: Set<DateStr>): DateStr {
  let min = created;
  for (const d of done) if (d < min) min = d;
  return min;
}

export function lastNDays(today: DateStr, n: number): DateStr[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}
