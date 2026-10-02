import { after, NextResponse } from "next/server";
import { z } from "zod";
import { notFound, parseBody, withUser } from "@/lib/api";
import { reestimateMeal } from "@/lib/nutrition/meal-service";

export const maxDuration = 60;

const schema = z.object({ correction: z.string().trim().max(500, "La corrección es demasiado larga").nullable().default(null) });

/** Vuelve a estimar con la IA (con una corrección opcional: «era media ración», «sin salsa»…). */
export const POST = withUser<{ id: string }>(async (req, { user }, { id }) => {
  const { correction } = await parseBody(req, schema);
  const job = await reestimateMeal(user, id, correction || null);
  if (!job) throw notFound();
  after(job.run);
  return NextResponse.json({ ok: true, estimating: true });
});
