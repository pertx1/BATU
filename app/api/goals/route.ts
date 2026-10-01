import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
import { assertOwnProject } from "@/lib/data/ownership";
import { blankToNull, createGoalSchema } from "@/lib/goal-input";
import { dateStrToDb } from "@/lib/dates";

export const POST = withUser(async (req, { userId }) => {
  const body = await parseBody(req, createGoalSchema);
  await assertOwnProject(userId, body.projectId);
  const numeric = body.type === "NUMERIC";
  const goal = await db.goal.create({
    data: {
      userId,
      title: body.title,
      description: blankToNull(body.description),
      why: blankToNull(body.why),
      deadline: body.deadline ? dateStrToDb(body.deadline) : null,
      projectId: body.projectId ?? null,
      type: body.type,
      startValue: numeric ? (body.startValue ?? 0) : null,
      currentValue: numeric ? (body.startValue ?? 0) : null,
      targetValue: numeric ? body.targetValue : null,
      unit: numeric ? blankToNull(body.unit) : null,
      milestones: {
        create: (body.type === "MILESTONES" ? (body.milestones ?? []) : []).map((title, position) => ({
          userId,
          title,
          position,
        })),
      },
    },
    select: { id: true },
  });
  return NextResponse.json(goal, { status: 201 });
});
