/** Cálculos de la pestaña Análisis (puro: cliente y servidor). */

import type { DateStr } from "@/lib/dates";
import { MEAL_TYPES, type MealType, type Totals } from "@/lib/nutrition/meals";

type AddDays = (d: DateStr, n: number) => DateStr;

export const RANGES = [
  { key: "7", days: 7, label: "7 días" },
  { key: "30", days: 30, label: "30 días" },
  { key: "90", days: 90, label: "3 meses" },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

export function parseRange(v: unknown): (typeof RANGES)[number] {
  return RANGES.find((r) => r.key === v) ?? RANGES[0];
}

/** Los `n` días que acaban hoy, del más antiguo al más reciente. */
export function lastDays(today: DateStr, n: number, addDays: AddDays): DateStr[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

/** La racha más larga de días seguidos con alguna comida. */
export function bestStreak(days: Iterable<DateStr>, addDays: AddDays): number {
  const set = new Set(days);
  let best = 0;
  for (const d of set) {
    if (set.has(addDays(d, -1))) continue; // no empieza aquí
    let n = 1;
    while (set.has(addDays(d, n))) n++;
    best = Math.max(best, n);
  }
  return best;
}

export function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/**
 * Los días que cuentan para las medias: los registrados ya terminados. Hoy
 * solo cuenta si no hay ningún otro (el día aún no ha acabado).
 */
export function daysForAverage(logged: DateStr[], today: DateStr): DateStr[] {
  const done = logged.filter((d) => d < today);
  return done.length ? done : logged;
}

/** Una barra del gráfico: un día o, en «3 meses», una semana (media). */
export type Bar = { key: DateStr; value: number | null; partial: boolean; weekly: boolean };

/**
 * Barras por día; con muchos días, medias por semana (de lunes a domingo,
 * solo con los días que tienen datos).
 */
export function toBars(days: DateStr[], valueOf: (d: DateStr) => number | null, today: DateStr, weekStart: (d: DateStr) => DateStr): Bar[] {
  if (days.length <= 31) return days.map((d) => ({ key: d, value: valueOf(d), partial: d === today, weekly: false }));
  const weeks = new Map<DateStr, DateStr[]>();
  for (const d of days) {
    const w = weekStart(d);
    weeks.set(w, [...(weeks.get(w) ?? []), d]);
  }
  return [...weeks].map(([w, ds]) => {
    const values = ds.map(valueOf).filter((v): v is number => v != null);
    const avg = average(values);
    return { key: w, value: avg == null ? null : Math.round(avg), partial: ds.includes(today), weekly: true };
  });
}

/** Reparto de las calorías entre proteína, grasa y carbohidratos (en %, suma 100). */
export type MacroSplit = { protein: number; fat: number; carbs: number };

export function macroSplit(t: Pick<Totals, "proteinG" | "carbsG" | "fatG">): MacroSplit | null {
  const p = t.proteinG * 4;
  const f = t.fatG * 9;
  const c = t.carbsG * 4;
  const sum = p + f + c;
  if (sum <= 0) return null;
  const protein = Math.round((p / sum) * 100);
  const fat = Math.round((f / sum) * 100);
  return { protein, fat, carbs: 100 - protein - fat };
}

/** Celdas del calendario de constancia: semanas (lunes primero) hasta hoy. */
export type HeatCell = { day: DateStr; meals: number; level: 0 | 1 | 2 | 3; future: boolean };

export function consistencyGrid(today: DateStr, weeks: number, counts: Map<DateStr, number>, addDays: AddDays, weekStart: (d: DateStr) => DateStr): HeatCell[][] {
  const first = addDays(weekStart(today), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const day = addDays(first, w * 7 + i);
      const meals = counts.get(day) ?? 0;
      return { day, meals, level: Math.min(3, meals) as HeatCell["level"], future: day > today };
    }),
  );
}

// ---------- Hambre y saciedad ----------

export type Slot = "MORNING" | "MIDDAY" | "AFTERNOON" | "NIGHT";
export const SLOTS: Slot[] = ["MORNING", "MIDDAY", "AFTERNOON", "NIGHT"];
export const SLOT_INFO: Record<Slot, { label: string; when: string; hours: string }> = {
  MORNING: { label: "Mañana", when: "Por la mañana", hours: "5–12 h" },
  MIDDAY: { label: "Mediodía", when: "A mediodía", hours: "12–16 h" },
  AFTERNOON: { label: "Tarde", when: "Por la tarde", hours: "16–20 h" },
  NIGHT: { label: "Noche", when: "Por la noche", hours: "20–5 h" },
};

export function slotForMinutes(minutes: number): Slot {
  const h = minutes / 60;
  if (h >= 5 && h < 12) return "MORNING";
  if (h >= 12 && h < 16) return "MIDDAY";
  if (h >= 16 && h < 20) return "AFTERNOON";
  return "NIGHT";
}

/** «al desayuno» / «a la cena», «del desayuno» / «de la cena». */
const MEAL_ARTICLE: Record<MealType, { a: string; de: string }> = {
  BREAKFAST: { a: "al desayuno", de: "del desayuno" },
  MIDMORNING: { a: "al almuerzo", de: "del almuerzo" },
  LUNCH: { a: "a la comida", de: "de la comida" },
  SNACK: { a: "a la merienda", de: "de la merienda" },
  DINNER: { a: "a la cena", de: "de la cena" },
  NIBBLE: { a: "al picoteo", de: "del picoteo" },
};

export type HungerEntry = { type: MealType; minutes: number; hunger: number | null; fullness: number | null };
export type HungerRow = { hunger: number | null; fullness: number | null; count: number };

/** Días de datos de hambre que hacen falta para sacar conclusiones. */
export const HUNGER_MIN_DAYS = 14;
const MIN_PER_GROUP = 3;

const fmt1 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export const formatScore = (v: number) => fmt1.format(v);

function summarize(entries: HungerEntry[]): HungerRow & { hungerN: number; fullnessN: number } {
  const h = entries.map((e) => e.hunger).filter((v): v is number => v != null);
  const f = entries.map((e) => e.fullness).filter((v): v is number => v != null);
  return { hunger: average(h), fullness: average(f), count: entries.length, hungerN: h.length, fullnessN: f.length };
}

export type HungerAnalysis = {
  count: number;
  byType: ({ type: MealType } & HungerRow)[];
  bySlot: ({ slot: Slot } & HungerRow)[];
  /** Frases neutras; vacío hasta tener dos semanas de datos. */
  insights: string[];
  /** Días que faltan para las frases (0 si ya están). */
  daysToInsights: number;
};

/**
 * Medias de hambre (antes) y saciedad (después) por tipo de comida y franja.
 * `dataDays` es cuántos días han pasado desde el primer dato de hambre. Las
 * frases solo describen o sugieren con suavidad: nunca juzgan lo que comes.
 */
export function hungerAnalysis(entries: HungerEntry[], dataDays: number): HungerAnalysis {
  const rated = entries.filter((e) => e.hunger != null || e.fullness != null);
  const types = MEAL_TYPES.map((type) => ({ type, ...summarize(rated.filter((e) => e.type === type)) })).filter((r) => r.count > 0);
  const slots = SLOTS.map((slot) => ({ slot, ...summarize(rated.filter((e) => slotForMinutes(e.minutes) === slot)) })).filter((r) => r.count > 0);
  const daysToInsights = Math.max(0, HUNGER_MIN_DAYS - dataDays);
  const insights: string[] = [];

  if (!daysToInsights && rated.length >= 5) {
    const hungry = types.filter((r) => r.hungerN >= MIN_PER_GROUP && r.hunger! >= 3.5).sort((a, b) => b.hunger! - a.hunger!)[0];
    if (hungry) {
      insights.push(`Sueles llegar con más hambre ${MEAL_ARTICLE[hungry.type].a} (${formatScore(hungry.hunger!)} de 5).`);
      if (hungry.hunger! >= 4) insights.push("Tomar algo entre horas, como una fruta o un yogur, puede ayudarte a llegar con más calma.");
    }
    const light = types.filter((r) => r.fullnessN >= MIN_PER_GROUP && r.fullness! <= 2.2).sort((a, b) => a.fullness! - b.fullness!)[0];
    if (light) {
      insights.push(
        `Después ${MEAL_ARTICLE[light.type].de} sueles quedarte con algo de hambre. Añadir un poco de proteína o verdura puede ayudarte a que te sacie más.`,
      );
    }
    const slotRanked = slots.filter((r) => r.hungerN >= MIN_PER_GROUP).sort((a, b) => b.hunger! - a.hunger!);
    if (slotRanked.length >= 2 && slotRanked[0].hunger! - slotRanked.at(-1)!.hunger! >= 0.8) {
      insights.push(`${SLOT_INFO[slotRanked[0].slot].when} es cuando más hambre sueles tener.`);
    }
    if (!insights.length && types.some((r) => r.hungerN + r.fullnessN >= MIN_PER_GROUP)) {
      insights.push("Tu hambre y tu saciedad se mantienen bastante parecidas de una comida a otra.");
    }
  }

  return {
    count: rated.length,
    byType: types.map((r) => ({ type: r.type, hunger: r.hunger, fullness: r.fullness, count: r.count })),
    bySlot: slots.map((r) => ({ slot: r.slot, hunger: r.hunger, fullness: r.fullness, count: r.count })),
    insights,
    daysToInsights,
  };
}
