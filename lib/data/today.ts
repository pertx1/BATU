import "server-only";
import { db } from "@/lib/db";
import { dateStrToDb, type DateStr, localMinutes } from "@/lib/dates";
import { goalProgress } from "@/lib/goals";
import { listHabitViews } from "@/lib/data/habits";
import { taskInclude, taskOrder, toTaskView } from "@/lib/data/tasks";

export type TodayEvent = {
  id: string;
  title: string;
  allDay: boolean;
  start: number | null; // minutos locales
  end: number | null;
  location: string | null;
  color: string | null;
};

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
      include: { project: { select: { color: true } } },
      orderBy: [{ allDay: "desc" }, { startAt: "asc" }],
    }),
    db.goal.findFirst({
      where: { userId, isFocus: true },
      include: {
        milestones: { select: { doneAt: true } },
        tasks: { select: { completedAt: true } },
      },
    }),
  ]);

  const tasks = todayRaw.map((t) => toTaskView(t, timeZone));
  // Pendientes primero; dentro, por hora y prioridad (ya vienen ordenadas).
  tasks.sort((a, b) => Number(!!a.completedAt) - Number(!!b.completedAt));
  const habits = habitData.habits.filter((h) => h.scheduledToday || h.doneToday);

  const events: TodayEvent[] = eventsRaw.map((e) => ({
    id: e.id,
    title: e.title,
    allDay: e.allDay,
    // Un evento de varios días muestra hora solo el día en que empieza o termina.
    start: !e.allDay && e.startAt && dateStrToDb(today).getTime() === e.startDate.getTime() ? localMinutes(e.startAt, timeZone) : null,
    end: !e.allDay && e.endAt && dateStrToDb(today).getTime() === e.endDate.getTime() ? localMinutes(e.endAt, timeZone) : null,
    location: e.location,
    color: e.project?.color ?? null,
  }));

  let focus: FocusGoal | null = null;
  if (focusRaw) {
    const milestonesDone = focusRaw.milestones.filter((m) => m.doneAt).length;
    const tasksDone = focusRaw.tasks.filter((t) => t.completedAt).length;
    const progress = goalProgress({
      ...focusRaw,
      milestonesDone,
      milestonesTotal: focusRaw.milestones.length,
      tasksDone,
      tasksTotal: focusRaw.tasks.length,
    });
    const label =
      focusRaw.type === "NUMERIC"
        ? `${fmt(focusRaw.currentValue ?? focusRaw.startValue ?? 0)} / ${fmt(focusRaw.targetValue ?? 0)}${focusRaw.unit ? ` ${focusRaw.unit}` : ""}`
        : focusRaw.type === "MILESTONES"
          ? `${milestonesDone} de ${focusRaw.milestones.length} hitos`
          : `${tasksDone} de ${focusRaw.tasks.length} tareas`;
    focus = { id: focusRaw.id, title: focusRaw.title, progress, label };
  }

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

function fmt(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(n);
}
