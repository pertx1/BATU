import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";
import { assertOwnGoal, assertOwnProject } from "@/lib/data/ownership";
import { getTaskView } from "@/lib/data/tasks";
import { fieldsToData, taskToFields, updateTaskSchema } from "@/lib/task-input";
import { award } from "@/lib/gamification";

/** ¿Ha quedado la bandeja de entrada a cero? (logro «Bandeja vacía»). */
async function inboxZero(userId: string) {
  return (await db.task.count({ where: { userId, completedAt: null, projectId: null, dueDate: null } })) === 0;
}

type Params = { id: string };

const sameInstant = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

export const GET = withUser<Params>(async (_req, { userId, user }, { id }) => {
  const task = await getTaskView(userId, id, user.timezone);
  if (!task) throw notFound();
  return NextResponse.json(task);
});

export const PATCH = withUser<Params>(async (req, { userId, user }, { id }) => {
  const body = await parseBody(req, updateTaskSchema);
  const current = await db.task.findFirst({ where: { id, userId } });
  if (!current) throw notFound();
  if (body.projectId !== undefined) await assertOwnProject(userId, body.projectId);
  if (body.goalId !== undefined) await assertOwnGoal(userId, body.goalId);

  const merged = { ...taskToFields(current, user.timezone), ...body };
  const data = fieldsToData(merged, user.timezone);
  // Si no cambian fechas ni recordatorio, se conserva el aviso pendiente
  // (por ejemplo, uno pospuesto o uno que ya se ha enviado).
  const sameTiming =
    data.reminderMode === current.reminderMode &&
    data.reminderMinutesBefore === current.reminderMinutesBefore &&
    sameInstant(data.reminderAt, current.reminderAt) &&
    sameInstant(data.dueAt, current.dueAt) &&
    sameInstant(data.dueDate, current.dueDate);
  if (sameTiming) data.remindAt = current.remindAt;
  await db.task.update({ where: { id, userId }, data });
  const wasInbox = !current.completedAt && !current.projectId && !current.dueDate;
  const gamification =
    wasInbox && (data.projectId || data.dueDate) && (await inboxZero(userId))
      ? await award(user, { type: "check", inboxZero: true })
      : null;
  return NextResponse.json({ ok: true, gamification });
});

export const DELETE = withUser<Params>(async (_req, { userId, user }, { id }) => {
  const current = await db.task.findFirst({ where: { id, userId }, select: { completedAt: true, projectId: true, dueDate: true } });
  const res = await db.task.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw notFound();
  const wasInbox = current && !current.completedAt && !current.projectId && !current.dueDate;
  const gamification = wasInbox && (await inboxZero(userId)) ? await award(user, { type: "check", inboxZero: true }) : null;
  return NextResponse.json({ ok: true, gamification });
});
