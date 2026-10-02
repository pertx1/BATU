import "server-only";
import { db } from "@/lib/db";
import { addDays, dateStrToDb, dbToDateStr, localMinutes, startOfWeekMonday, todayStr, type DateStr } from "@/lib/dates";
import {
  average,
  bestStreak,
  consistencyGrid,
  daysForAverage,
  hungerAnalysis,
  lastDays,
  macroSplit,
  toBars,
  type Bar,
  type HeatCell,
  type HungerAnalysis,
  type MacroSplit,
} from "@/lib/nutrition/analysis";
import { logStreak, sumTotals, type Totals } from "@/lib/nutrition/meals";

const HEATMAP_WEEKS = 13;

export type Analysis = {
  today: DateStr;
  rangeDays: number;
  hideNumbers: boolean;
  streak: { current: number; best: number };
  heatmap: HeatCell[][];
  /** Días del periodo con alguna comida. */
  loggedDays: number;
  calories: { bars: Bar[]; average: number | null; target: number };
  macros: { average: Totals | null; target: Totals; split: MacroSplit | null; targetSplit: MacroSplit | null };
  water: { bars: Bar[]; average: number | null; target: number; goalDays: number; days: number };
  hunger: HungerAnalysis;
};

/** Todo lo de la pestaña Análisis para los últimos `rangeDays` días (null sin perfil). */
export async function getAnalysis(user: { id: string; timezone: string }, rangeDays: number, now = new Date()): Promise<Analysis | null> {
  const profile = await db.nutritionProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return null;
  const today = todayStr(user.timezone, now);
  const days = lastDays(today, rangeDays, addDays);
  const from = dateStrToDb(days[0]);
  const heatFrom = addDays(startOfWeekMonday(today), -(HEATMAP_WEEKS - 1) * 7);

  const [meals, water, allDays, heatCounts, firstRated] = await Promise.all([
    db.mealLog.findMany({
      where: { userId: user.id, day: { gte: from }, status: { not: "PENDING" } },
      select: { day: true, eatenAt: true, type: true, kcal: true, proteinG: true, carbsG: true, fatG: true, fiberG: true, hungerBefore: true, fullnessAfter: true },
    }),
    db.waterLog.groupBy({ by: ["day"], where: { userId: user.id, day: { gte: from } }, _sum: { ml: true } }),
    db.mealLog.findMany({ where: { userId: user.id }, select: { day: true }, distinct: ["day"] }),
    db.mealLog.groupBy({ by: ["day"], where: { userId: user.id, day: { gte: dateStrToDb(heatFrom) } }, _count: { _all: true } }),
    db.mealLog.findFirst({
      where: { userId: user.id, OR: [{ hungerBefore: { not: null } }, { fullnessAfter: { not: null } }] },
      orderBy: { day: "asc" },
      select: { day: true },
    }),
  ]);

  // Totales por día del periodo.
  const byDay = new Map<DateStr, Totals[]>();
  for (const m of meals) {
    const d = dbToDateStr(m.day);
    byDay.set(d, [...(byDay.get(d) ?? []), m]);
  }
  const dayTotals = new Map([...byDay].map(([d, ms]) => [d, sumTotals(ms)]));
  const logged = days.filter((d) => dayTotals.has(d));
  const avgDays = daysForAverage(logged, today);
  const avgOf = (k: keyof Totals) => average(avgDays.map((d) => dayTotals.get(d)![k]));
  const avgTotals: Totals | null = avgDays.length
    ? { kcal: Math.round(avgOf("kcal")!), proteinG: avgOf("proteinG")!, carbsG: avgOf("carbsG")!, fatG: avgOf("fatG")!, fiberG: avgOf("fiberG")! }
    : null;

  const target: Totals = { kcal: profile.kcalTarget, proteinG: profile.proteinG, carbsG: profile.carbsG, fatG: profile.fatG, fiberG: profile.fiberG };

  // Agua: la media cuenta los días con agua apuntada (hoy, solo si no hay otro).
  const waterByDay = new Map(water.map((w) => [dbToDateStr(w.day), w._sum.ml ?? 0]));
  const waterDays = daysForAverage(days.filter((d) => (waterByDay.get(d) ?? 0) > 0), today);
  const waterAvg = average(waterDays.map((d) => waterByDay.get(d)!));

  const mealDaySet = allDays.map((r) => dbToDateStr(r.day));
  const counts = new Map(heatCounts.map((r) => [dbToDateStr(r.day), r._count._all]));
  const dataDays = firstRated ? Math.round((dateStrToDb(today).getTime() - firstRated.day.getTime()) / 86_400_000) + 1 : 0;

  return {
    today,
    rangeDays,
    hideNumbers: profile.hideNumbers,
    streak: { current: logStreak(mealDaySet, today, addDays), best: bestStreak(mealDaySet, addDays) },
    heatmap: consistencyGrid(today, HEATMAP_WEEKS, counts, addDays, startOfWeekMonday),
    loggedDays: logged.length,
    calories: {
      bars: toBars(days, (d) => dayTotals.get(d)?.kcal ?? null, today, startOfWeekMonday),
      average: avgTotals?.kcal ?? null,
      target: profile.kcalTarget,
    },
    macros: { average: avgTotals, target, split: avgTotals ? macroSplit(avgTotals) : null, targetSplit: macroSplit(target) },
    water: {
      bars: toBars(days, (d) => waterByDay.get(d) ?? (d <= today ? 0 : null), today, startOfWeekMonday),
      average: waterAvg == null ? null : Math.round(waterAvg),
      target: profile.waterMl,
      goalDays: days.filter((d) => (waterByDay.get(d) ?? 0) >= profile.waterMl).length,
      days: days.length,
    },
    hunger: hungerAnalysis(
      meals.map((m) => ({ type: m.type, minutes: localMinutes(m.eatenAt, user.timezone), hunger: m.hungerBefore, fullness: m.fullnessAfter })),
      dataDays,
    ),
  };
}
