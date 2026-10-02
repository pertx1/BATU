import { NextResponse } from "next/server";
import { z } from "zod";
import { notFound, parseBody, withUser } from "@/lib/api";
import { saveFavorite } from "@/lib/nutrition/meal-service";

const schema = z.object({ mealId: z.string().min(1).max(40), name: z.string().trim().max(80).nullable().default(null) });

/** «Guardar como comida habitual». */
export const POST = withUser(async (req, { userId }) => {
  const { mealId, name } = await parseBody(req, schema);
  const fav = await saveFavorite(userId, mealId, name);
  if (!fav) throw notFound();
  return NextResponse.json({ id: fav.id }, { status: 201 });
});
