import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
import { assertOwnGoal, assertOwnProject } from "@/lib/data/ownership";
import { createTaskSchema, DEFAULT_FIELDS, fieldsToData } from "@/lib/task-input";

export const POST = withUser(async (req, { userId, user }) => {
  const body = await parseBody(req, createTaskSchema);
  await assertOwnProject(userId, body.projectId);
  await assertOwnGoal(userId, body.goalId);

  const { subtasks, ...fields } = body;
  const data = fieldsToData({ ...DEFAULT_FIELDS, ...fields }, user.timezone);
  const task = await db.task.create({
    data: {
      ...data,
      userId,
      subtasks: subtasks?.length
        ? { create: subtasks.map((title, position) => ({ userId, title, position })) }
        : undefined,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: task.id }, { status: 201 });
});
