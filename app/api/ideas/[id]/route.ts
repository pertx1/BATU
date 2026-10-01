import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";

const schema = z.object({
  text: z.string().trim().min(1, "Escribe la idea").max(5000).optional(),
  pinned: z.boolean().optional(),
});

export const PATCH = withUser<{ id: string }>(async (req, { userId }, { id }) => {
  const body = await parseBody(req, schema);
  const res = await db.idea.updateMany({ where: { id, userId }, data: body });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});

export const DELETE = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  const res = await db.idea.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});
