import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound, withUser } from "@/lib/api";

/** Deshacer un registro de agua. */
export const DELETE = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  const res = await db.waterLog.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});
