import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";

const schema = z
  .object({
    title: z.string().trim().min(1).max(300),
    done: z.boolean(),
  })
  .partial();

export const PATCH = withUser<{ id: string }>(async (req, { userId }, { id }) => {
  const data = await parseBody(req, schema);
  const res = await db.subtask.updateMany({ where: { id, userId }, data });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});

export const DELETE = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  const res = await db.subtask.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});
