import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withUser } from "@/lib/api";

/** Cierra la sesión en todos los demás dispositivos. */
export const DELETE = withUser(async (_req, { userId, sessionId }) => {
  const res = await db.session.deleteMany({ where: { userId, NOT: { id: sessionId } } });
  return NextResponse.json({ ok: true, closedSessions: res.count });
});
