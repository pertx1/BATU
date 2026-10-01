import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
import { habitSchema } from "@/lib/schemas";
import { todayStr } from "@/lib/dates";
import { nextHabitReminderAt } from "@/lib/schedule";

export const POST = withUser(async (req, { userId, user }) => {
  const body = await parseBody(req, habitSchema);
  const last = await db.habit.findFirst({
    where: { userId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const habit = await db.habit.create({
    data: {
      userId,
      name: body.name,
      emoji: body.emoji || null,
      color: body.color ?? null,
      daysOfWeek: body.daysOfWeek,
      reminderTime: body.reminderTime,
      nextReminderAt: nextHabitReminderAt(
        body.daysOfWeek,
        body.reminderTime,
        user.timezone,
        todayStr(user.timezone),
      ),
      position: (last?.position ?? -1) + 1,
    },
    select: { id: true },
  });
  return NextResponse.json(habit, { status: 201 });
});
