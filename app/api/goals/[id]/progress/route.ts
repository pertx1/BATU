import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, notFound, parseBody, withUser } from "@/lib/api";
import { syncCurrentValue } from "@/lib/data/goals";
import { blankToNull, progressSchema } from "@/lib/goal-input";
import { dateStrToDb, todayStr } from "@/lib/dates";

/** Registra el valor de un objetivo numérico en una fecha. */
export const POST = withUser<{ id: string }>(async (req, { userId, user }, { id }) => {
  const body = await parseBody(req, progressSchema);
  if (body.date > todayStr(user.timezone)) throw new HttpError(400, "No puedes registrar valores en el futuro");
  const goal = await db.goal.findFirst({ where: { id, userId }, select: { type: true } });
  if (!goal) throw notFound();
  if (goal.type !== "NUMERIC") throw new HttpError(400, "Este objetivo no es numérico");

  const log = await db.$transaction(async (tx) => {
    const created = await tx.goalProgressLog.create({
      data: { userId, goalId: id, value: body.value, date: dateStrToDb(body.date), note: blankToNull(body.note) ?? null },
      select: { id: true },
    });
    await syncCurrentValue(tx, userId, id);
    return created;
  });
  return NextResponse.json(log, { status: 201 });
});
