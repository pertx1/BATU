import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";
import { todayStr } from "@/lib/dates";
import { nextHabitReminderAt } from "@/lib/schedule";
import { habitSchema } from "@/lib/schemas";

export const PATCH = withUser<{ id: string }>(async (req, { userId, user }, { id }) => {
  const body = await parseBody(req, habitSchema.partial());
  const current = await db.habit.findFirst({ where: { id, userId } });
  if (!current) throw notFound();

  const daysOfWeek = body.daysOfWeek ?? current.daysOfWeek;
  const reminderTime = body.reminderTime !== undefined ? body.reminderTime : current.reminderTime;
  await db.habit.update({
    where: { id, userId },
    data: {
      name: body.name,
      emoji: body.emoji === undefined ? undefined : body.emoji || null,
      color: body.color,
      daysOfWeek,
      reminderTime,
      nextReminderAt: nextHabitReminderAt(daysOfWeek, reminderTime, user.timezone, todayStr(user.timezone)),
    },
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  const res = await db.habit.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});
