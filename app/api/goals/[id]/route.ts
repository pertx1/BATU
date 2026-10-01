import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, notFound, parseBody, withUser } from "@/lib/api";
import { assertOwnProject } from "@/lib/data/ownership";
import { syncCurrentValue } from "@/lib/data/goals";
import { blankToNull, updateGoalSchema } from "@/lib/goal-input";
import { dateStrToDb } from "@/lib/dates";

type Params = { id: string };

export const PATCH = withUser<Params>(async (req, { userId }, { id }) => {
  const body = await parseBody(req, updateGoalSchema);
  const current = await db.goal.findFirst({ where: { id, userId } });
  if (!current) throw notFound();
  if (body.projectId !== undefined) await assertOwnProject(userId, body.projectId);

  const type = body.type ?? current.type;
  const numeric = type === "NUMERIC";
  const targetValue = body.targetValue !== undefined ? body.targetValue : current.targetValue;
  if (numeric && targetValue == null) throw new HttpError(400, "Indica la meta numérica");

  const status = body.status ?? current.status;
  await db.$transaction(async (tx) => {
    await tx.goal.update({
      where: { id, userId },
      data: {
        title: body.title,
        description: blankToNull(body.description),
        why: blankToNull(body.why),
        deadline: body.deadline === undefined ? undefined : body.deadline ? dateStrToDb(body.deadline) : null,
        projectId: body.projectId,
        type,
        startValue: numeric ? (body.startValue !== undefined ? (body.startValue ?? 0) : (current.startValue ?? 0)) : null,
        targetValue: numeric ? targetValue : null,
        unit: numeric ? blankToNull(body.unit) : null,
        status,
        achievedAt: status === "ACHIEVED" ? (current.achievedAt ?? new Date()) : null,
        // Un objetivo conseguido deja de ser el foco.
        ...(status === "ACHIEVED" ? { isFocus: false } : {}),
      },
    });
    if (numeric) await syncCurrentValue(tx, userId, id);
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = withUser<Params>(async (_req, { userId }, { id }) => {
  const res = await db.goal.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});
