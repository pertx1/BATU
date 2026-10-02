import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Droplet, Flame, Info, Wheat, Zap } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatKg, GOAL_INFO } from "@/lib/nutrition/calc";
import { NUTRIENT } from "@/lib/nutrition/nutrients";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { Ring } from "@/components/nutrition/ring";

export const metadata: Metadata = { title: "Comida" };

export default async function FoodPage() {
  const user = await requireOnboardedUser();
  const profile = await db.nutritionProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/nutricion/bienvenida");

  return (
    <>
      <PageHeader title="Comida" />
      <PageBody>
        <div className="card flex items-center gap-4 p-5">
          <div className="flex-1">
            <p className="text-5xl font-bold tabular-nums tracking-tight">{profile.kcalTarget}</p>
            <p className="text-muted">calorías objetivo al día</p>
          </div>
          <Ring value={1} size={104} stroke={12} color={NUTRIENT.kcal.color} icon={<Flame size={20} />} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { g: profile.proteinG, label: "Proteína", color: NUTRIENT.protein.color, icon: <Zap size={15} fill="currentColor" /> },
            { g: profile.carbsG, label: "Carbohidratos", color: NUTRIENT.carbs.color, icon: <Wheat size={15} /> },
            { g: profile.fatG, label: "Grasa", color: NUTRIENT.fat.color, icon: <Droplet size={15} fill="currentColor" /> },
          ].map((m) => (
            <div key={m.label} className="card flex flex-col items-center p-3">
              <Ring value={1} size={64} stroke={8} color={m.color} icon={m.icon} />
              <p className="mt-2 text-lg font-bold tabular-nums">{m.g} g</p>
              <p className="text-[12px] text-muted">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="card mt-3 p-4 text-[15px]">
          <p>
            Objetivo: <b>{GOAL_INFO[profile.goal].label}</b>
            {profile.targetWeightKg ? ` · ${formatKg(profile.targetWeightKg)} kg` : ""}
          </p>
          <p className="mt-1 text-muted">
            Fibra {profile.fiberG} g · Agua {formatKg(profile.waterMl / 1000)} L · TMB {profile.bmr} kcal · Gasto {profile.tdee} kcal
          </p>
          <Link href="/nutricion/bienvenida?rehacer=1" className="btn btn-secondary mt-3 w-full">
            Rehacer el cuestionario
          </Link>
        </div>
        <p className="mt-3 flex gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] text-muted">
          <Info size={16} className="mt-0.5 shrink-0" />
          Son estimaciones orientativas y no sustituyen a un profesional de la salud.
        </p>
        <p className="mt-6 text-center text-sm text-muted">El diario de comidas, el agua y el peso llegan en las próximas fases.</p>
      </PageBody>
    </>
  );
}
