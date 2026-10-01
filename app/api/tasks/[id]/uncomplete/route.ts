import { NextResponse } from "next/server";
import { notFound, withUser } from "@/lib/api";
import { uncompleteTask } from "@/lib/data/tasks";

export const POST = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  if (!(await uncompleteTask(userId, id))) throw notFound();
  return NextResponse.json({ ok: true });
});
