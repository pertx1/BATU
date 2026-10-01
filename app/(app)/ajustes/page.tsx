import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { minutesToHHMM } from "@/lib/dates";
import { getSettings } from "@/lib/data/settings";
import { vapidPublicKey } from "@/lib/push";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { NotificationsPanel } from "@/components/settings/notifications-panel";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Ajustes" };

function timezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

export default async function AjustesPage() {
  const user = await requireOnboardedUser();
  const s = await getSettings(user.id);

  return (
    <>
      <PageHeader title="Ajustes" back="/menu" />
      <PageBody>
        <section id="notificaciones" className="mb-7 scroll-mt-24">
          <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
            Notificaciones en este dispositivo
          </h2>
          {/* La clave pública se lee en tiempo de ejecución: no hace falta recompilar al añadirla. */}
          <NotificationsPanel publicKey={vapidPublicKey()} />
        </section>
        <SettingsForm
          timezones={timezones()}
          initial={{
            timezone: s.timezone,
            morningTime: minutesToHHMM(s.morningTime),
            eveningTime: minutesToHHMM(s.eveningTime),
            overdueTime: minutesToHHMM(s.overdueTime),
            weeklyReviewTime: minutesToHHMM(s.weeklyReviewTime),
            dndEnabled: s.dndEnabled,
            dndStart: minutesToHHMM(s.dndStart),
            dndEnd: minutesToHHMM(s.dndEnd),
            notifyTasks: s.notifyTasks,
            notifyEvents: s.notifyEvents,
            notifyHabits: s.notifyHabits,
            notifyMorning: s.notifyMorning,
            notifyEvening: s.notifyEvening,
            notifyOverdue: s.notifyOverdue,
            notifyWeekly: s.notifyWeekly,
          }}
        />
      </PageBody>
    </>
  );
}
