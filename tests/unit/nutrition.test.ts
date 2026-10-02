import { describe, expect, it } from "vitest";
import { addDays, startOfWeekMonday } from "@/lib/dates";
import { bestStreak, consistencyGrid, daysForAverage, hungerAnalysis, lastDays, macroSplit, parseRange, slotForMinutes, toBars, type HungerEntry } from "@/lib/nutrition/analysis";
import { midpoints, normalizeEstimate, scaledQuantity } from "@/lib/nutrition/estimate";
import { sniffImage } from "@/lib/nutrition/photo";
import { formatChange, losingTooFast, progressKg, projection, reachedTarget, weeklyRate, weightMilestones, weightSummary } from "@/lib/nutrition/weight";
import { expectedWater, nextWaterCheck, nextWeighInAt, shouldRemindWater } from "@/lib/nutrition/reminders";
import { FOOD_XP, foodXpDay } from "@/lib/antola/xp";
import { MESSAGES } from "@/lib/antola/messages";
import { ACHIEVEMENTS } from "@/lib/antola/achievements";
import { HEALTHY_HABITS } from "@/lib/habits";
import { formatInTimeZone } from "date-fns-tz";
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

describe("peso", () => {
  const days = (n: number, from = "2026-09-01") => new Date(Date.parse(from) + n * 86400000).toISOString().slice(0, 10);

  it("resume la tendencia y los cambios de la semana y el mes", () => {
    const logs = Array.from({ length: 36 }, (_, i) => ({ day: days(i), kg: 82 - i * 0.1 }));
    const s = weightSummary(logs, days(35));
    expect(s.current).toBeLessThan(80);
    expect(s.change7).toBeLessThan(0);
    expect(s.change30).toBeLessThan(s.change7!);
    expect(weightSummary(logs.slice(30), days(35)).change30).toBeNull(); // sin datos de hace un mes
  });

  it("proyecta la llegada solo si la tendencia va hacia el objetivo", () => {
    const down = weightSummary(Array.from({ length: 22 }, (_, i) => ({ day: days(i), kg: 82 - i * 0.07 })), days(21));
    const rate = weeklyRate(down.series, days(21))!;
    expect(rate).toBeLessThan(0);
    expect(projection(down.current, 77, rate, days(21))).toMatch(/^2026|^2027/);
    expect(projection(down.current, 85, rate, days(21))).toBeNull(); // quiere ganar y baja
    expect(weeklyRate(down.series.slice(0, 2), days(21))).toBeNull();
  });

  it("hitos cada 2 kg y a mitad de camino", () => {
    const m = weightMilestones(82, 75, 79.5);
    expect(m.map((x) => x.kg)).toEqual([80, 78.5, 78, 76]);
    expect(m.filter((x) => x.reached).map((x) => x.id)).toEqual(["2kg"]);
    expect(m.find((x) => x.id === "half")!.label).toBe("Mitad del camino");
    const gain = weightMilestones(60, 64, 62);
    expect(gain.map((x) => [x.kg, x.reached])).toEqual([[62, true]]);
    expect(gain[0].label).toContain("mitad");
    expect(reachedTarget(82, 76.9, 77)).toBe(true);
    expect(reachedTarget(60, 63.9, 64)).toBe(false);
    expect(formatChange(-0.44)).toBe("−0,4 kg");
  });
});

describe("análisis", () => {
  it("elige el periodo (7 días por defecto)", () => {
    expect(parseRange("30").days).toBe(30);
    expect(parseRange("90").days).toBe(90);
    expect(parseRange("x").days).toBe(7);
    expect(parseRange(undefined).days).toBe(7);
  });

  it("calcula la mejor racha", () => {
    const days = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-10", "2026-09-11"];
    expect(bestStreak(days, addDays)).toBe(3);
    expect(bestStreak([], addDays)).toBe(0);
  });

  it("las medias no cuentan hoy salvo que sea el único día", () => {
    expect(daysForAverage(["2026-10-01", "2026-10-02"], "2026-10-02")).toEqual(["2026-10-01"]);
    expect(daysForAverage(["2026-10-02"], "2026-10-02")).toEqual(["2026-10-02"]);
  });

  it("agrupa por semanas con muchos días y deja huecos sin datos", () => {
    const days = lastDays("2026-10-02", 90, addDays);
    expect(days).toHaveLength(90);
    expect(days.at(-1)).toBe("2026-10-02");
    const bars = toBars(days, (d) => (d === "2026-09-29" ? 2000 : d === "2026-09-30" ? 1000 : null), "2026-10-02", startOfWeekMonday);
    expect(bars.every((b) => b.weekly)).toBe(true);
    const week = bars.find((b) => b.key === "2026-09-28")!;
    expect(week.value).toBe(1500);
    expect(week.partial).toBe(true);
    expect(bars.filter((b) => b.value != null)).toHaveLength(1);
    const daily = toBars(lastDays("2026-10-02", 7, addDays), () => 5, "2026-10-02", startOfWeekMonday);
    expect(daily).toHaveLength(7);
    expect(daily.at(-1)!.partial).toBe(true);
  });

  it("reparte las calorías entre macros sumando 100", () => {
    const s = macroSplit({ proteinG: 100, carbsG: 200, fatG: 50 })!;
    expect(s.protein + s.fat + s.carbs).toBe(100);
    expect(s.protein).toBe(24); // 400 de 1650
    expect(macroSplit({ proteinG: 0, carbsG: 0, fatG: 0 })).toBeNull();
  });

  it("monta 13 semanas de lunes a domingo y marca el futuro", () => {
    const grid = consistencyGrid("2026-10-02", 13, new Map([["2026-10-01", 5]]), addDays, startOfWeekMonday);
    expect(grid).toHaveLength(13);
    expect(grid[0][0].day).toBe("2026-07-06");
    const last = grid.at(-1)!;
    expect(last[0].day).toBe("2026-09-28");
    expect(last[3]).toMatchObject({ day: "2026-10-01", meals: 5, level: 3 });
    expect(last[4].future).toBe(false);
    expect(last[5].future).toBe(true);
  });

  it("franjas horarias", () => {
    expect(slotForMinutes(8 * 60)).toBe("MORNING");
    expect(slotForMinutes(14 * 60)).toBe("MIDDAY");
    expect(slotForMinutes(18 * 60)).toBe("AFTERNOON");
    expect(slotForMinutes(22 * 60)).toBe("NIGHT");
    expect(slotForMinutes(2 * 60)).toBe("NIGHT");
  });

  const entries: HungerEntry[] = [
    ...Array.from({ length: 4 }, () => ({ type: "DINNER" as const, minutes: 21 * 60, hunger: 5, fullness: 4 })),
    ...Array.from({ length: 4 }, () => ({ type: "BREAKFAST" as const, minutes: 8 * 60, hunger: 2, fullness: 2 })),
    { type: "LUNCH", minutes: 14 * 60, hunger: null, fullness: null },
  ];

  it("hambre y saciedad: sin frases hasta las dos semanas", () => {
    const a = hungerAnalysis(entries, 5);
    expect(a.count).toBe(8);
    expect(a.daysToInsights).toBe(9);
    expect(a.insights).toEqual([]);
    expect(a.byType.map((r) => r.type)).toEqual(["BREAKFAST", "DINNER"]);
    expect(a.byType[1]).toMatchObject({ hunger: 5, fullness: 4, count: 4 });
  });

  it("hambre y saciedad: frases neutras con dos semanas de datos", () => {
    const a = hungerAnalysis(entries, 20);
    expect(a.daysToInsights).toBe(0);
    expect(a.insights[0]).toBe("Sueles llegar con más hambre a la cena (5,0 de 5).");
    expect(a.insights.some((t) => t.startsWith("Después del desayuno"))).toBe(true);
    expect(a.insights.some((t) => t.startsWith("Por la noche"))).toBe(true);
    // Nunca juzga: nada de «demasiado», «mal» ni «te has pasado».
    for (const t of a.insights) expect(t).not.toMatch(/demasiad|mal |pasad|exceso|culpa/i);
  });

  it("hambre y saciedad: estable si no hay nada destacable", () => {
    const flat: HungerEntry[] = Array.from({ length: 6 }, (_, i) => ({ type: i % 2 ? "LUNCH" : "DINNER", minutes: i % 2 ? 14 * 60 : 21 * 60, hunger: 3, fullness: 3 }));
    expect(hungerAnalysis(flat, 30).insights).toEqual(["Tu hambre y tu saciedad se mantienen bastante parecidas de una comida a otra."]);
  });
});

describe("XP y logros de comida", () => {
  it("solo dan XP los registros de hoy o de ayer", () => {
    expect(foodXpDay("2026-10-02", "2026-10-02", "2026-10-01")).toBe(true);
    expect(foodXpDay("2026-10-01", "2026-10-02", "2026-10-01")).toBe(true);
    expect(foodXpDay("2026-09-20", "2026-10-02", "2026-10-01")).toBe(false);
  });

  it("los XP de comida son los del enunciado", () => {
    expect(FOOD_XP).toEqual({ mealsDay: 10, water: 10, protein: 10, hunger: 2, weighIn: 5 });
  });

  it("los seis logros de comida y peso existen", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    for (const id of ["gota-a-gota", "diario-constante", "proteina-al-dia", "primeros-2-kg", "mitad-del-camino", "objetivo-peso"]) expect(ids).toContain(id);
    const base = { waterRun: 0, proteinRun: 0, mealDays: 0, weightProgressKg: 0, weightHalf: false, weightGoalAchieved: false };
    const got = (m: Partial<typeof base>) =>
      ACHIEVEMENTS.filter((a) => a.needs.every((n) => n in base) && a.test({ ...base, ...m } as never)).map((a) => a.id);
    expect(got({ waterRun: 7 })).toEqual(["gota-a-gota"]);
    expect(got({ waterRun: 6, proteinRun: 7 })).toEqual(["proteina-al-dia"]);
    expect(got({ mealDays: 30 })).toEqual(["diario-constante"]);
    expect(got({ weightProgressKg: 2 })).toEqual(["primeros-2-kg"]);
  });

  it("los kilos de progreso siguen la dirección del objetivo", () => {
    expect(progressKg(90, 80, 87.5)).toBeCloseTo(2.5);
    expect(progressKg(90, 80, 91)).toBe(0);
    expect(progressKg(60, 66, 62.4)).toBeCloseTo(2.4);
    expect(progressKg(60, 66, null)).toBe(0);
  });

  it("las frases de comida, agua y peso nunca juzgan", () => {
    const food = ["comidas_dia", "agua_objetivo", "proteina_objetivo", "hambre_anotada", "pesaje", "hito_peso", "recalcular", "ir_despacio", "noti_agua", "noti_pesaje"] as const;
    for (const s of food) {
      expect(MESSAGES[s].length, s).toBeGreaterThan(1);
      for (const m of MESSAGES[s]) expect(m.text, m.id).not.toMatch(/pasad|demasiad|exceso|culpa|gord|mal\b|engord|cuidado con/i);
    }
  });

  it("hábitos sanos predefinidos", () => {
    expect(HEALTHY_HABITS.map((h) => h.name)).toEqual(["Verdura en la comida", "Fruta en el día", "Nada de picoteo después de cenar", "Sin refrescos"]);
  });
});

describe("ir más despacio", () => {
  const pt = (day: string, trend: number) => ({ day, kg: trend, trend });
  it("avisa si baja más de un 1 % por semana dos semanas seguidas", () => {
    const fast = [pt("2026-09-10", 100.4), pt("2026-09-17", 100), pt("2026-09-24", 98.6), pt("2026-10-01", 97.4)];
    expect(losingTooFast(fast, "2026-10-02")).toBe(true);
  });
  it("no avisa si una de las dos semanas va a buen ritmo", () => {
    const ok = [pt("2026-09-15", 100), pt("2026-09-25", 99.5), pt("2026-10-01", 98.2)];
    expect(losingTooFast(ok, "2026-10-02")).toBe(false);
  });
  it("no avisa sin datos suficientes o recientes", () => {
    expect(losingTooFast([pt("2026-09-25", 100), pt("2026-10-01", 97)], "2026-10-02")).toBe(false);
    expect(losingTooFast([pt("2026-09-01", 100), pt("2026-09-10", 97), pt("2026-09-20", 94)], "2026-10-02")).toBe(false);
  });
  it("subir de peso nunca activa el aviso", () => {
    expect(losingTooFast([pt("2026-09-15", 60), pt("2026-09-25", 62), pt("2026-10-01", 64)], "2026-10-02")).toBe(false);
  });
});

describe("recordatorios de agua y pesaje", () => {
  const tz = "Europe/Madrid";
  const local = (d: Date) => formatInTimeZone(d, tz, "EEE yyyy-MM-dd HH:mm");

  it("agua esperada: reparto entre despertar y dormir", () => {
    expect(expectedWater(2000, 450, 450, 1380)).toBe(0);
    expect(expectedWater(2000, 915, 450, 1380)).toBe(1000);
    expect(expectedWater(2000, 1400, 450, 1380)).toBe(2000);
  });

  it("solo recuerda si va por detrás al menos un vaso, dentro de sus horas", () => {
    const base = { wake: 450, sleep: 1380, target: 2000, glass: 250 };
    expect(shouldRemindWater({ ...base, minutes: 915, drunk: 500 })).toBe(true); // tocaba 1 L
    expect(shouldRemindWater({ ...base, minutes: 915, drunk: 800 })).toBe(false); // menos de un vaso de diferencia
    expect(shouldRemindWater({ ...base, minutes: 500, drunk: 0 })).toBe(false); // recién despierto
    expect(shouldRemindWater({ ...base, minutes: 1370, drunk: 0 })).toBe(false); // a punto de dormir
    expect(shouldRemindWater({ ...base, minutes: 1000, drunk: 2000 })).toBe(false); // ya llegó
  });

  it("después de un aviso, 2 horas; si no, media hora; de noche, al día siguiente", () => {
    const at = (iso: string) => new Date(iso);
    expect(local(nextWaterCheck({ reminded: true, wake: 450, sleep: 1380, tz, now: at("2026-10-02T10:00:00Z") }))).toBe("Fri 2026-10-02 14:00");
    expect(local(nextWaterCheck({ reminded: false, wake: 450, sleep: 1380, tz, now: at("2026-10-02T10:00:00Z") }))).toBe("Fri 2026-10-02 12:30");
    expect(local(nextWaterCheck({ reminded: true, wake: 450, sleep: 1380, tz, now: at("2026-10-02T19:00:00Z") }))).toBe("Sat 2026-10-03 09:30");
    expect(local(nextWaterCheck({ reminded: false, wake: 450, sleep: 1380, tz, now: at("2026-10-02T04:00:00Z") }))).toBe("Fri 2026-10-02 09:30");
  });

  it("pesaje: los días elegidos, 15 minutos después de despertar", () => {
    const now = new Date("2026-10-02T10:00:00Z"); // viernes
    expect(local(nextWeighInAt(1, 450, tz, now)!)).toBe("Mon 2026-10-05 07:45");
    expect(local(nextWeighInAt(2, 450, tz, now)!)).toBe("Mon 2026-10-05 07:45");
    expect(local(nextWeighInAt(3, 420, tz, new Date("2026-10-05T10:00:00Z"))!)).toBe("Wed 2026-10-07 07:15");
    expect(local(nextWeighInAt(2, 450, tz, new Date("2026-10-05T10:00:00Z"))!)).toBe("Thu 2026-10-08 07:45");
    expect(nextWeighInAt(0, 450, tz, now)).toBeNull();
  });
});

describe("ración de un alimento", () => {
  it("combina el factor en vez de acumularlo", () => {
    expect(scaledQuantity("1 plato", 1.5)).toBe("1 plato ×1,5");
    expect(scaledQuantity("1 plato ×1,5", 2)).toBe("1 plato ×3");
    expect(scaledQuantity("1 plato ×1,5", 1 / 1.5)).toBe("1 plato");
    expect(scaledQuantity("200 g ×0,5", 0.5)).toBe("200 g ×0,25");
    expect(scaledQuantity("", 2)).toBe("×2");
  });
});
