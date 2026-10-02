import { NextResponse } from "next/server";
import { notFound, withUser } from "@/lib/api";
import { deleteMeal } from "@/lib/nutrition/meal-service";

/** Borra una comida (y su foto). */
export const DELETE = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  if (!(await deleteMeal(userId, id))) throw notFound();
  return NextResponse.json({ ok: true });
});
