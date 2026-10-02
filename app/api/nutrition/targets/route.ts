import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, parseBody, withUser } from "@/lib/api";
import { ageFromBirthYear, computePlan, manualTargetsError } from "@/lib/nutrition/calc";
import { currentYear } from "@/lib/nutrition/profile";

const grams = z.number().finite().min(0).max(800);

const schema = z.object({
  // null = volver a los objetivos calculados.
  manual: z
    .object({
      kcal: z.number().int().min(0).max(10000),
      proteinG: grams,
      carbsG: grams,
      fatG: grams,
      fiberG: grams,
      waterMl: z.number().int().min(0).max(10000),
    })
    .nullable(),
});

/** Objetivos a mano (con los límites de seguridad) o volver a los calculados. */
export const PUT = withUser(async (req, { user }) => {
  const { manual } = await parseBody(req, schema);
  const p = await db.nutritionProfile.findUnique({ where: { userId: user.id } });
  if (!p) throw new HttpError(409, "Antes, completa el cuestionario de Comida");
  if (manual) {
    const t = { ...manual, proteinG: Math.round(manual.proteinG), carbsG: Math.round(manual.carbsG), fatG: Math.round(manual.fatG), fiberG: Math.round(manual.fiberG) };
    const err = manualTargetsError(t, p.bmr);
    if (err) throw new HttpError(400, err);
    await db.nutritionProfile.update({
      where: { userId: user.id },
      data: { manualTargets: true, kcalTarget: t.kcal, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG, fiberG: t.fiberG, waterMl: t.waterMl },
    });
  } else {
    const plan = computePlan({
      sex: p.sex,
      age: ageFromBirthYear(p.birthYear, currentYear(user.timezone)),
      heightCm: p.heightCm,
      weightKg: p.weightAtCalc,
      activity: p.activity,
      goal: p.goal,
      pace: p.pace,
      targetWeightKg: p.targetWeightKg,
    });
    await db.nutritionProfile.update({
      where: { userId: user.id },
      data: {
        manualTargets: false,
        kcalTarget: plan.kcal,
        proteinG: plan.proteinG,
        carbsG: plan.carbsG,
        fatG: plan.fatG,
        fiberG: plan.fiberG,
        waterMl: plan.waterMl,
      },
    });
  }
  return NextResponse.json({ ok: true });
});
