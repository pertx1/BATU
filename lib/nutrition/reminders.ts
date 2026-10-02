/** Cuándo recordar beber agua y pesarse (puro: lo usa el cron y los tests). */

import { addDays, localMinutes, todayStr, zonedToUtc } from "@/lib/dates";
import { nextLocalTimeAt } from "@/lib/notifications/timing";

/** Días de pesaje según la frecuencia (0 = domingo): lunes; lunes y jueves; lunes, miércoles y viernes. */
export const WEIGH_IN_DAYS: Record<number, number[]> = { 1: [1], 2: [1, 4], 3: [1, 3, 5] };

/** El recordatorio de pesaje llega 15 minutos después de despertarse. */
export const WEIGH_IN_AFTER_WAKE = 15;

/** Agua: como mucho un aviso cada 2 horas; sin avisos las 2 primeras horas del día ni la última media hora. */
export const WATER_GAP_MS = 2 * 60 * 60 * 1000;
export const WATER_CHECK_MS = 30 * 60 * 1000;
const WATER_START_AFTER_WAKE = 120;
const WATER_STOP_BEFORE_SLEEP = 30;

export function nextWeighInAt(perWeek: number, wakeTime: number, tz: string, now: Date): Date | null {
  const days = WEIGH_IN_DAYS[perWeek];
  if (!days) return null;
  return nextLocalTimeAt(wakeTime + WEIGH_IN_AFTER_WAKE, tz, now, days);
}

/** Agua que «tocaría» llevar a esta hora: reparto lineal entre despertar y dormir. */
export function expectedWater(target: number, minutes: number, wake: number, sleep: number): number {
  if (minutes <= wake) return 0;
  if (minutes >= sleep || sleep <= wake) return target;
  return Math.round((target * (minutes - wake)) / (sleep - wake));
}

/** ¿Está dentro de las horas en que se puede recordar beber? */
export function inWaterWindow(minutes: number, wake: number, sleep: number): boolean {
  return minutes >= wake + WATER_START_AFTER_WAKE && minutes < sleep - WATER_STOP_BEFORE_SLEEP;
}

/** Recordar solo si va por detrás al menos un vaso y aún no ha llegado al objetivo. */
export function shouldRemindWater(input: { minutes: number; wake: number; sleep: number; drunk: number; target: number; glass: number }): boolean {
  const { minutes, wake, sleep, drunk, target, glass } = input;
  if (!inWaterWindow(minutes, wake, sleep) || drunk >= target) return false;
  return drunk + Math.max(glass, 100) <= expectedWater(target, minutes, wake, sleep);
}

/**
 * Próxima comprobación del agua: tras un aviso, 2 horas; si no, media hora.
 * Fuera de las horas permitidas, al empezar las de mañana (o las de hoy).
 */
export function nextWaterCheck(input: { reminded: boolean; wake: number; sleep: number; tz: string; now: Date }): Date {
  const { reminded, wake, sleep, tz, now } = input;
  const next = new Date(now.getTime() + (reminded ? WATER_GAP_MS : WATER_CHECK_MS));
  const minutes = localMinutes(next, tz);
  if (inWaterWindow(minutes, wake, sleep) && todayStr(tz, next) === todayStr(tz, now)) return next;
  // Empieza la ventana de hoy (si aún no ha llegado) o la de mañana.
  const startToday = zonedToUtc(todayStr(tz, now), wake + WATER_START_AFTER_WAKE, tz);
  if (startToday.getTime() > now.getTime()) return startToday;
  return zonedToUtc(addDays(todayStr(tz, now), 1), wake + WATER_START_AFTER_WAKE, tz);
}
