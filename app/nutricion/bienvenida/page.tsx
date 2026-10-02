import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { NutritionOnboarding } from "@/components/nutrition/nutrition-onboarding";

export const metadata: Metadata = { title: "Tu plan de comida" };

/** Onboarding de nutrición (la primera vez que se entra en Comida, o para rehacerlo). */
export default async function NutritionWelcomePage({ searchParams }: PageProps<"/nutricion/bienvenida">) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const [profile, settings] = await Promise.all([
    db.nutritionProfile.findUnique({ where: { userId: user.id }, select: { userId: true } }),
    db.settings.findUnique({ where: { userId: user.id }, select: { gamificationEnabled: true } }),
  ]);
  if (profile && sp.rehacer !== "1") redirect("/comida");
  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-5">
      <NutritionOnboarding today={todayStr(user.timezone)} antola={settings?.gamificationEnabled ?? true} />
    </main>
  );
}
