import type { Recurrence } from "@prisma/client";
import { addDays, addMonthsClamped, dayOfWeek, type DateStr } from "@/lib/dates";

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  NONE: "No se repite",
  DAILY: "Cada día",
  WEEKDAYS: "Días concretos",
  WEEKLY: "Cada semana",
  MONTHLY: "Cada mes",
};

/** Siguiente fecha tras `from` según la regla (un solo paso). */
export function stepRecurrence(
  from: DateStr,
  recurrence: Recurrence,
  days: number[],
  monthDay: number,
): DateStr | null {
  switch (recurrence) {
    case "DAILY":
      return addDays(from, 1);
    case "WEEKLY":
      return addDays(from, 7);
    case "MONTHLY":
      return addMonthsClamped(from, 1, monthDay);
    case "WEEKDAYS": {
      if (days.length === 0) return addDays(from, 1);
      for (let i = 1; i <= 7; i++) {
        const candidate = addDays(from, i);
        if (days.includes(dayOfWeek(candidate))) return candidate;
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Fecha de la siguiente ocurrencia al completar una tarea repetitiva.
 * Avanza desde su fecha hasta pasar de hoy: completar tarde no deja
 * ocurrencias atrasadas, y completar antes de tiempo salta a la siguiente.
 */
export function nextOccurrence(
  dueDate: DateStr,
  today: DateStr,
  recurrence: Recurrence,
  days: number[],
): DateStr | null {
  if (recurrence === "NONE") return null;
  const monthDay = Number(dueDate.slice(8, 10));
  let next = stepRecurrence(dueDate, recurrence, days, monthDay);
  let guard = 0;
  while (next && next <= today && guard < 1000) {
    next = stepRecurrence(next, recurrence, days, monthDay);
    guard++;
  }
  return next;
}

/**
 * Ocurrencia que toca ahora de una tarea repetitiva que no se hizo a tiempo:
 * la última fecha de la serie que no pasa de hoy. Con «cada día» es hoy; con
 * «cada semana» el último día de la serie (que puede seguir siendo anterior a
 * hoy). Devuelve null si la tarea ya está en su ocurrencia actual.
 */
export function currentOccurrence(
  dueDate: DateStr,
  today: DateStr,
  recurrence: Recurrence,
  days: number[],
): DateStr | null {
  if (recurrence === "NONE" || dueDate >= today) return null;
  const monthDay = Number(dueDate.slice(8, 10));
  let current: DateStr = dueDate;
  let next = stepRecurrence(current, recurrence, days, monthDay);
  let guard = 0;
  while (next && next <= today && guard < 1000) {
    current = next;
    next = stepRecurrence(current, recurrence, days, monthDay);
    guard++;
  }
  return current === dueDate ? null : current;
}
