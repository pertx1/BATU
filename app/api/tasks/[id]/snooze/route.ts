import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";

const schema = z.object({ minutes: z.union([z.literal(15), z.literal(60)]) });

/** Posponer: vuelve a avisar dentro de 15 min o 1 h. */
export const POST = withUser<{ id: string }>(async (req, { userId }, { id }) => {
  const { minutes } = await parseBody(req, schema);
  const remindAt = new Date(Date.now() + minutes * 60_000);
  const res = await db.task.updateMany({ where: { id, userId, completedAt: null }, data: { remindAt } });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true, remindAt: remindAt.toISOString() });
});
