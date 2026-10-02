import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, withUser } from "@/lib/api";
import { todayStr } from "@/lib/dates";
import { ageFromBirthYear } from "@/lib/nutrition/calc";
import { currentYear, saveProfile } from "@/lib/nutrition/profile";
import { syncWeightGoal, weighIns } from "@/lib/nutrition/weight-service";
import { weightSummary } from "@/lib/nutrition/weight";

/**
 * «Recalcular» desde la propuesta de Antola: el mismo plan con el peso de la
 * tendencia actual (los datos personales y el objetivo no cambian).
 */
export const POST = withUser(async (_req, { user }) => {
  const p = await db.nutritionProfile.findUnique({ where: { userId: user.id } });
  if (!p) throw new HttpError(409, "Antes, completa el cuestionario de Comida");
  const today = todayStr(user.timezone);
  const { current } = weightSummary(await weighIns(user.id, today), today);
  if (current == null) throw new HttpError(409, "Aún no hay pesajes con los que recalcular");
  const { plan } = await saveProfile(
    user,
    {
      sex: p.sex,
      age: ageFromBirthYear(p.birthYear, currentYear(user.timezone)),
      heightCm: p.heightCm,
      weightKg: current,
      activity: p.activity,
      goal: p.goal,
      pace: p.pace,
      targetWeightKg: p.targetWeightKg,
    },
    { firstWeighIn: false },
  );
  await syncWeightGoal(user);
  return NextResponse.json({ ok: true, plan: { kcal: plan.kcal, proteinG: plan.proteinG, carbsG: plan.carbsG, fatG: plan.fatG } });
});
