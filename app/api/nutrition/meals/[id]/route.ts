import { NextResponse } from "next/server";
import { z } from "zod";
import { notFound, parseBody, withUser } from "@/lib/api";
import { award } from "@/lib/gamification";
import { cleanFoods, foodInputSchema } from "@/lib/nutrition/estimate";
import { MEAL_TYPES } from "@/lib/nutrition/meals";
import { deleteMeal, updateMeal } from "@/lib/nutrition/meal-service";

const scale = z.number().int().min(1).max(5).nullable().optional();

const schema = z.object({
  name: z.string().trim().max(80).nullable().optional(),
  type: z.enum(MEAL_TYPES as [string, ...string[]]).optional(),
  minutes: z.number().int().min(0).max(1439).optional(),
  hungerBefore: scale,
  fullnessAfter: scale,
  foods: z.array(foodInputSchema).max(30, "Demasiados alimentos").optional(),
});

/** Corrige una comida: nombre, tipo, hora, hambre/saciedad o los alimentos. */
export const PATCH = withUser<{ id: string }>(async (req, { user }, { id }) => {
  const body = await parseBody(req, schema);
  const day = await updateMeal(user, id, {
    ...body,
    type: body.type as never,
    foods: body.foods ? cleanFoods(body.foods) : undefined,
  });
  if (!day) throw notFound();
  // Hambre/saciedad o alimentos nuevos pueden dar XP (nunca se quitan).
  const touches = body.hungerBefore !== undefined || body.fullnessAfter !== undefined || body.foods !== undefined;
  const gamification = touches ? await award(user, { type: "food", day, mealId: id }) : null;
  return NextResponse.json({ ok: true, gamification });
});

/** Borra una comida (y su foto). */
export const DELETE = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  if (!(await deleteMeal(userId, id))) throw notFound();
  return NextResponse.json({ ok: true });
});
