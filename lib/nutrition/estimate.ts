/** Estimación de una comida: alimentos con rangos, totales y suposiciones (puro). */

import { z } from "zod";
import type { Totals } from "@/lib/nutrition/meals";

const range = z.object({ min: z.number(), max: z.number() });

/** Lo que devuelve la IA (validado con zod; los números se sanean después). */
export const aiEstimateSchema = z.object({
  name: z.string().describe("Nombre corto del plato en español, p. ej. «Lentejas con chorizo»"),
  foods: z
    .array(
      z.object({
        name: z.string().describe("Alimento en español"),
        quantity: z.string().describe("Cantidad estimada, p. ej. «1 plato (350 g)» o «1 cucharada»"),
        kcal: range,
        protein: range.describe("gramos"),
        carbs: range.describe("gramos"),
        fat: range.describe("gramos"),
        fiber: range.describe("gramos"),
      }),
    )
    .describe("Cada alimento por separado"),
  confidence: z.enum(["baja", "media", "alta"]),
  assumptions: z.array(z.string()).describe("Suposiciones hechas, p. ej. «He supuesto 1 cucharada de aceite»"),
});

export type AiEstimate = z.infer<typeof aiEstimateSchema>;

export type Range = { min: number; max: number };
export type FoodItem = { name: string; quantity: string; kcal: Range; protein: Range; carbs: Range; fat: Range; fiber: Range };
export type Confidence = "baja" | "media" | "alta";

/** Lo que se guarda en MealLog.estimate. */
export type Estimate = {
  name: string;
  foods: FoodItem[];
  totals: { kcal: Range; protein: Range; carbs: Range; fat: Range; fiber: Range };
  confidence: Confidence;
  assumptions: string[];
};

const MAX = { kcal: 5000, protein: 400, carbs: 800, fat: 400, fiber: 150 } as const;
type Key = keyof typeof MAX;
const KEYS: Key[] = ["kcal", "protein", "carbs", "fat", "fiber"];

function cleanRange(r: Range, max: number): Range {
  const fix = (n: number) => (Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0);
  const a = fix(r.min);
  const b = fix(r.max);
  const round = (n: number) => Math.round(n * 10) / 10;
  return { min: round(Math.min(a, b)), max: round(Math.max(a, b)) };
}

const text = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

/** Totales = suma de los alimentos (así siempre cuadran). */
export function totalsOf(foods: FoodItem[]): Estimate["totals"] {
  const t = Object.fromEntries(KEYS.map((k) => [k, { min: 0, max: 0 }])) as Estimate["totals"];
  for (const f of foods) for (const k of KEYS) {
    t[k] = { min: t[k].min + f[k].min, max: t[k].max + f[k].max };
  }
  for (const k of KEYS) t[k] = { min: Math.round(t[k].min * 10) / 10, max: Math.round(t[k].max * 10) / 10 };
  return t;
}

/** Limpia la respuesta de la IA: números no negativos y acotados, textos cortos. */
export function normalizeEstimate(ai: AiEstimate): Estimate {
  const foods: FoodItem[] = ai.foods.slice(0, 30).map((f) => ({
    name: text(f.name, 80) || "Alimento",
    quantity: text(f.quantity, 60),
    kcal: cleanRange(f.kcal, MAX.kcal),
    protein: cleanRange(f.protein, MAX.protein),
    carbs: cleanRange(f.carbs, MAX.carbs),
    fat: cleanRange(f.fat, MAX.fat),
    fiber: cleanRange(f.fiber, MAX.fiber),
  }));
  return {
    name: text(ai.name, 80) || "Comida",
    foods,
    totals: totalsOf(foods),
    confidence: ai.confidence,
    assumptions: ai.assumptions.map((a) => text(a, 200)).filter(Boolean).slice(0, 10),
  };
}

/** Los anillos y totales usan el punto medio de los rangos. */
export function midpoints(e: Pick<Estimate, "totals">): Totals {
  const mid = (r: Range) => (r.min + r.max) / 2;
  return {
    kcal: Math.round(mid(e.totals.kcal)),
    proteinG: Math.round(mid(e.totals.protein) * 10) / 10,
    carbsG: Math.round(mid(e.totals.carbs) * 10) / 10,
    fatG: Math.round(mid(e.totals.fat) * 10) / 10,
    fiberG: Math.round(mid(e.totals.fiber) * 10) / 10,
  };
}
