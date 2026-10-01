import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound, withUser } from "@/lib/api";
import { ideaToTask } from "@/lib/data/ideas";

/** Convierte la idea en una tarea de la Bandeja y la quita de Ideas. */
export const POST = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  const task = await db.$transaction(async (tx) => {
    const idea = await tx.idea.findFirst({ where: { id, userId }, select: { text: true } });
    if (!idea) throw notFound();
    const created = await tx.task.create({ data: { userId, ...ideaToTask(idea.text) }, select: { id: true } });
    await tx.idea.delete({ where: { id, userId } });
    return created;
  });
  return NextResponse.json({ ok: true, taskId: task.id }, { status: 201 });
});
