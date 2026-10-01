import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";
import { milestoneSchema } from "@/lib/goal-input";

export const POST = withUser<{ id: string }>(async (req, { userId }, { id }) => {
  const { title } = await parseBody(req, milestoneSchema);
  const goal = await db.goal.findFirst({ where: { id, userId }, select: { id: true } });
  if (!goal) throw notFound();
  const last = await db.goalMilestone.findFirst({
    where: { goalId: id, userId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const m = await db.goalMilestone.create({
    data: { userId, goalId: id, title, position: (last?.position ?? -1) + 1 },
    select: { id: true, title: true },
  });
  return NextResponse.json({ ...m, done: false }, { status: 201 });
});
