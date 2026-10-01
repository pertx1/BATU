import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";
import { assertOwnGoal, assertOwnProject } from "@/lib/data/ownership";
import { getTaskView } from "@/lib/data/tasks";
import { fieldsToData, taskToFields, updateTaskSchema } from "@/lib/task-input";

type Params = { id: string };

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
  await db.task.update({ where: { id, userId }, data: fieldsToData(merged, user.timezone) });
  return NextResponse.json({ ok: true });
});

export const DELETE = withUser<Params>(async (_req, { userId }, { id }) => {
  const res = await db.task.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});
