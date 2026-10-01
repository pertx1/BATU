import { minutesToHHMM, type DateStr } from "@/lib/dates";
import type { EventView } from "@/lib/types";

/** Texto de la hora de un evento en un día concreto (tiene en cuenta varios días). */
export function eventTimeLabel(e: EventView, day: DateStr): string {
  if (e.allDay) return "Todo el día";
  const starts = day === e.startDate;
  const ends = day === e.endDate;
  if (starts && ends) {
    return e.end != null && e.end !== e.start
      ? `${minutesToHHMM(e.start!)} – ${minutesToHHMM(e.end)}`
      : minutesToHHMM(e.start!);
  }
  if (starts) return `Desde las ${minutesToHHMM(e.start!)}`;
  if (ends && e.end != null) return `Hasta las ${minutesToHHMM(e.end)}`;
  return "Todo el día";
}

/** Minutos [inicio, fin) que ocupa un evento con hora dentro de un día. */
export function eventSpanOnDay(e: EventView, day: DateStr): [number, number] | null {
  if (e.allDay) return null;
  const start = day === e.startDate ? e.start ?? 0 : 0;
  const end = day === e.endDate ? e.end ?? Math.min(start + 60, 1440) : 1440;
  if (day !== e.startDate && day !== e.endDate) return null; // día intermedio → "todo el día"
  return [start, Math.max(end, start + 20)];
}
