import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { es } from "date-fns/locale";

/**
 * Convenciones de fechas de Antola:
 * - Instantes (con hora): Date en UTC.
 * - Días de calendario (sin hora): string "YYYY-MM-DD" en el código, y
 *   columna DATE en la BD (Prisma la devuelve como Date a medianoche UTC).
 * - Horas del día: minutos desde medianoche (0-1439) en la zona del usuario.
 */

export const DEFAULT_TZ = "Europe/Madrid";
export type DateStr = string; // "YYYY-MM-DD"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateStr(s: unknown): s is DateStr {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** DateStr → Date (medianoche UTC) para columnas @db.Date. */
export function dateStrToDb(s: DateStr): Date {
  return new Date(s + "T00:00:00Z");
}

/** Date de una columna @db.Date → DateStr. */
export function dbToDateStr(d: Date): DateStr {
  return d.toISOString().slice(0, 10);
}

/** Día local del usuario para un instante. */
export function localDateStr(instant: Date, timeZone: string): DateStr {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}

export function todayStr(timeZone: string, now: Date = new Date()): DateStr {
  return localDateStr(now, timeZone);
}

/** Minutos desde medianoche (hora local) de un instante. */
export function localMinutes(instant: Date, timeZone: string): number {
  const [h, m] = formatInTimeZone(instant, timeZone, "H:m").split(":").map(Number);
  return h * 60 + m;
}

/** Día local + minutos locales → instante UTC (gestiona cambios de horario). */
export function zonedToUtc(date: DateStr, minutes: number, timeZone: string): Date {
  return fromZonedTime(`${date}T${minutesToHHMM(minutes)}:00`, timeZone);
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = dateStrToDb(s);
  d.setUTCDate(d.getUTCDate() + n);
  return dbToDateStr(d);
}

export function addMonthsClamped(s: DateStr, n: number, preferredDay?: number): DateStr {
  const [y, m, d] = s.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(preferredDay ?? d, daysInMonth));
  return dbToDateStr(target);
}

/** 0 = domingo … 6 = sábado. */
export function dayOfWeek(s: DateStr): number {
  return dateStrToDb(s).getUTCDay();
}

/** Lunes de la semana de esa fecha. */
export function startOfWeekMonday(s: DateStr): DateStr {
  const dow = dayOfWeek(s);
  return addDays(s, dow === 0 ? -6 : 1 - dow);
}

export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((dateStrToDb(a).getTime() - dateStrToDb(b).getTime()) / 86400000);
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function hhmmToMinutes(s: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Formatea un instante en la zona horaria del usuario (en español). */
export function formatTz(date: Date, timeZone: string, pattern: string): string {
  return formatInTimeZone(date, timeZone, pattern, { locale: es });
}

/** Formatea un día de calendario (sin zona). */
export function formatDateStr(s: DateStr, pattern: string): string {
  return formatInTimeZone(dateStrToDb(s), "UTC", pattern, { locale: es });
}

/** "Hoy", "Mañana", "Ayer", "lun 6 oct"… relativo al día de hoy del usuario. */
export function relativeDayLabel(s: DateStr, today: DateStr): string {
  const diff = diffDays(s, today);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff > 1 && diff < 7) return capitalize(formatDateStr(s, "EEEE"));
  const sameYear = s.slice(0, 4) === today.slice(0, 4);
  return formatDateStr(s, sameYear ? "EEE d MMM" : "d MMM yyyy");
}

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

export const WEEKDAYS_SHORT = ["D", "L", "M", "X", "J", "V", "S"]; // índice = getUTCDay()
export const WEEKDAYS_NAME = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** Orden de presentación empezando en lunes. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
