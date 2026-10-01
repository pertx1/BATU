import Link from "next/link";
import { MapPin } from "lucide-react";
import { eventTimeLabel } from "@/lib/calendar-format";
import type { DateStr } from "@/lib/dates";
import type { EventView } from "@/lib/types";

export function EventRow({ event, day }: { event: EventView; day: DateStr }) {
  return (
    <Link href={`/calendario/evento/${event.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-surface-2">
      <span className="h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: event.project?.color ?? "var(--accent)" }} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{event.title}</p>
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <span>{eventTimeLabel(event, day)}</span>
          {event.location ? (
            <span className="inline-flex min-w-0 items-center gap-0.5 truncate">
              <MapPin size={12} className="shrink-0" /> {event.location}
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
