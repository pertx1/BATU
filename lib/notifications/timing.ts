import { addDays, dayOfWeek, localDateStr, localMinutes, todayStr, zonedToUtc } from "@/lib/dates";

/** Avisos periódicos de cada usuario (columnas next*At de Settings). */
export const PERIODIC_KINDS = ["morning", "evening", "overdue", "weekly"] as const;
export type PeriodicKind = (typeof PERIODIC_KINDS)[number];

export const NEXT_FIELD = {
  morning: "nextMorningAt",
  evening: "nextEveningAt",
  overdue: "nextOverdueAt",
  weekly: "nextWeeklyAt",
} as const satisfies Record<PeriodicKind, string>;

/** Día de la revisión semanal (0 = domingo). */
export const WEEKLY_REVIEW_DAY = 0;

/** Los avisos que lleguen tarde más de esto se descartan. */
export const MAX_DELAY_MS = 2 * 60 * 60 * 1000;

export type ScheduleSettings = {
  timezone: string;
  morningTime: number;
  eveningTime: number;
  overdueTime: number;
  weeklyReviewTime: number;
};

export type DndSettings = {
  timezone: string;
  dndEnabled: boolean;
  dndStart: number;
  dndEnd: number;
};

/** Próximo instante (UTC) estrictamente posterior a `now` a esa hora local, en los días permitidos. */
export function nextLocalTimeAt(
  minutes: number,
  timeZone: string,
  now: Date,
  allowedDays?: number[],
): Date {
  const today = todayStr(timeZone, now);
  for (let i = 0; i <= 8; i++) {
    const day = addDays(today, i);
    if (allowedDays && !allowedDays.includes(dayOfWeek(day))) continue;
    const at = zonedToUtc(day, minutes, timeZone);
    if (at.getTime() > now.getTime()) return at;
  }
  // Inalcanzable (siempre hay un día válido en 8), pero por si acaso:
  return zonedToUtc(addDays(today, 7), minutes, timeZone);
}

/** Próximo disparo de un aviso periódico. */
export function nextPeriodicAt(kind: PeriodicKind, s: ScheduleSettings, now: Date): Date {
  switch (kind) {
    case "morning":
      return nextLocalTimeAt(s.morningTime, s.timezone, now);
    case "evening":
      return nextLocalTimeAt(s.eveningTime, s.timezone, now);
    case "overdue":
      return nextLocalTimeAt(s.overdueTime, s.timezone, now);
    case "weekly":
      return nextLocalTimeAt(s.weeklyReviewTime, s.timezone, now, [WEEKLY_REVIEW_DAY]);
  }
}

/** Las cuatro columnas next*At recalculadas (al cambiar ajustes o zona horaria). */
export function computeNextTimes(s: ScheduleSettings, now: Date = new Date()) {
  return {
    nextMorningAt: nextPeriodicAt("morning", s, now),
    nextEveningAt: nextPeriodicAt("evening", s, now),
    nextOverdueAt: nextPeriodicAt("overdue", s, now),
    nextWeeklyAt: nextPeriodicAt("weekly", s, now),
  };
}

/** ¿Cae esa hora local (minutos) dentro de "no molestar"? Admite franjas que cruzan medianoche. */
export function inDndWindow(minutes: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

/**
 * Momento en que se puede entregar un aviso programado para `at`: el mismo
 * instante, o el final de "no molestar" si cae dentro.
 */
export function deliverAt(at: Date, s: DndSettings): Date {
  if (!s.dndEnabled) return at;
  const m = localMinutes(at, s.timezone);
  if (!inDndWindow(m, s.dndStart, s.dndEnd)) return at;
  const day = localDateStr(at, s.timezone);
  // Franja nocturna (23:00–07:30): si estamos antes de medianoche, termina mañana.
  const endDay = s.dndStart > s.dndEnd && m >= s.dndStart ? addDays(day, 1) : day;
  return zonedToUtc(endDay, s.dndEnd, s.timezone);
}

export type Readiness = "wait" | "send" | "stale";

/** ¿Qué hacer ahora con un aviso programado para `at`? */
export function readiness(at: Date, s: DndSettings, now: Date): Readiness {
  const when = deliverAt(at, s);
  if (when.getTime() > now.getTime()) return "wait";
  if (now.getTime() - when.getTime() > MAX_DELAY_MS) return "stale";
  return "send";
}
