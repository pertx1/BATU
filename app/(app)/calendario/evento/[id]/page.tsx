import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { capitalize, formatDateStr } from "@/lib/dates";
import { eventTimeLabel } from "@/lib/calendar-format";
import { listProjects } from "@/lib/data/common";
import { getEventView } from "@/lib/data/calendar";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { EventForm } from "@/components/calendar/event-form";

export const metadata: Metadata = { title: "Evento" };

export default async function EventPage({ params }: PageProps<"/calendario/evento/[id]">) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const [event, projects] = await Promise.all([getEventView(user.id, id, user.timezone), listProjects(user.id)]);
  if (!event) notFound();
  const back = `/calendario?d=${event.startDate}`;
  const multiDay = event.endDate !== event.startDate;

  return (
    <>
      <PageHeader title={event.title} back={back} />
      <PageBody>
        <div className="card mb-6 space-y-2 p-4">
          <p className="flex items-center gap-2 font-medium">
            <CalendarDays size={18} className="text-accent" />
            {capitalize(formatDateStr(event.startDate, "EEEE d 'de' MMMM"))}
            {multiDay ? ` – ${formatDateStr(event.endDate, "d 'de' MMMM")}` : ""}
          </p>
          <p className="pl-7 text-muted">{multiDay && !event.allDay ? `${eventTimeLabel(event, event.startDate)} · ${eventTimeLabel(event, event.endDate)}` : eventTimeLabel(event, event.startDate)}</p>
          {event.location ? (
            <p className="flex items-center gap-2 text-muted">
              <MapPin size={18} className="text-accent" /> {event.location}
            </p>
          ) : null}
          {event.project ? (
            <p className="flex items-center gap-2 pl-0.5 text-muted">
              <span className="mx-1 size-3 rounded-full" style={{ backgroundColor: event.project.color }} />
              {event.project.emoji ? `${event.project.emoji} ` : ""}
              {event.project.name}
            </p>
          ) : null}
        </div>
        <EventForm key={JSON.stringify(event)} event={event} projects={projects} defaultDate={event.startDate} returnTo={back} />
      </PageBody>
    </>
  );
}
