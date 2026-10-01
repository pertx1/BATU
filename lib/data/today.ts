import "server-only";
import { db } from "@/lib/db";
import { dateStrToDb, type DateStr } from "@/lib/dates";
import { toEventView } from "@/lib/data/calendar";
import { goalInclude, toGoalView } from "@/lib/data/goals";
import { listHabitViews } from "@/lib/data/habits";
import { taskInclude, taskOrder, toTaskView } from "@/lib/data/tasks";

export type FocusGoal = {
  id: string;
  title: string;
  progress: number;
  label: string;
};

export async function getTodayData(userId: string, timeZone: string, today: DateStr) {
  const todayDb = dateStrToDb(today);

  const [overdueRaw, todayRaw, habitData, eventsRaw, focusRaw] = await Promise.all([
    db.task.findMany({
      where: { userId, completedAt: null, dueDate: { lt: todayDb } },
      include: taskInclude,
      orderBy: taskOrder,
      take: 100,
    }),
    db.task.findMany({
      where: { userId, dueDate: todayDb },
      include: taskInclude,
      orderBy: taskOrder,
    }),
    listHabitViews(userId, timeZone, today),
    db.event.findMany({
      where: { userId, startDate: { lte: todayDb }, endDate: { gte: todayDb } },
      include: { project: { select: { id: true, name: true, color: true, emoji: true } } },
      orderBy: [{ allDay: "desc" }, { startAt: "asc" }],
    }),
    db.goal.findFirst({ where: { userId, isFocus: true }, include: goalInclude }),
  ]);

  const tasks = todayRaw.map((t) => toTaskView(t, timeZone));
  // Pendientes primero; dentro, por hora y prioridad (ya vienen ordenadas).
  tasks.sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt));
  const habits = habitData.habits.filter((h) => h.scheduledToday || h.doneToday);

  const events = eventsRaw.map((e) => toEventView(e, timeZone));

  const focusView = focusRaw ? toGoalView(focusRaw) : null;
  const focus: FocusGoal | null = focusView
    ? { id: focusView.id, title: focusView.title, progress: focusView.progress, label: focusView.label }
    : null;

  const total = tasks.length + habits.length;
  const done = tasks.filter((t) => t.completedAt).length + habits.filter((h) => h.doneToday).length;

  return {
    overdue: overdueRaw.map((t) => toTaskView(t, timeZone)),
    tasks,
    habits,
    events,
    focus,
    progress: { total, done },
  };
}

