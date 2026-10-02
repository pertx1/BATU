import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { addDays, dateStrToDb, todayStr } from "@/lib/dates";
import {
  computePlan,
  formatKg,
  goalHasTarget,
  goalOptions,
  MIN_AGE,
  targetWeightError,
  type Plan,
} from "@/lib/nutrition/calc";

const kg = z.number().finite().min(25).max(350);

export const planInputSchema = z.object({
  sex: z.enum(["MALE", "FEMALE", "UNSPECIFIED"]),
  age: z.number().int().min(MIN_AGE, `La edad mínima es ${MIN_AGE} años.`).max(110),
  heightCm: z.number().finite().min(100).max(250),
  weightKg: kg,
  activity: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE", "VERY_ACTIVE"]),
  goal: z.enum(["LOSE_FAT", "LOSE_WEIGHT", "MAINTAIN", "RECOMP", "GAIN_MUSCLE", "GAIN_WEIGHT"]),
  pace: z.enum(["GENTLE", "RECOMMENDED", "FAST"]).nullable(),
  targetWeightKg: kg.nullable(),
});

export type PlanInputBody = z.infer<typeof planInputSchema>;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Año actual en la zona del usuario (para guardar el año de nacimiento). */
export function currentYear(tz: string, now = new Date()) {
  return Number(todayStr(tz, now).slice(0, 4));
}

/** Valida el objetivo y el peso objetivo con los límites de seguridad y calcula el plan. */
export function planFor(body: PlanInputBody): Plan {
  const input = { ...body, weightKg: round1(body.weightKg), heightCm: Math.round(body.heightCm), targetWeightKg: body.targetWeightKg == null ? null : round1(body.targetWeightKg) };
  const option = goalOptions(input).find((o) => o.goal === input.goal);
  if (option && !option.allowed) throw new HttpError(400, option.reason ?? "Ese objetivo no está disponible.");
  const err = targetWeightError(input);
  if (err) throw new HttpError(400, err);
  return computePlan(input);
}

/**
 * Guarda el perfil de nutrición (onboarding o "Recalcular"). Todo se calcula
 * aquí; del cliente solo llegan los datos personales y el objetivo. En el
 * onboarding se guarda también el primer pesaje y se crea el objetivo "Peso".
 */
export async function saveProfile(
  user: { id: string; timezone: string },
  body: PlanInputBody,
  opts: { firstWeighIn: boolean },
  now = new Date(),
) {
  const plan = planFor(body);
  const userId = user.id;
  const today = todayStr(user.timezone, now);
  const weightKg = round1(body.weightKg);
  const target = goalHasTarget(plan.goal) ? round1(body.targetWeightKg!) : null;
  const eta = plan.weeksToTarget != null ? addDays(today, plan.weeksToTarget * 7) : null;

  const profile = await db.$transaction(async (tx) => {
    const existing = await tx.nutritionProfile.findUnique({ where: { userId }, select: { goalId: true } });
    const data = {
      sex: body.sex,
      birthYear: currentYear(user.timezone, now) - body.age,
      heightCm: Math.round(body.heightCm),
      activity: body.activity,
      goal: plan.goal,
      pace: plan.pace,
      targetWeightKg: target,
      weightAtCalc: weightKg,
      bmr: plan.bmr,
      tdee: plan.tdee,
      kcalTarget: plan.kcal,
      proteinG: plan.proteinG,
      carbsG: plan.carbsG,
      fatG: plan.fatG,
      fiberG: plan.fiberG,
      waterMl: plan.waterMl,
      manualTargets: false,
      calculatedAt: now,
    };
    if (opts.firstWeighIn) {
      await tx.weightLog.upsert({
        where: { userId_day: { userId, day: dateStrToDb(today) } },
        create: { userId, day: dateStrToDb(today), kg: weightKg },
        update: { kg: weightKg },
      });
    }

    // Objetivo "Peso" en Objetivos (solo si hay peso objetivo).
    let goalId = existing?.goalId ?? null;
    const goal = goalId ? await tx.goal.findFirst({ where: { id: goalId, userId }, select: { id: true } }) : null;
    if (target != null) {
      const title = `Llegar a ${formatKg(target)} kg`;
      if (goal) {
        await tx.goal.update({
          where: { id: goal.id, userId },
          data: { title, targetValue: target, deadline: eta ? dateStrToDb(eta) : null },
        });
      } else {
        const created = await tx.goal.create({
          data: {
            userId,
            title,
            why: "Creado desde Comida. El progreso sigue la tendencia de tus pesajes.",
            type: "WEIGHT",
            startValue: weightKg,
            currentValue: weightKg,
            targetValue: target,
            unit: "kg",
            deadline: eta ? dateStrToDb(eta) : null,
          },
          select: { id: true },
        });
        goalId = created.id;
      }
    }

    return tx.nutritionProfile.upsert({
      where: { userId },
      create: { userId, ...data, goalId },
      update: { ...data, goalId },
    });
  });
  return { profile, plan };
}
