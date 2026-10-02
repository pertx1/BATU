import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { foodStreak } from "@/lib/data/nutrition";
import { aiConfigured } from "@/lib/nutrition/ai";
import { PageHeader } from "@/components/app/page-header";
import { FoodHeaderButtons } from "@/components/nutrition/food-header-buttons";
import { FoodTabs } from "@/components/nutrition/food-tabs";
import { FoodFab } from "@/components/nutrition/food-fab";

/** Cabecera común de Diario, Análisis y Peso. La primera vez, el cuestionario. */
export default async function FoodLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  const [profile, streak, favorites] = await Promise.all([
    db.nutritionProfile.findUnique({ where: { userId: user.id }, select: { glassMl: true, bottleMl: true, aiEnabled: true, hideNumbers: true } }),
    foodStreak(user.id, todayStr(user.timezone)),
    // Las habituales: primero las más usadas.
    db.favoriteMeal.findMany({
      where: { userId: user.id },
      orderBy: [{ useCount: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, type: true, kcal: true, photoKey: true },
    }),
  ]);
  if (!profile) redirect("/nutricion/bienvenida");
  return (
    <>
      <PageHeader title="Comida" right={<FoodHeaderButtons streak={streak} />} />
      <div className="mx-auto max-w-xl px-5 pb-1">
        <FoodTabs />
      </div>
      {children}
      <FoodFab
        glassMl={profile.glassMl}
        bottleMl={profile.bottleMl}
        aiAvailable={profile.aiEnabled && aiConfigured()}
        hideNumbers={profile.hideNumbers}
        favorites={favorites.map((f) => ({ id: f.id, name: f.name, type: f.type ?? "LUNCH", kcal: f.kcal, hasPhoto: !!f.photoKey }))}
      />
    </>
  );
}
