import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";
import { award } from "@/lib/gamification";

const schema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  done: z.boolean().optional(),
});

export const PATCH = withUser<{ id: string }>(async (req, { userId, user }, { id }) => {
  const body = await parseBody(req, schema);
  const res = await db.goalMilestone.updateMany({
    where: { id, userId },
    data: { title: body.title, ...(body.done !== undefined ? { doneAt: body.done ? new Date() : null } : {}) },
  });
  if (res.count === 0) throw notFound();
  const gamification =
    body.done !== undefined ? await award(user, { type: "milestone", milestoneId: id, done: body.done }) : null;
  return NextResponse.json({ ok: true, gamification });
});

export const DELETE = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  const res = await db.goalMilestone.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});
