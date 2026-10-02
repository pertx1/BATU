import { describe, expect, it } from "vitest";
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
  it("menores de 18: solo mantener", () => {
    const opts = goalOptions({ age: 16, weightKg: 70, heightCm: 170 });
    expect(opts.filter((o) => o.allowed).map((o) => o.goal)).toEqual(["MAINTAIN"]);
    const p = computePlan({ ...base, age: 16, goal: "LOSE_FAT", pace: "FAST", targetWeightKg: 70 });
    expect(p.goal).toBe("MAINTAIN");
    expect(p.kcal).toBe(Math.round(p.tdee / 10) * 10);
    expect(p.notes[0]).toMatch(/18 años/);
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
