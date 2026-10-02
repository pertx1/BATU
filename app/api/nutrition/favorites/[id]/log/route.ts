import { NextResponse } from "next/server";
import { z } from "zod";
import { notFound, parseBody, withUser } from "@/lib/api";
import { award } from "@/lib/gamification";
import { isDateStr, localMinutes, todayStr } from "@/lib/dates";
import { logFavorite } from "@/lib/nutrition/meal-service";

const schema = z.object({
  day: z.string().refine(isDateStr, "Fecha no válida").optional(),
  minutes: z.number().int().min(0).max(1439).optional(),
});

/** Registra una comida habitual con un toque (sin volver a llamar a la IA). */
export const POST = withUser<{ id: string }>(async (req, { user }, { id }) => {
  const body = await parseBody(req, schema);
  const day = body.day ?? todayStr(user.timezone);
  const meal = await logFavorite(user, id, {
    day,
    minutes: body.minutes ?? localMinutes(new Date(), user.timezone),
  });
  if (!meal) throw notFound();
  const gamification = await award(user, { type: "food", day, mealId: meal.id });
  return NextResponse.json({ id: meal.id, gamification }, { status: 201 });
});
