import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";

const schema = z.object({ focus: z.boolean() });

/** Marca (o desmarca) el objetivo como foco. Solo puede haber uno por usuario. */
export const POST = withUser<{ id: string }>(async (req, { userId }, { id }) => {
  const { focus } = await parseBody(req, schema);
  await db.$transaction(async (tx) => {
    const goal = await tx.goal.findFirst({ where: { id, userId }, select: { status: true } });
    if (!goal) throw notFound();
    if (focus) await tx.goal.updateMany({ where: { userId, isFocus: true, NOT: { id } }, data: { isFocus: false } });
    await tx.goal.update({
      where: { id, userId },
      // Marcar como foco un objetivo conseguido o pausado lo vuelve a activar.
      data: focus ? { isFocus: true, status: "ACTIVE", achievedAt: null } : { isFocus: false },
    });
  });
  return NextResponse.json({ ok: true });
});
