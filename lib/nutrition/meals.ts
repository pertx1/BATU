/** Tipos de comida, rachas y totales del día (puro: cliente y servidor). */

import type { DateStr } from "@/lib/dates";

export type MealType = "BREAKFAST" | "MIDMORNING" | "LUNCH" | "SNACK" | "DINNER" | "NIBBLE";

export const MEAL_TYPES: MealType[] = ["BREAKFAST", "MIDMORNING", "LUNCH", "SNACK", "DINNER", "NIBBLE"];

/** Nombre, emoji y fondo de la miniatura cuando la comida no tiene foto. */
export const MEAL_TYPE_INFO: Record<MealType, { label: string; emoji: string; bg: string }> = {
  BREAKFAST: { label: "Desayuno", emoji: "🥐", bg: "#F6C76B" },
  MIDMORNING: { label: "Almuerzo", emoji: "🥪", bg: "#9ED39A" },
  LUNCH: { label: "Comida", emoji: "🍲", bg: "#F0A07A" },
  SNACK: { label: "Merienda", emoji: "🍎", bg: "#F59AAE" },
  DINNER: { label: "Cena", emoji: "🥗", bg: "#8FB4F0" },
  NIBBLE: { label: "Picoteo", emoji: "🥨", bg: "#C7A7EE" },
};

/**
 * Tipo sugerido según la hora local (minutos desde medianoche): desayuno de
 * 5 a 11, almuerzo de 11 a 13, comida de 13 a 17, merienda de 17 a 20, cena
 * de 20 a 23 y picoteo el resto.
 */
export function mealTypeForMinutes(minutes: number): MealType {
  const h = minutes / 60;
  if (h >= 5 && h < 11) return "BREAKFAST";
  if (h >= 11 && h < 13) return "MIDMORNING";
  if (h >= 13 && h < 17) return "LUNCH";
  if (h >= 17 && h < 20) return "SNACK";
  if (h >= 20 && h < 23) return "DINNER";
  return "NIBBLE";
}

/**
 * Días seguidos registrando al menos una comida. Si hoy aún no hay nada, la
 * racha de ayer sigue viva (cuenta desde ayer).
 */
export function logStreak(days: Iterable<DateStr>, today: DateStr, addDays: (d: DateStr, n: number) => DateStr): number {
  const set = new Set(days);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export type Totals = { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number };

export function sumTotals(items: Totals[]): Totals {
  return items.reduce(
    (t, m) => ({
      kcal: t.kcal + m.kcal,
      proteinG: t.proteinG + m.proteinG,
      carbsG: t.carbsG + m.carbsG,
      fatG: t.fatG + m.fatG,
      fiberG: t.fiberG + m.fiberG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
}

/**
 * Lo que queda frente al objetivo. Nunca es un error pasarse: se dice
 * «X por encima» en el mismo color neutro.
 */
export function remaining(consumed: number, target: number): { value: number; over: boolean; ratio: number } {
  const c = Math.round(consumed);
  return { value: Math.abs(target - c), over: c > target, ratio: target > 0 ? c / target : 0 };
}

/** «1,25 L» o «750 ml». */
export function formatWater(ml: number): string {
  if (ml < 1000) return `${ml} ml`;
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(ml / 1000)} L`;
}

export function formatLiters(ml: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(ml / 1000);
}
