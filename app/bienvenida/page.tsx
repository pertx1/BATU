import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { minutesToHHMM } from "@/lib/dates";
import { Onboarding } from "@/components/onboarding/onboarding";

export const metadata: Metadata = { title: "Bienvenida" };

export default async function WelcomePage() {
  const user = await requireUser();
  if (user.onboardedAt) redirect("/");
  const settings = await db.settings.findUnique({ where: { userId: user.id } });
  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-5">
      <Onboarding
        initialName={user.name ?? ""}
        initialTimezone={settings?.timezone ?? user.timezone}
        initialMorning={minutesToHHMM(settings?.morningTime ?? 480)}
        initialEvening={minutesToHHMM(settings?.eveningTime ?? 1290)}
      />
    </main>
  );
}
