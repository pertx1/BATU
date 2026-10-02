import "server-only";
import { db } from "@/lib/db";
import { addDays, dateStrToDb, dbToDateStr, formatTz, localMinutes, todayStr, type DateStr } from "@/lib/dates";
import { readEstimate, type Estimate } from "@/lib/nutrition/estimate";
import { aiConfigured } from "@/lib/nutrition/ai";
import { failStaleEstimates } from "@/lib/nutrition/meal-service";
import { logStreak, sumTotals, type MealType, type Totals } from "@/lib/nutrition/meals";

export type MealView = {
  id: string;
  type: MealType;
  name: string | null;
  description: string | null;
  time: string; // "14:20", hora local
  hasPhoto: boolean;
  status: "NONE" | "PENDING" | "DONE" | "FAILED";
  /** Mensaje amable si la estimación falló. */
  error: string | null;
  estimate: Estimate | null;
  hungerBefore: number | null;
  fullnessAfter: number | null;
  minutes: number; // hora local en minutos (para editarla)
  eatenAt: string; // ISO
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};

export type Targets = Totals & { waterMl: number };

export type Diary = {
  day: DateStr;
  today: DateStr;
  targets: Targets;
  totals: Totals;
  waterMl: number;
  meals: MealView[];
  streak: number;
  hideNumbers: boolean;
  aiAvailable: boolean;
  glassMl: number;
  bottleMl: number;
};

/** Días con alguna comida (para la racha): basta con los del último año. */
async function mealDays(userId: string, today: DateStr): Promise<DateStr[]> {
  const rows = await db.mealLog.findMany({
    where: { userId, day: { gte: dateStrToDb(addDays(today, -400)) } },
    select: { day: true },
    distinct: ["day"],
  });
  return rows.map((r) => dbToDateStr(r.day));
}

export async function foodStreak(userId: string, today: DateStr): Promise<number> {
  return logStreak(await mealDays(userId, today), today, addDays);
}

/** Todo lo de la pestaña Diario para un día (null si aún no hay perfil). */
export async function getDiary(user: { id: string; timezone: string }, day: DateStr, now = new Date()): Promise<Diary | null> {
  const profile = await db.nutritionProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return null;
  const today = todayStr(user.timezone, now);
  await failStaleEstimates(user.id, now);
  const [meals, water, streak] = await Promise.all([
    db.mealLog.findMany({ where: { userId: user.id, day: dateStrToDb(day) }, orderBy: { eatenAt: "desc" } }),
    db.waterLog.aggregate({ where: { userId: user.id, day: dateStrToDb(day) }, _sum: { ml: true } }),
    foodStreak(user.id, today),
  ]);
  const views: MealView[] = meals.map((m) => ({
    id: m.id,
    type: m.type,
    name: m.name,
    description: m.description,
    time: formatTz(m.eatenAt, user.timezone, "HH:mm"),
    hasPhoto: !!m.photoKey,
    status: m.status,
    error:
      m.status === "FAILED" && m.estimate && typeof m.estimate === "object" && "error" in m.estimate && typeof m.estimate.error === "string"
        ? m.estimate.error
        : null,
    estimate: readEstimate(m.estimate),
    hungerBefore: m.hungerBefore,
    fullnessAfter: m.fullnessAfter,
    minutes: localMinutes(m.eatenAt, user.timezone),
    eatenAt: m.eatenAt.toISOString(),
    kcal: m.kcal,
    proteinG: m.proteinG,
    carbsG: m.carbsG,
    fatG: m.fatG,
    fiberG: m.fiberG,
  }));
  // Lo que aún se está estimando no suma (todavía no hay números).
  const totals = sumTotals(views.filter((m) => m.status !== "PENDING"));
  return {
    day,
    today,
    targets: {
      kcal: profile.kcalTarget,
      proteinG: profile.proteinG,
      carbsG: profile.carbsG,
      fatG: profile.fatG,
      fiberG: profile.fiberG,
      waterMl: profile.waterMl,
    },
    totals,
    waterMl: water._sum.ml ?? 0,
    meals: views,
    streak,
    hideNumbers: profile.hideNumbers,
    aiAvailable: profile.aiEnabled && aiConfigured(),
    glassMl: profile.glassMl,
    bottleMl: profile.bottleMl,
  };
}

export type FoodToday = {
  kcal: number;
  kcalTarget: number;
  waterMl: number;
  waterTarget: number;
  glassMl: number;
  hideNumbers: boolean;
};

/** Tarjeta «Comida de hoy» de la pantalla Hoy (null si no hay perfil). */
export async function getFoodToday(userId: string, today: DateStr): Promise<FoodToday | null> {
  const profile = await db.nutritionProfile.findUnique({
    where: { userId },
    select: { kcalTarget: true, waterMl: true, glassMl: true, hideNumbers: true },
  });
  if (!profile) return null;
  const [meals, water] = await Promise.all([
    db.mealLog.aggregate({ where: { userId, day: dateStrToDb(today), status: { not: "PENDING" } }, _sum: { kcal: true } }),
    db.waterLog.aggregate({ where: { userId, day: dateStrToDb(today) }, _sum: { ml: true } }),
  ]);
  return {
    kcal: meals._sum.kcal ?? 0,
    kcalTarget: profile.kcalTarget,
    waterMl: water._sum.ml ?? 0,
    waterTarget: profile.waterMl,
    glassMl: profile.glassMl,
    hideNumbers: profile.hideNumbers,
  };
}
