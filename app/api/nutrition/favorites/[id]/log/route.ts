import { NextResponse } from "next/server";
import { z } from "zod";
import { notFound, parseBody, withUser } from "@/lib/api";
import { isDateStr, localMinutes, todayStr } from "@/lib/dates";
import { logFavorite } from "@/lib/nutrition/meal-service";

const schema = z.object({
  day: z.string().refine(isDateStr, "Fecha no válida").optional(),
  minutes: z.number().int().min(0).max(1439).optional(),
});

/** Registra una comida habitual con un toque (sin volver a llamar a la IA). */
export const POST = withUser<{ id: string }>(async (req, { user }, { id }) => {
  const body = await parseBody(req, schema);
  const meal = await logFavorite(user, id, {
    day: body.day ?? todayStr(user.timezone),
    minutes: body.minutes ?? localMinutes(new Date(), user.timezone),
  });
  if (!meal) throw notFound();
  return NextResponse.json({ id: meal.id }, { status: 201 });
});
