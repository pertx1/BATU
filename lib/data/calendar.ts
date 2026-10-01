import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, dateStrToDb, dbToDateStr, type DateStr, localMinutes } from "@/lib/dates";
import { taskInclude, toTaskView } from "@/lib/data/tasks";
import type { EventView, TaskView } from "@/lib/types";

const eventInclude = {
  project: { select: { id: true, name: true, color: true, emoji: true } },
} satisfies Prisma.EventInclude;

type EventWithProject = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

export function toEventView(e: EventWithProject, timeZone: string): EventView {
  return {
    id: e.id,
    title: e.title,
    allDay: e.allDay,
    startDate: dbToDateStr(e.startDate),
    endDate: dbToDateStr(e.endDate),
    start: e.startAt ? localMinutes(e.startAt, timeZone) : null,
    end: e.endAt ? localMinutes(e.endAt, timeZone) : null,
    location: e.location,
    notes: e.notes,
    project: e.project,
    reminderMinutesBefore: e.reminderMinutesBefore,
  };
}

export async function getEventView(userId: string, id: string, timeZone: string) {
  const e = await db.event.findFirst({ where: { id, userId }, include: eventInclude });
  return e ? toEventView(e, timeZone) : null;
}

export type DayItems = { events: EventView[]; tasks: TaskView[] };

/** Tareas y eventos del usuario entre `from` y `to` (incluidos), agrupados por día. */
export async function getCalendarRange(userId: string, timeZone: string, from: DateStr, to: DateStr) {
  const fromDb = dateStrToDb(from);
  const toDb = dateStrToDb(to);
  const [events, tasks] = await Promise.all([
    db.event.findMany({
      where: { userId, startDate: { lte: toDb }, endDate: { gte: fromDb } },
      include: eventInclude,
      orderBy: [{ allDay: "desc" }, { startAt: "asc" }, { createdAt: "asc" }],
    }),
    db.task.findMany({
      where: { userId, dueDate: { gte: fromDb, lte: toDb } },
      include: taskInclude,
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const days = new Map<DateStr, DayItems>();
  for (let d = from; d <= to; d = addDays(d, 1)) days.set(d, { events: [], tasks: [] });

  for (const raw of events) {
    const e = toEventView(raw, timeZone);
    const start = e.startDate < from ? from : e.startDate;
    const end = e.endDate > to ? to : e.endDate;
    for (let d = start; d <= end; d = addDays(d, 1)) days.get(d)?.events.push(e);
  }
  for (const raw of tasks) {
    const t = toTaskView(raw, timeZone);
    if (t.dueDate) days.get(t.dueDate)?.tasks.push(t);
  }
  return days;
}

/** Colores (máx. 4) para los puntos de un día: proyecto de cada tarea/evento. */
export function dayDots(items: DayItems | undefined): string[] {
  if (!items) return [];
  const colors: string[] = [];
  for (const e of items.events) colors.push(e.project?.color ?? "var(--accent)");
  for (const t of items.tasks) if (!t.completedAt) colors.push(t.project?.color ?? "var(--muted)");
  return Array.from(new Set(colors)).slice(0, 4);
}
