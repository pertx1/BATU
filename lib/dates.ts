import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";

export const DEFAULT_TZ = "Europe/Madrid";

/** Formatea un instante en la zona horaria del usuario (en español). */
export function formatTz(date: Date, timeZone: string, pattern: string): string {
  return formatInTimeZone(date, timeZone, pattern, { locale: es });
}

/** Hora local (0-23) del usuario en este instante. */
export function localHour(date: Date, timeZone: string): number {
  return Number(formatInTimeZone(date, timeZone, "H"));
}

export function greeting(date: Date, timeZone: string): string {
  const h = localHour(date, timeZone);
  if (h >= 6 && h < 14) return "Buenos días";
  if (h >= 14 && h < 21) return "Buenas tardes";
  return "Buenas noches";
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
