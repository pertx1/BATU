import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { isDateStr, todayStr } from "@/lib/dates";
import { listProjects } from "@/lib/data/common";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { EventForm } from "@/components/calendar/event-form";

export const metadata: Metadata = { title: "Nuevo evento" };

export default async function NewEventPage({ searchParams }: PageProps<"/calendario/evento/nuevo">) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const date = isDateStr(sp.date) ? sp.date : todayStr(user.timezone);
  const back =
    typeof sp.back === "string" && sp.back.startsWith("/") && !sp.back.startsWith("//") ? sp.back : `/calendario?d=${date}`;
  const projects = await listProjects(user.id);
  return (
    <>
      <PageHeader title="Nuevo evento" back={back} />
      <PageBody>
        <EventForm projects={projects} defaultDate={date} returnTo={back} />
      </PageBody>
    </>
  );
}
