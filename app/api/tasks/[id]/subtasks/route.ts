import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";

const schema = z.object({ title: z.string().trim().min(1, "Escribe la subtarea").max(300) });

export const POST = withUser<{ id: string }>(async (req, { userId }, { id }) => {
  const { title } = await parseBody(req, schema);
  const task = await db.task.findFirst({ where: { id, userId }, select: { id: true } });
  if (!task) throw notFound();
  const last = await db.subtask.findFirst({
    where: { taskId: id, userId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const subtask = await db.subtask.create({
    data: { userId, taskId: id, title, position: (last?.position ?? -1) + 1 },
    select: { id: true, title: true, done: true },
  });
  return NextResponse.json(subtask, { status: 201 });
});
