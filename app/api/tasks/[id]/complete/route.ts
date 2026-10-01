import { NextResponse } from "next/server";
import { notFound, withUser } from "@/lib/api";
import { completeTask } from "@/lib/data/tasks";

export const POST = withUser<{ id: string }>(async (_req, { userId, user }, { id }) => {
  const result = await completeTask(userId, id, user.timezone);
  if (!result) throw notFound();
  return NextResponse.json({ ok: true, spawnedId: result.spawnedId });
});
