/**
 * Cálculos de nutrición. Funciones puras: se usan en el cliente para enseñar
 * la vista previa del onboarding y en el servidor, que SIEMPRE recalcula
 * antes de guardar (nunca se fía de números que lleguen del cliente).
 *
 * Son estimaciones orientativas; no sustituyen a un profesional de la salud.
 */

export type Sex = "MALE" | "FEMALE" | "UNSPECIFIED";
export type Activity = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
export type Goal = "LOSE_FAT" | "LOSE_WEIGHT" | "MAINTAIN" | "RECOMP" | "GAIN_MUSCLE" | "GAIN_WEIGHT";
export type Pace = "GENTLE" | "RECOMMENDED" | "FAST";

export const KCAL_PER_KG = 7700;
export const MIN_AGE = 13;
export const ADULT_AGE = 18;
export const MIN_BMI = 18.5;
export const MAX_WEEKLY_LOSS_RATIO = 0.01; // 1 % del peso por semana

export const ACTIVITY_FACTOR: Record<Activity, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

const SEX_OFFSET: Record<Sex, number> = { MALE: 5, FEMALE: -161, UNSPECIFIED: -78 };

/** kg por semana de cada ritmo (negativo = perder). */
export const PACE_KG_PER_WEEK: Partial<Record<Goal, Record<Pace, number>>> = {
  LOSE_FAT: { GENTLE: -0.25, RECOMMENDED: -0.5, FAST: -0.75 },
  LOSE_WEIGHT: { GENTLE: -0.25, RECOMMENDED: -0.5, FAST: -0.75 },
  GAIN_MUSCLE: { GENTLE: 0.15, RECOMMENDED: 0.25, FAST: 0.35 },
  GAIN_WEIGHT: { GENTLE: 0.25, RECOMMENDED: 0.5, FAST: 0.75 },
};

export const PROTEIN_PER_KG: Record<Goal, number> = {
  LOSE_FAT: 2.0,
  RECOMP: 2.0,
  GAIN_MUSCLE: 1.8,
  LOSE_WEIGHT: 1.6,
  MAINTAIN: 1.6,
  GAIN_WEIGHT: 1.6,
};

const LOSING: Goal[] = ["LOSE_FAT", "LOSE_WEIGHT"];
const GAINING: Goal[] = ["GAIN_MUSCLE", "GAIN_WEIGHT"];

/** ¿Este objetivo lleva peso objetivo y ritmo? */
export function goalHasTarget(goal: Goal): boolean {
  return LOSING.includes(goal) || GAINING.includes(goal);
}

export function isLosing(goal: Goal) {
  return LOSING.includes(goal);
}

export function ageFromBirthYear(birthYear: number, currentYear: number): number {
  return currentYear - birthYear;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Peso correspondiente a un IMC para una altura. */
export function weightForBmi(targetBmi: number, heightCm: number): number {
  const m = heightCm / 100;
  return targetBmi * m * m;
}

/** Tasa metabólica basal (Mifflin-St Jeor). */
export function bmr(input: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  return 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + SEX_OFFSET[input.sex];
}

export function tdee(bmrKcal: number, activity: Activity): number {
  return bmrKcal * ACTIVITY_FACTOR[activity];
}

export type GoalAvailability = { goal: Goal; allowed: boolean; reason: string | null };

/** Qué objetivos se pueden elegir (con IMC bajo, nada de perder). La edad no limita el objetivo. */
export function goalOptions(input: { age: number; weightKg: number; heightCm: number }): GoalAvailability[] {
  const all: Goal[] = ["LOSE_FAT", "LOSE_WEIGHT", "MAINTAIN", "RECOMP", "GAIN_MUSCLE", "GAIN_WEIGHT"];
  const currentBmi = bmi(input.weightKg, input.heightCm);
  return all.map((goal) => {
    if (currentBmi < MIN_BMI && (LOSING.includes(goal) || goal === "RECOMP")) {
      return { goal, allowed: false, reason: "Con tu peso actual no es buena idea perder. Mejor háblalo con un profesional." };
    }
    return { goal, allowed: true, reason: null };
  });
}

/** Comprueba el peso objetivo: dirección correcta e IMC no menor de 18,5. Devuelve el error o null. */
export function targetWeightError(input: { goal: Goal; weightKg: number; heightCm: number; targetWeightKg: number | null }): string | null {
  if (!goalHasTarget(input.goal)) return null;
  const t = input.targetWeightKg;
  if (t == null || !Number.isFinite(t)) return "Elige tu peso objetivo.";
  const minKg = Math.ceil(weightForBmi(MIN_BMI, input.heightCm) * 10) / 10;
  if (t < minKg) {
    return `Ese peso quedaría por debajo de lo saludable para tu altura. El mínimo recomendable es ${formatKg(minKg)} kg; tu cuerpo te lo agradecerá.`;
  }
  if (LOSING.includes(input.goal) && t >= input.weightKg) return "Para perder, el peso objetivo tiene que ser menor que el actual.";
  if (GAINING.includes(input.goal) && t <= input.weightKg) return "Para ganar, el peso objetivo tiene que ser mayor que el actual.";
  return null;
}

const kgFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

/** 72,5 · 0,25 · 80 */
export function formatKg(n: number): string {
  return kgFormat.format(Math.round(n * 100) / 100);
}

export type PlanInput = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
  pace: Pace | null;
  targetWeightKg: number | null;
};

export type Plan = {
  goal: Goal; // el que se aplica (con IMC bajo, «Mantener» en vez de perder)
  pace: Pace | null;
  age: number;
  bmi: number;
  bmr: number;
  tdee: number;
  requestedKgPerWeek: number;
  kgPerWeek: number; // el real, tras los límites
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
  weeksToTarget: number | null;
  /** Explicaciones de los límites aplicados (se enseñan al usuario). */
  notes: string[];
};

const round10 = (n: number) => Math.round(n / 10) * 10;
const MIN_CARBS_G = 50;

/**
 * Plan diario completo con los límites de seguridad:
 * - las calorías nunca bajan de la TMB;
 * - la pérdida nunca supera el 1 % del peso por semana;
 * - con IMC bajo, nada de perder.
 * La edad solo entra en la fórmula de la TMB (cualquier objetivo desde los 13 años).
 */
export function computePlan(input: PlanInput): Plan {
  const notes: string[] = [];
  let goal = input.goal;
  if (input.age < ADULT_AGE && goal !== "MAINTAIN") {
    // Aviso suave, no bloquea.
    notes.push("Como estás creciendo, si vas a cambiar de peso es buena idea comentarlo con tu médico.");
  }
  const currentBmi = bmi(input.weightKg, input.heightCm);
  if (currentBmi < MIN_BMI && (LOSING.includes(goal) || goal === "RECOMP")) {
    goal = "MAINTAIN";
    notes.push("Con tu IMC actual no recomendamos perder peso. Mejor consúltalo con un profesional.");
  }
  const pace = goalHasTarget(goal) ? (input.pace ?? "RECOMMENDED") : null;

  const basal = bmr({ sex: input.sex, weightKg: input.weightKg, heightCm: input.heightCm, age: input.age });
  const daily = tdee(basal, input.activity);

  let requested = pace ? (PACE_KG_PER_WEEK[goal]?.[pace] ?? 0) : 0;
  let perWeek = requested;
  if (perWeek < 0) {
    const maxLoss = -MAX_WEEKLY_LOSS_RATIO * input.weightKg;
    if (perWeek < maxLoss) {
      perWeek = maxLoss;
      notes.push(`Para cuidar tu salud, no bajamos más del 1 % de tu peso por semana (${formatKg(-maxLoss)} kg).`);
    }
  }

  let delta = (perWeek * KCAL_PER_KG) / 7;
  if (goal === "RECOMP") {
    delta = -0.1 * daily;
    requested = 0;
    perWeek = 0;
  }
  let kcal = daily + delta;
  if (kcal < basal) {
    kcal = basal;
    notes.push("Tus calorías no bajan de tu metabolismo basal: comer menos que eso no es buena idea.");
    if (perWeek < 0) perWeek = ((kcal - daily) * 7) / KCAL_PER_KG;
  }
  kcal = Math.max(round10(kcal), Math.ceil(basal / 10) * 10);

  // Proteína: con IMC > 30 se calcula sobre el peso objetivo (o el de un IMC de 25).
  const proteinBase =
    currentBmi > 30 ? (input.targetWeightKg && goalHasTarget(goal) ? input.targetWeightKg : weightForBmi(25, input.heightCm)) : input.weightKg;
  const proteinG = Math.round(PROTEIN_PER_KG[goal] * proteinBase);

  const minFat = 0.6 * input.weightKg;
  let fatG = Math.max((0.25 * kcal) / 9, minFat);
  let carbsG = (kcal - proteinG * 4 - fatG * 9) / 4;
  if (carbsG < MIN_CARBS_G && fatG > minFat) {
    const free = Math.min((MIN_CARBS_G - carbsG) * 4, (fatG - minFat) * 9);
    fatG -= free / 9;
    carbsG += free / 4;
    notes.push("Hemos ajustado la grasa a su mínimo saludable para dejar sitio a los carbohidratos.");
  }
  carbsG = Math.max(0, carbsG);

  const weeksToTarget =
    input.targetWeightKg != null && perWeek !== 0 && goalHasTarget(goal) && Math.sign(input.targetWeightKg - input.weightKg) === Math.sign(perWeek)
      ? Math.abs(input.targetWeightKg - input.weightKg) / Math.abs(perWeek)
      : null;

  return {
    goal,
    pace,
    age: input.age,
    bmi: Math.round(currentBmi * 10) / 10,
    bmr: Math.round(basal),
    tdee: Math.round(daily),
    requestedKgPerWeek: requested,
    kgPerWeek: Math.round(perWeek * 100) / 100,
    kcal,
    proteinG,
    carbsG: Math.round(carbsG),
    fatG: Math.round(fatG),
    fiberG: Math.round((14 * kcal) / 1000),
    waterMl: defaultWaterMl(input.weightKg),
    weeksToTarget: weeksToTarget == null ? null : Math.ceil(weeksToTarget),
    notes,
  };
}

/** Agua: 35 ml por kg, redondeado a 50 ml. */
export function defaultWaterMl(weightKg: number): number {
  return Math.round((35 * weightKg) / 50) * 50;
}

export type ManualTargets = { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number; waterMl: number };

/** Objetivos puestos a mano: mismos límites (las calorías nunca por debajo de la TMB). Devuelve el error o null. */
export function manualTargetsError(t: ManualTargets, bmrKcal: number): string | null {
  if (t.kcal < Math.round(bmrKcal)) return `Las calorías no pueden bajar de tu metabolismo basal (${Math.round(bmrKcal)} kcal).`;
  if (t.kcal > 6000) return "Revisa las calorías: parecen demasiadas.";
  if ([t.proteinG, t.carbsG, t.fatG, t.fiberG].some((g) => g < 0 || g > 800)) return "Revisa los gramos de los macros.";
  if (t.waterMl < 500 || t.waterMl > 6000) return "El agua tiene que estar entre 0,5 y 6 litros.";
  return null;
}

/**
 * Tendencia del peso: media móvil exponencial que tiene en cuenta los días
 * sin pesarse (alfa 0,1 por día). Los pesajes van ordenados por día.
 */
export function weightTrend(logs: { day: string; kg: number }[]): { day: string; kg: number; trend: number }[] {
  const out: { day: string; kg: number; trend: number }[] = [];
  let trend: number | null = null;
  let prevDay: string | null = null;
  for (const l of logs) {
    if (trend == null || prevDay == null) trend = l.kg;
    else {
      const gap = Math.max(1, Math.round((Date.parse(l.day) - Date.parse(prevDay)) / 86400000));
      const alpha = 1 - Math.pow(0.9, gap);
      trend = trend + alpha * (l.kg - trend);
    }
    prevDay = l.day;
    out.push({ day: l.day, kg: l.kg, trend: Math.round(trend * 100) / 100 });
  }
  return out;
}

export const SEX_LABEL: Record<Sex, string> = { MALE: "Hombre", FEMALE: "Mujer", UNSPECIFIED: "Prefiero no decirlo" };

export const ACTIVITY_INFO: Record<Activity, { label: string; text: string }> = {
  SEDENTARY: { label: "Sedentario", text: "Casi sin ejercicio" },
  LIGHT: { label: "Ligero", text: "1-3 h de ejercicio a la semana" },
  MODERATE: { label: "Moderado", text: "3-5 h a la semana" },
  ACTIVE: { label: "Activo", text: "5-7 h a la semana" },
  VERY_ACTIVE: { label: "Muy activo", text: "Más de 7 h a la semana o trabajo físico" },
};

export const GOAL_INFO: Record<Goal, { label: string; text: string; emoji: string }> = {
  LOSE_FAT: { label: "Perder grasa", text: "Prioriza mantener el músculo, con más proteína.", emoji: "🔥" },
  LOSE_WEIGHT: { label: "Perder peso", text: "Bajar de peso poco a poco.", emoji: "⚖️" },
  MAINTAIN: { label: "Mantener", text: "Quedarte como estás y comer con equilibrio.", emoji: "🌿" },
  RECOMP: { label: "Recomposición", text: "Perder grasa y ganar músculo a la vez.", emoji: "🔄" },
  GAIN_MUSCLE: { label: "Ganar músculo", text: "Subir despacio para que sea sobre todo músculo.", emoji: "💪" },
  GAIN_WEIGHT: { label: "Ganar peso", text: "Subir de peso de forma sana.", emoji: "📈" },
};

export const PACE_LABEL: Record<Pace, string> = { GENTLE: "Suave", RECOMMENDED: "Recomendado", FAST: "Rápido" };
