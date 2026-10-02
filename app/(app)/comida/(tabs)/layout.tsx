import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { foodStreak } from "@/lib/data/nutrition";
import { PageHeader } from "@/components/app/page-header";
import { FoodHeaderButtons } from "@/components/nutrition/food-header-buttons";
import { FoodTabs } from "@/components/nutrition/food-tabs";
import { FoodFab } from "@/components/nutrition/food-fab";

/** Cabecera común de Diario, Análisis y Peso. La primera vez, el cuestionario. */
export default async function FoodLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  const [profile, streak] = await Promise.all([
    db.nutritionProfile.findUnique({ where: { userId: user.id }, select: { glassMl: true, bottleMl: true } }),
    foodStreak(user.id, todayStr(user.timezone)),
  ]);
  if (!profile) redirect("/nutricion/bienvenida");
  return (
    <>
      <PageHeader title="Comida" right={<FoodHeaderButtons streak={streak} />} />
      <div className="mx-auto max-w-xl px-5 pb-1">
        <FoodTabs />
      </div>
      {children}
      <FoodFab glassMl={profile.glassMl} bottleMl={profile.bottleMl} />
    </>
  );
}
