import "server-only";
import { Prisma, type Task } from "@prisma/client";
import { db } from "@/lib/db";
import {
  addDays,
  dateStrToDb,
  dbToDateStr,
  DEFAULT_TZ,
  type DateStr,
  localDateStr,
  localMinutes,
} from "@/lib/dates";
import { currentOccurrence, nextOccurrence } from "@/lib/recurrence";
import { computeTaskTiming } from "@/lib/schedule";
import type { TaskView } from "@/lib/types";

export const taskInclude = {
  project: { select: { id: true, name: true, color: true, emoji: true } },
  subtasks: { orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, title: true, done: true } },
} satisfies Prisma.TaskInclude;

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export const taskOrder: Prisma.TaskOrderByWithRelationInput[] = [
  { dueDate: { sort: "asc", nulls: "last" } },
  { dueAt: { sort: "asc", nulls: "last" } },
  { priority: "asc" },
  { createdAt: "asc" },
];

export function toTaskView(t: TaskWithRelations, timeZone: string): TaskView {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    priority: t.priority,
    dueDate: t.dueDate ? dbToDateStr(t.dueDate) : null,
    time: t.dueAt ? localMinutes(t.dueAt, timeZone) : null,
    project: t.project,
    goalId: t.goalId,
    completedAt: t.completedAt?.toISOString() ?? null,
    recurrence: t.recurrence,
    recurrenceDays: t.recurrenceDays,
    reminderMode: t.reminderMode,
    reminderDate: t.reminderAt ? localDateStr(t.reminderAt, timeZone) : null,
    reminderTime: t.reminderAt ? localMinutes(t.reminderAt, timeZone) : null,
    reminderMinutesBefore: t.reminderMinutesBefore,
    subtasks: t.subtasks,
  };
}

export type TaskFilter =
  | { kind: "today" }
  | { kind: "week" }
  | { kind: "inbox" }
  | { kind: "nodate" }
  | { kind: "done" }
  | { kind: "project"; projectId: string };

/** Lista de tareas de un usuario según el filtro. Siempre filtra por userId. */
export async function listTasks(userId: string, timeZone: string, filter: TaskFilter, today: DateStr) {
  if (filter.kind !== "done") await rollRecurringTasks(userId, timeZone, today);
  const pending = { userId, completedAt: null };
  let where: Prisma.TaskWhereInput;
  switch (filter.kind) {
    case "today":
      where = { ...pending, dueDate: { lte: dateStrToDb(today) } };
      break;
    case "week":
      where = { ...pending, dueDate: { gte: dateStrToDb(today), lte: dateStrToDb(addDays(today, 6)) } };
      break;
    case "inbox":
      where = { ...pending, dueDate: null, projectId: null };
      break;
    case "nodate":
      where = { ...pending, dueDate: null };
      break;
    case "done":
      where = { userId, completedAt: { not: null } };
      break;
    case "project":
      where = { ...pending, projectId: filter.projectId };
      break;
  }
  const tasks = await db.task.findMany({
    where,
    include: taskInclude,
    orderBy: filter.kind === "done" ? [{ completedAt: "desc" }] : taskOrder,
    take: filter.kind === "done" ? 100 : 500,
  });
  return tasks.map((t) => toTaskView(t, timeZone));
}

export async function getTaskView(userId: string, id: string, timeZone: string) {
  const task = await db.task.findFirst({ where: { id, userId }, include: taskInclude });
  return task ? toTaskView(task, timeZone) : null;
}

/**
 * Marca una tarea como completada. Si es repetitiva crea la siguiente
 * ocurrencia; `spawnedFromId` es único, así que un doble toque no duplica.
 */
export async function completeTask(userId: string, id: string, timeZone: string, now = new Date()) {
  const task = await db.task.findFirst({ where: { id, userId }, include: { subtasks: true } });
  if (!task) return null;

  if (!task.completedAt) {
    await db.task.updateMany({ where: { id, userId, completedAt: null }, data: { completedAt: now } });
  }

  let spawnedId: string | null = null;
  if (task.recurrence !== "NONE") {
    const existing = await db.task.findFirst({
      where: { userId, spawnedFromId: task.id },
      select: { id: true },
    });
    if (existing) {
      spawnedId = existing.id;
    } else {
      const created = await spawnNext(task, timeZone, now);
      spawnedId = created?.id ?? null;
    }
  }
  return { spawnedId };
}

type TimingSource = Pick<Task, "dueAt" | "reminderMode" | "reminderAt" | "reminderMinutesBefore">;

/** Hora y aviso de una tarea trasladados de `from` a `to` (misma hora local, mismo desfase del aviso). */
function timingOn(task: TimingSource, from: DateStr, to: DateStr, timeZone: string) {
  const offsetDays = Math.round((dateStrToDb(to).getTime() - dateStrToDb(from).getTime()) / 86400000);
  return computeTaskTiming(
    {
      dueDate: to,
      time: task.dueAt ? localMinutes(task.dueAt, timeZone) : null,
      reminderMode: task.reminderMode,
      reminderDate: task.reminderAt ? addDays(localDateStr(task.reminderAt, timeZone), offsetDays) : null,
      reminderTime: task.reminderAt ? localMinutes(task.reminderAt, timeZone) : null,
      reminderMinutesBefore: task.reminderMinutesBefore,
    },
    timeZone,
  );
}

const rollSelect = {
  id: true,
  dueDate: true,
  recurrence: true,
  recurrenceDays: true,
  dueAt: true,
  reminderMode: true,
  reminderAt: true,
  reminderMinutesBefore: true,
} satisfies Prisma.TaskSelect;

/**
 * Una tarea repetitiva sin hacer no se queda atrasada: pasa a la ocurrencia
 * que toca hoy (con «cada día», a hoy), con su hora y su aviso de ese día.
 * Así cada día tienes la tarea de ese día. Comprueba la fecha anterior al
 * actualizar para no pisar un cambio simultáneo.
 */
async function rollTasks(
  tasks: (Prisma.TaskGetPayload<{ select: typeof rollSelect }> & { timeZone: string })[],
  now: Date,
): Promise<number> {
  let moved = 0;
  await Promise.all(
    tasks.map(async (t) => {
      if (!t.dueDate) return;
      const from = dbToDateStr(t.dueDate);
      const to = currentOccurrence(from, localDateStr(now, t.timeZone), t.recurrence, t.recurrenceDays);
      if (!to) return;
      const res = await db.task.updateMany({
        where: { id: t.id, completedAt: null, dueDate: t.dueDate },
        data: timingOn(t, from, to, t.timeZone),
      });
      moved += res.count;
    }),
  );
  return moved;
}

const overdueRecurring = (before: Date) =>
  ({ completedAt: null, recurrence: { not: "NONE" }, dueDate: { lt: before } }) satisfies Prisma.TaskWhereInput;

/** Pone al día las tareas repetitivas atrasadas de un usuario (al abrir Hoy o Tareas). */
export async function rollRecurringTasks(userId: string, timeZone: string, today: DateStr, now = new Date()) {
  const tasks = await db.task.findMany({
    where: { userId, ...overdueRecurring(dateStrToDb(today)) },
    select: rollSelect,
    take: 200,
  });
  if (!tasks.length) return 0;
  return rollTasks(tasks.map((t) => ({ ...t, timeZone })), now);
}

/** Lo mismo para todos los usuarios (limpieza horaria del cron), para que el aviso del día llegue aunque no abras la app. */
export async function rollAllRecurringTasks(now = new Date()) {
  // Mañana en UTC cubre cualquier zona horaria; luego se afina con la de cada usuario.
  const tasks = await db.task.findMany({
    where: { ...overdueRecurring(dateStrToDb(addDays(localDateStr(now, "UTC"), 1))), user: { disabledAt: null } },
    select: { ...rollSelect, user: { select: { settings: { select: { timezone: true } } } } },
    take: 2000,
  });
  return rollTasks(
    tasks.map(({ user, ...t }) => ({ ...t, timeZone: user.settings?.timezone ?? DEFAULT_TZ })),
    now,
  );
}

async function spawnNext(
  task: Task & { subtasks: { title: string; position: number }[] },
  timeZone: string,
  now: Date,
) {
  const today = localDateStr(now, timeZone);
  const base = task.dueDate ? dbToDateStr(task.dueDate) : today;
  const next = nextOccurrence(base, today, task.recurrence, task.recurrenceDays);
  if (!next) return null;

  const timing = timingOn(task, base, next, timeZone);

  try {
    return await db.task.create({
      data: {
        userId: task.userId,
        projectId: task.projectId,
        goalId: task.goalId,
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        recurrence: task.recurrence,
        recurrenceDays: task.recurrenceDays,
        seriesId: task.seriesId ?? task.id,
        spawnedFromId: task.id,
        ...timing,
        subtasks: {
          create: task.subtasks.map((s) => ({ userId: task.userId, title: s.title, position: s.position })),
        },
      },
      select: { id: true },
    });
  } catch (err) {
    // Otra petición simultánea ya creó la siguiente ocurrencia.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return db.task.findFirst({ where: { userId: task.userId, spawnedFromId: task.id }, select: { id: true } });
    }
    throw err;
  }
}

/** Deshace el completado y borra la ocurrencia generada si no se ha tocado. */
export async function uncompleteTask(userId: string, id: string) {
  const res = await db.task.updateMany({ where: { id, userId }, data: { completedAt: null } });
  if (res.count === 0) return false;
  await db.task.deleteMany({ where: { userId, spawnedFromId: id, completedAt: null } });
  return true;
}
