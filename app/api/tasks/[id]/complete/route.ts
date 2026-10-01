import { NextResponse } from "next/server";
import { notFound, withUser } from "@/lib/api";
import { completeTask } from "@/lib/data/tasks";
import { award } from "@/lib/gamification";

export const POST = withUser<{ id: string }>(async (_req, { userId, user }, { id }) => {
  const result = await completeTask(userId, id, user.timezone);
  if (!result) throw notFound();
  const gamification = await award(user, { type: "task", taskId: id, done: true });
  return NextResponse.json({ ok: true, spawnedId: result.spawnedId, gamification });
});
