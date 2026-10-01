import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, notFound, parseBody, withUser } from "@/lib/api";
import { dateStrToDb, todayStr } from "@/lib/dates";
import { dateStrSchema } from "@/lib/validation";
import { award } from "@/lib/gamification";

const schema = z.object({ date: dateStrSchema.optional(), done: z.boolean() });

// Marca o desmarca un hábito en un día (por defecto, hoy en la zona del usuario).
export const POST = withUser<{ id: string }>(async (req, { userId, user }, { id }) => {
  const body = await parseBody(req, schema);
  const today = todayStr(user.timezone);
  const date = body.date ?? today;
  if (date > today) throw new HttpError(400, "No puedes marcar días futuros");

  const habit = await db.habit.findFirst({ where: { id, userId }, select: { id: true } });
  if (!habit) throw notFound();

  const dbDate = dateStrToDb(date);
  if (body.done) {
    await db.habitLog.upsert({
      where: { habitId_date: { habitId: id, date: dbDate } },
      create: { userId, habitId: id, date: dbDate },
      update: {},
    });
  } else {
    await db.habitLog.deleteMany({ where: { userId, habitId: id, date: dbDate } });
  }
  const gamification = await award(user, { type: "habit", habitId: id, date, done: body.done });
  return NextResponse.json({ ok: true, date, done: body.done, gamification });
});
