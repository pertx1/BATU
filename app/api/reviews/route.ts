import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, parseBody, withUser } from "@/lib/api";
import { pendingWhere, weekRange } from "@/lib/data/review";
import { dateStrToDb, dayOfWeek, startOfWeekMonday, todayStr } from "@/lib/dates";
import { dateStrSchema, idSchema } from "@/lib/validation";
import { award } from "@/lib/gamification";

const schema = z.object({
  weekStart: dateStrSchema,
  nextWeekFocus: z.string().trim().max(2000).nullable(),
  notes: z.string().trim().max(5000).nullable(),
  // Pendientes que se mostraron al empezar (aunque luego se hayan reprogramado)
  pendingIds: z.array(idSchema).max(200).default([]),
});

/**
 * Guarda (o actualiza) la revisión de una semana. Los recuentos y la lista de
 * completadas los calcula el servidor; del cliente solo se aceptan los textos.
 */
export const POST = withUser(async (req, { userId, user }) => {
  const body = await parseBody(req, schema);
  if (dayOfWeek(body.weekStart) !== 1) throw new HttpError(400, "La semana debe empezar en lunes");
  if (body.weekStart > startOfWeekMonday(todayStr(user.timezone))) {
    throw new HttpError(400, "No puedes revisar una semana futura");
  }

  const { start, end } = weekRange(body.weekStart, user.timezone);
  const [completed, shownPending, stillPending] = await Promise.all([
    db.task.findMany({
      where: { userId, completedAt: { gte: start, lt: end } },
      orderBy: { completedAt: "asc" },
      select: { title: true },
      take: 200,
    }),
    // Las que el usuario vio pendientes y siguen sin hacer (también si las movió).
    db.task.count({ where: { userId, id: { in: body.pendingIds }, completedAt: null } }),
    db.task.count({ where: pendingWhere(userId, body.weekStart) }),
  ]);

  const data = {
    completedCount: completed.length,
    pendingCount: Math.max(shownPending, stillPending),
    completedItems: completed.map((t) => t.title),
    nextWeekFocus: body.nextWeekFocus || null,
    notes: body.notes || null,
  };
  const review = await db.weeklyReview.upsert({
    where: { userId_weekStart: { userId, weekStart: dateStrToDb(body.weekStart) } },
    create: { userId, weekStart: dateStrToDb(body.weekStart), ...data },
    update: data,
    select: { id: true },
  });
  // 50 XP una sola vez por semana revisada (actualizarla no suma de nuevo).
  const gamification = await award(user, { type: "review", weekStart: body.weekStart });
  return NextResponse.json({ ...review, gamification });
});
