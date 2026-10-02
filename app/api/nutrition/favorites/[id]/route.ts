import { NextResponse } from "next/server";
import { notFound, withUser } from "@/lib/api";
import { deleteFavorite } from "@/lib/nutrition/meal-service";

export const DELETE = withUser<{ id: string }>(async (_req, { userId }, { id }) => {
  if (!(await deleteFavorite(userId, id))) throw notFound();
  return NextResponse.json({ ok: true });
});
