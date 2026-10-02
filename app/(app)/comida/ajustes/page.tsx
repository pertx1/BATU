import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { dbToDateStr } from "@/lib/dates";
import { ageFromBirthYear, weightTrend } from "@/lib/nutrition/calc";
import { aiConfigured } from "@/lib/nutrition/ai";
import { currentYear } from "@/lib/nutrition/profile";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { NutritionSettings } from "@/components/nutrition/nutrition-settings";

export const metadata: Metadata = { title: "Ajustes de nutrición" };

export default async function FoodSettingsPage() {
  const user = await requireOnboardedUser();
  const [p, logs] = await Promise.all([
    db.nutritionProfile.findUnique({ where: { userId: user.id } }),
    db.weightLog.findMany({ where: { userId: user.id }, orderBy: { day: "desc" }, take: 60, select: { day: true, kg: true } }),
  ]);
  if (!p) redirect("/nutricion/bienvenida");
  // Peso de partida para recalcular: la tendencia de los pesajes (o el del último cálculo).
  const trend = weightTrend(logs.reverse().map((l) => ({ day: dbToDateStr(l.day), kg: l.kg }))).at(-1)?.trend;
  const weightKg = Math.round((trend ?? p.weightAtCalc) * 10) / 10;

  return (
    <>
      <PageHeader title="Ajustes de nutrición" back="/comida" />
      <PageBody>
        <NutritionSettings
          initial={{
            plan: {
              sex: p.sex,
              age: ageFromBirthYear(p.birthYear, currentYear(user.timezone)),
              heightCm: p.heightCm,
              weightKg,
              activity: p.activity,
              goal: p.goal,
              pace: p.pace,
              targetWeightKg: p.targetWeightKg,
            },
            bmr: p.bmr,
            targets: { kcal: p.kcalTarget, proteinG: p.proteinG, carbsG: p.carbsG, fatG: p.fatG, fiberG: p.fiberG, waterMl: p.waterMl },
            manualTargets: p.manualTargets,
            aiEnabled: p.aiEnabled,
            aiConfigured: aiConfigured(),
            hideNumbers: p.hideNumbers,
            glassMl: p.glassMl,
            bottleMl: p.bottleMl,
            wakeTime: p.wakeTime,
            sleepTime: p.sleepTime,
            waterReminders: p.waterReminders,
            weighInPerWeek: p.weighInPerWeek,
          }}
        />
      </PageBody>
    </>
  );
}
