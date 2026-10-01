import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound, withUser } from "@/lib/api";
import { syncCurrentValue } from "@/lib/data/goals";

export const DELETE = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  await db.$transaction(async (tx) => {
    const log = await tx.goalProgressLog.findFirst({ where: { id, userId }, select: { goalId: true } });
    if (!log) throw notFound();
    await tx.goalProgressLog.delete({ where: { id } });
    await syncCurrentValue(tx, userId, log.goalId);
  });
  return NextResponse.json({ ok: true });
});
