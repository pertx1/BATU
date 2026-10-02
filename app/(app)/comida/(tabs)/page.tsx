import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isDateStr, todayStr } from "@/lib/dates";
import { getDiary } from "@/lib/data/nutrition";
import { PageBody } from "@/components/app/page-header";
import { CaloriesCard, DayPicker, FullnessPrompt, MacroPager, MealList, WaterCard } from "@/components/nutrition/diary";

export const metadata: Metadata = { title: "Comida" };

export default async function DiaryPage({ searchParams }: PageProps<"/comida">) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const today = todayStr(user.timezone);
  // Un día pasado elegido en el calendario (nunca el futuro).
  const day = typeof sp.dia === "string" && isDateStr(sp.dia) && sp.dia < today ? sp.dia : today;
  const diary = await getDiary(user, day);
  if (!diary) redirect("/nutricion/bienvenida");

  return (
    <PageBody>
      <DayPicker day={day} today={today} />
      <FullnessPrompt diary={diary} />
      <div className="mt-2 space-y-3">
        <CaloriesCard diary={diary} />
        <MacroPager key={day} diary={diary} />
        <WaterCard diary={diary} />
      </div>
      <MealList diary={diary} />
    </PageBody>
  );
}
