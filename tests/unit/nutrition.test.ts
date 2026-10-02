import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { midpoints, normalizeEstimate } from "@/lib/nutrition/estimate";
import { sniffImage } from "@/lib/nutrition/photo";
import { formatLiters, formatWater, logStreak, mealTypeForMinutes, remaining, sumTotals } from "@/lib/nutrition/meals";
import {
  bmi,
  bmr,
  computePlan,
  defaultWaterMl,
  goalOptions,
  manualTargetsError,
  targetWeightError,
  tdee,
  weightTrend,
  type PlanInput,
} from "@/lib/nutrition/calc";

const base: PlanInput = {
  sex: "MALE",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: "MODERATE",
  goal: "MAINTAIN",
  pace: null,
  targetWeightKg: null,
};

describe("fórmulas", () => {
  it("TMB Mifflin-St Jeor", () => {
    // 10·80 + 6,25·180 − 5·30 + 5 = 800 + 1125 − 150 + 5 = 1780
    expect(bmr({ sex: "MALE", weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
    expect(bmr({ sex: "FEMALE", weightKg: 80, heightCm: 180, age: 30 })).toBe(1614);
    expect(bmr({ sex: "UNSPECIFIED", weightKg: 80, heightCm: 180, age: 30 })).toBe(1697);
  });
  it("gasto diario por actividad", () => {
    expect(tdee(1000, "SEDENTARY")).toBeCloseTo(1200);
    expect(tdee(1000, "VERY_ACTIVE")).toBeCloseTo(1900);
  });
  it("IMC", () => {
    expect(bmi(80, 180)).toBeCloseTo(24.69, 2);
  });
  it("mantener: sin ajuste; macros, fibra y agua", () => {
    const p = computePlan(base);
    expect(p.tdee).toBe(Math.round(1780 * 1.55)); // 2759
    expect(p.kcal).toBe(2760);
    expect(p.proteinG).toBe(128); // 1,6 g/kg
    expect(p.fatG).toBe(Math.round((0.25 * 2760) / 9)); // 77
    expect(p.carbsG).toBe(Math.round((2760 - 128 * 4 - ((0.25 * 2760) / 9) * 9) / 4));
    expect(p.fiberG).toBe(39); // 14 por cada 1000 kcal
    expect(p.waterMl).toBe(2800); // 35 ml/kg
  });
  it("perder grasa recomendado: −0,5 kg/sem = −550 kcal/día y 2 g/kg de proteína", () => {
    const p = computePlan({ ...base, goal: "LOSE_FAT", pace: "RECOMMENDED", targetWeightKg: 75 });
    expect(p.kcal).toBe(Math.round((1780 * 1.55 - 550) / 10) * 10);
    expect(p.proteinG).toBe(160);
    expect(p.weeksToTarget).toBe(10);
    expect(p.kgPerWeek).toBe(-0.5);
  });
  it("recomposición: −10 % del gasto", () => {
    const p = computePlan({ ...base, goal: "RECOMP" });
    expect(p.kcal).toBe(Math.round((1780 * 1.55 * 0.9) / 10) * 10);
  });
  it("ganar músculo rápido: +0,35 kg/sem y 1,8 g/kg", () => {
    const p = computePlan({ ...base, goal: "GAIN_MUSCLE", pace: "FAST", targetWeightKg: 85 });
    expect(p.kcal).toBe(Math.round((1780 * 1.55 + (0.35 * 7700) / 7) / 10) * 10);
    expect(p.proteinG).toBe(144);
  });
  it("grasa mínima 0,6 g/kg", () => {
    const p = computePlan({ ...base, weightKg: 150, heightCm: 200, activity: "SEDENTARY" });
    expect(p.fatG).toBeGreaterThanOrEqual(Math.round(0.6 * 150) - 1);
  });
  it("con IMC > 30 la proteína va sobre el peso objetivo", () => {
    const p = computePlan({ ...base, weightKg: 110, goal: "LOSE_WEIGHT", pace: "GENTLE", targetWeightKg: 85 });
    expect(p.proteinG).toBe(Math.round(1.6 * 85));
  });
  it("agua redondeada a 50 ml", () => {
    expect(defaultWaterMl(63)).toBe(2200);
  });
});

describe("límites de seguridad", () => {
  it("las calorías nunca bajan de la TMB", () => {
    const p = computePlan({ ...base, sex: "FEMALE", weightKg: 60, heightCm: 160, age: 45, activity: "SEDENTARY", goal: "LOSE_WEIGHT", pace: "FAST", targetWeightKg: 55 });
    expect(p.kcal).toBeGreaterThanOrEqual(p.bmr);
    expect(p.notes.join(" ")).toMatch(/metabolismo basal/);
    // El ritmo mostrado es el real tras limitar.
    expect(p.kgPerWeek).toBeGreaterThan(-0.75);
  });
  it("la pérdida nunca supera el 1 % del peso por semana", () => {
    const p = computePlan({ ...base, weightKg: 60, heightCm: 170, activity: "VERY_ACTIVE", goal: "LOSE_WEIGHT", pace: "FAST", targetWeightKg: 56 });
    expect(p.kgPerWeek).toBeGreaterThanOrEqual(-0.6);
    expect(p.notes.join(" ")).toMatch(/1 %/);
  });
  it("la edad no limita el objetivo (desde los 13 años): solo cambia la TMB", () => {
    const opts = goalOptions({ age: 15, weightKg: 70, heightCm: 170 });
    expect(opts.every((o) => o.allowed)).toBe(true);
    const p = computePlan({ ...base, age: 15, goal: "LOSE_FAT", pace: "RECOMMENDED", targetWeightKg: 66 });
    expect(p.goal).toBe("LOSE_FAT");
    expect(p.kcal).toBeLessThan(Math.round(p.tdee / 10) * 10);
    // Los demás límites siguen: nunca por debajo de la TMB.
    expect(p.kcal).toBeGreaterThanOrEqual(p.bmr);
  });
  it("IMC menor de 18,5: no se puede perder grasa ni peso", () => {
    const opts = goalOptions({ age: 30, weightKg: 50, heightCm: 175 });
    const blocked = opts.filter((o) => !o.allowed).map((o) => o.goal);
    expect(blocked).toContain("LOSE_FAT");
    expect(blocked).toContain("LOSE_WEIGHT");
    expect(computePlan({ ...base, weightKg: 50, heightCm: 175, goal: "LOSE_WEIGHT", pace: "GENTLE", targetWeightKg: 48 }).goal).toBe("MAINTAIN");
  });
  it("peso objetivo con IMC menor de 18,5: no", () => {
    expect(targetWeightError({ goal: "LOSE_WEIGHT", weightKg: 70, heightCm: 180, targetWeightKg: 59 })).toMatch(/saludable/);
    expect(targetWeightError({ goal: "LOSE_WEIGHT", weightKg: 70, heightCm: 180, targetWeightKg: 65 })).toBeNull();
    expect(targetWeightError({ goal: "GAIN_WEIGHT", weightKg: 70, heightCm: 180, targetWeightKg: 65 })).toMatch(/mayor/);
  });
  it("objetivos manuales: nunca por debajo de la TMB", () => {
    const t = { kcal: 1500, proteinG: 120, carbsG: 150, fatG: 50, fiberG: 25, waterMl: 2000 };
    expect(manualTargetsError(t, 1600)).toMatch(/metabolismo basal/);
    expect(manualTargetsError({ ...t, kcal: 1700 }, 1600)).toBeNull();
  });
});

describe("tendencia de peso", () => {
  it("suaviza los altibajos", () => {
    const t = weightTrend([
      { day: "2026-10-01", kg: 80 },
      { day: "2026-10-02", kg: 81.5 },
      { day: "2026-10-03", kg: 79.8 },
    ]);
    expect(t[0].trend).toBe(80);
    expect(t[1].trend).toBeCloseTo(80.15, 2);
    expect(Math.abs(t[2].trend - 80)).toBeLessThan(0.3);
  });
});

describe("diario de comidas", () => {
  it("sugiere el tipo de comida según la hora", () => {
    const at = (h: number, m = 0) => mealTypeForMinutes(h * 60 + m);
    expect(at(8)).toBe("BREAKFAST");
    expect(at(11, 30)).toBe("MIDMORNING");
    expect(at(14, 20)).toBe("LUNCH");
    expect(at(18)).toBe("SNACK");
    expect(at(21, 15)).toBe("DINNER");
    expect(at(23, 30)).toBe("NIBBLE");
    expect(at(3)).toBe("NIBBLE");
  });

  it("cuenta la racha de días registrando (hoy aún vacío no la rompe)", () => {
    expect(logStreak(["2026-10-02", "2026-10-01", "2026-09-30"], "2026-10-02", addDays)).toBe(3);
    expect(logStreak(["2026-10-01", "2026-09-30"], "2026-10-02", addDays)).toBe(2);
    expect(logStreak(["2026-09-30"], "2026-10-02", addDays)).toBe(0);
    expect(logStreak(["2026-10-02", "2026-09-30"], "2026-10-02", addDays)).toBe(1);
  });

  it("pasarse del objetivo se muestra como «por encima», sin error", () => {
    expect(remaining(1500, 2000)).toEqual({ value: 500, over: false, ratio: 0.75 });
    expect(remaining(2300, 2000)).toMatchObject({ value: 300, over: true });
    expect(remaining(0, 0).ratio).toBe(0);
  });

  it("suma los totales y formatea el agua", () => {
    const t = sumTotals([
      { kcal: 500, proteinG: 30, carbsG: 50, fatG: 20, fiberG: 5 },
      { kcal: 250, proteinG: 10.5, carbsG: 20, fatG: 8, fiberG: 2 },
    ]);
    expect(t).toEqual({ kcal: 750, proteinG: 40.5, carbsG: 70, fatG: 28, fiberG: 7 });
    expect(formatWater(750)).toBe("750 ml");
    expect(formatWater(1250)).toBe("1,25 L");
    expect(formatLiters(2000)).toBe("2");
  });
});

describe("estimación de comidas", () => {
  const r = (min: number, max: number) => ({ min, max });
  const food = (over: Partial<Record<string, unknown>> = {}) => ({
    name: "Lentejas",
    quantity: "1 plato",
    kcal: r(400, 500),
    protein: r(20, 24),
    carbs: r(50, 60),
    fat: r(8, 12),
    fiber: r(10, 14),
    ...over,
  });

  it("sanea la respuesta de la IA: sin negativos, rangos ordenados y totales que cuadran", () => {
    const e = normalizeEstimate({
      name: "  Lentejas   con chorizo ",
      foods: [food(), food({ name: "Chorizo", kcal: r(140, 110), fat: r(-3, 12), fiber: r(0, 0) })],
      confidence: "media",
      assumptions: ["He supuesto 1 cucharada de aceite", ""],
    });
    expect(e.name).toBe("Lentejas con chorizo");
    expect(e.foods[1].kcal).toEqual({ min: 110, max: 140 });
    expect(e.foods[1].fat).toEqual({ min: 0, max: 12 });
    expect(e.totals.kcal).toEqual({ min: 510, max: 640 });
    expect(e.assumptions).toEqual(["He supuesto 1 cucharada de aceite"]);
    // Los anillos usan el punto medio
    expect(midpoints(e)).toEqual({ kcal: 575, proteinG: 44, carbsG: 110, fatG: 16, fiberG: 12 });
  });

  it("acota valores absurdos", () => {
    const e = normalizeEstimate({ name: "x", foods: [food({ kcal: r(0, 99999) })], confidence: "baja", assumptions: [] });
    expect(e.foods[0].kcal.max).toBe(5000);
  });

  it("reconoce las fotos por sus primeros bytes", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe("image/jpeg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("image/png");
    expect(sniffImage(new TextEncoder().encode("RIFF1234WEBPVP8 "))).toBe("image/webp");
    expect(sniffImage(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });
});
