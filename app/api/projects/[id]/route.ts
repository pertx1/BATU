import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";
import { projectSchema } from "@/lib/schemas";

export const PATCH = withUser<{ id: string }>(async (req, { userId }, { id }) => {
  const body = await parseBody(req, projectSchema.partial());
  const res = await db.project.updateMany({
    where: { id, userId },
    data: { ...body, emoji: body.emoji === undefined ? undefined : body.emoji || null },
  });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});

// Las tareas, eventos y objetivos del proyecto se conservan (quedan sin proyecto).
export const DELETE = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  const res = await db.project.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});
