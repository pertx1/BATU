import { NextResponse } from "next/server";
import { notFound, withUser } from "@/lib/api";
import { uncompleteTask } from "@/lib/data/tasks";
import { award } from "@/lib/gamification";

export const POST = withUser<{ id: string }>(async (_req, { userId, user }, { id }) => {
  if (!(await uncompleteTask(userId, id))) throw notFound();
  // Desmarcar resta los XP que dio.
  const gamification = await award(user, { type: "task", taskId: id, done: false });
  return NextResponse.json({ ok: true, gamification });
});
