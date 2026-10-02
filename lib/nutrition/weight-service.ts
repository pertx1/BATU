import "server-only";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { addDays, dateStrToDb, dbToDateStr, todayStr, type DateStr } from "@/lib/dates";
import { antolaSay, antolaSettings, award, type Reward } from "@/lib/gamification";
import type { MessageVars } from "@/lib/antola/messages";
import { goalProgress } from "@/lib/goals";
import { bmi, formatKg } from "@/lib/nutrition/calc";
import { losingTooFast, projection, reachedTarget, weeklyRate, weightMilestones, weightSummary } from "@/lib/nutrition/weight";

/** Kilos de cambio en la tendencia (desde el último cálculo) a partir de los que se propone recalcular. */
export const RECALC_KG = 2;

type User = { id: string; timezone: string };

/** Todos los pesajes del usuario (los de los últimos 2 años bastan para la tendencia). */
export async function weighIns(userId: string, today: DateStr) {
  const rows = await db.weightLog.findMany({
    where: { userId, day: { gte: dateStrToDb(addDays(today, -730)) } },
    orderBy: { day: "asc" },
    select: { id: true, day: true, kg: true },
  });
  return rows.map((r) => ({ id: r.id, day: dbToDateStr(r.day), kg: r.kg }));
}

/**
 * El objetivo «Peso» sigue a la tendencia (no al último pesaje). Si la
 * tendencia llega al objetivo, se marca como conseguido (y nunca se
 * «desconsigue» después: no se resta nada).
 */
export async function syncWeightGoal(user: User, now = new Date()): Promise<Reward | null> {
  const achievedId = await syncWeightGoalStatus(user, now);
  return achievedId ? award(user, { type: "goal", goalId: achievedId, achieved: true }) : null;
}

/** Actualiza el objetivo «Peso» con la tendencia. Devuelve su id si se acaba de conseguir. */
async function syncWeightGoalStatus(user: User, now: Date): Promise<string | null> {
  const profile = await db.nutritionProfile.findUnique({ where: { userId: user.id }, select: { goalId: true } });
  if (!profile?.goalId) return null;
  const goal = await db.goal.findFirst({ where: { id: profile.goalId, userId: user.id, type: "WEIGHT" } });
  if (!goal || goal.startValue == null || goal.targetValue == null) return null;
  const today = todayStr(user.timezone, now);
  const { current } = weightSummary(await weighIns(user.id, today), today);
  if (current == null) return null;
  const achieve = goal.status === "ACTIVE" && reachedTarget(goal.startValue, current, goal.targetValue);
  await db.goal.update({
    where: { id: goal.id, userId: user.id },
    data: { currentValue: current, ...(achieve ? { status: "ACHIEVED", achievedAt: now } : {}) },
  });
  return achieve ? goal.id : null;
}

function checkDay(day: DateStr, today: DateStr) {
  if (day > today) throw new HttpError(400, "No se puede apuntar un pesaje en un día futuro");
  if (day < addDays(today, -730)) throw new HttpError(400, "Esa fecha es demasiado antigua");
}

/** Apunta el peso de un día (si ya había uno ese día, lo sustituye). */
export async function saveWeighIn(user: User, day: DateStr, kg: number, now = new Date()) {
  checkDay(day, todayStr(user.timezone, now));
  const log = await db.weightLog.upsert({
    where: { userId_day: { userId: user.id, day: dateStrToDb(day) } },
    create: { userId: user.id, day: dateStrToDb(day), kg: Math.round(kg * 10) / 10 },
    update: { kg: Math.round(kg * 10) / 10 },
    select: { id: true },
  });
  // Un solo premio: el pesaje (una vez por semana), los hitos y, si toca, el objetivo conseguido.
  const goalAchievedId = await syncWeightGoalStatus(user, now);
  return { id: log.id, gamification: await award(user, { type: "food", day, weighIn: true, goalAchievedId }, now) };
}

/** Corrige un pesaje (kilos o día). null si no es del usuario. */
export async function updateWeighIn(user: User, id: string, patch: { kg?: number; day?: DateStr }, now = new Date()) {
  const log = await db.weightLog.findFirst({ where: { id, userId: user.id } });
  if (!log) return null;
  if (patch.day) {
    checkDay(patch.day, todayStr(user.timezone, now));
    const clash = await db.weightLog.findFirst({ where: { userId: user.id, day: dateStrToDb(patch.day), NOT: { id } }, select: { id: true } });
    if (clash) throw new HttpError(409, "Ya hay un pesaje ese día. Edita ese o bórralo antes.");
  }
  await db.weightLog.updateMany({
    where: { id, userId: user.id },
    data: {
      ...(patch.kg !== undefined ? { kg: Math.round(patch.kg * 10) / 10 } : {}),
      ...(patch.day ? { day: dateStrToDb(patch.day) } : {}),
    },
  });
  return { gamification: await syncWeightGoal(user, now) };
}

export async function deleteWeighIn(user: User, id: string, now = new Date()) {
  const res = await db.weightLog.deleteMany({ where: { id, userId: user.id } });
  if (!res.count) return false;
  await syncWeightGoal(user, now);
  return true;
}

const REMINDER: Record<number, string> = {
  1: "Te recordamos pesarte los lunes por la mañana",
  2: "Te recordamos pesarte lunes y jueves por la mañana",
  3: "Te recordamos pesarte lunes, miércoles y viernes por la mañana",
};

/** Todo lo de la pestaña Peso (y del objetivo «Peso» en Objetivos). */
export async function weightPageData(user: User, now = new Date()) {
  const today = todayStr(user.timezone, now);
  const [logs, profile] = await Promise.all([
    weighIns(user.id, today),
    db.nutritionProfile.findUnique({ where: { userId: user.id }, select: { heightCm: true, goalId: true, weighInPerWeek: true } }),
  ]);
  const goal = profile?.goalId ? await db.goal.findFirst({ where: { id: profile.goalId, userId: user.id, type: "WEIGHT" } }) : null;
  const s = weightSummary(logs, today);
  const hasGoal = goal && goal.startValue != null && goal.targetValue != null;
  const rate = weeklyRate(s.series, today);
  return {
    today,
    logs,
    series: s.series,
    current: s.current,
    change7: s.change7,
    change30: s.change30,
    goal: hasGoal
      ? {
          id: goal.id,
          start: goal.startValue!,
          target: goal.targetValue!,
          progress: goalProgress({ type: "WEIGHT", startValue: goal.startValue, currentValue: s.current ?? goal.startValue, targetValue: goal.targetValue, milestonesDone: 0, milestonesTotal: 0, tasksDone: 0, tasksTotal: 0 }),
          achieved: goal.status === "ACHIEVED",
          eta: projection(s.current, goal.targetValue, rate, today),
          milestones: weightMilestones(goal.startValue!, goal.targetValue!, s.current),
        }
      : null,
    bmi: profile && s.current != null ? bmi(s.current, profile.heightCm) : null,
    reminder: profile ? (REMINDER[profile.weighInPerWeek] ?? null) : null,
  };
}

export type FoodNudges = {
  /** Antola propone recalcular: la tendencia se ha movido 2 kg o más desde el último cálculo. */
  recalc: { text: string; diffKg: number; weightAtCalc: number } | null;
  /** Antola recomienda ir más despacio (más de un 1 % por semana dos semanas seguidas). */
  slowDown: { text: string } | null;
};

/** Sugerencias de Antola para Comida y Peso (nunca juzgan el peso ni el cuerpo). */
export async function foodNudges(user: User, now = new Date()): Promise<FoodNudges> {
  const today = todayStr(user.timezone, now);
  const [profile, logs, settings] = await Promise.all([
    db.nutritionProfile.findUnique({ where: { userId: user.id }, select: { weightAtCalc: true, manualTargets: true } }),
    weighIns(user.id, today),
    antolaSettings(user.id),
  ]);
  if (!profile) return { recalc: null, slowDown: null };
  const { series, current } = weightSummary(logs, today);
  const diff = current == null ? 0 : Math.round((current - profile.weightAtCalc) * 10) / 10;
  const say = (situation: "recalcular" | "ir_despacio", vars: MessageVars) =>
    antolaSay(user.id, situation, vars, settings.antolaTone, { stable: true, now }).then((s) => s.text);
  const [recalc, slowDown] = await Promise.all([
    !profile.manualTargets && Math.abs(diff) >= RECALC_KG ? say("recalcular", { kg: formatKg(Math.abs(diff)) }) : null,
    losingTooFast(series, today) ? say("ir_despacio", {}) : null,
  ]);
  return {
    recalc: recalc ? { text: recalc, diffKg: diff, weightAtCalc: profile.weightAtCalc } : null,
    slowDown: slowDown ? { text: slowDown } : null,
  };
}
