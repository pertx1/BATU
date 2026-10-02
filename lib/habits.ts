import { addDays, dayOfWeek, startOfWeekMonday, WEEKDAYS_SHORT, WEEK_ORDER, type DateStr } from "@/lib/dates";

export function isScheduledOn(daysOfWeek: number[], date: DateStr): boolean {
  return daysOfWeek.length === 0 || daysOfWeek.includes(dayOfWeek(date));
}

/**
 * Racha actual: días programados consecutivos cumplidos hasta hoy. Si hoy toca
 * y aún no está hecho, no rompe la racha (el día no ha terminado).
 */
export function currentStreak(
  daysOfWeek: number[],
  done: Set<DateStr>,
  today: DateStr,
  since: DateStr,
): number {
  let streak = 0;
  let day = today;
  if (isScheduledOn(daysOfWeek, day) && !done.has(day)) day = addDays(day, -1);
  for (let i = 0; i < 3660 && day >= since; i++) {
    if (isScheduledOn(daysOfWeek, day)) {
      if (!done.has(day)) break;
      streak++;
    } else if (done.has(day)) {
      streak++; // hecho un día que no tocaba: suma, pero no rompe
    }
    day = addDays(day, -1);
  }
  return streak;
}

/** Mejor racha histórica desde `since` hasta hoy. */
export function bestStreak(
  daysOfWeek: number[],
  done: Set<DateStr>,
  today: DateStr,
  since: DateStr,
): number {
  let best = 0;
  let run = 0;
  for (let day = since, i = 0; day <= today && i < 3660; day = addDays(day, 1), i++) {
    if (done.has(day)) {
      run++;
      best = Math.max(best, run);
    } else if (isScheduledOn(daysOfWeek, day) && day !== today) {
      run = 0;
    }
  }
  return best;
}

export type GridCell = { date: DateStr; done: boolean; scheduled: boolean; future: boolean };

/** Cuadrícula estilo GitHub: columnas = semanas (lunes→domingo), la última es la actual. */
export function habitGrid(
  daysOfWeek: number[],
  done: Set<DateStr>,
  today: DateStr,
  weeks: number,
): GridCell[][] {
  const firstMonday = addDays(startOfWeekMonday(today), -7 * (weeks - 1));
  const columns: GridCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: GridCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(firstMonday, w * 7 + d);
      col.push({
        date,
        done: done.has(date),
        scheduled: isScheduledOn(daysOfWeek, date),
        future: date > today,
      });
    }
    columns.push(col);
  }
  return columns;
}

/** Días programados y cumplidos en un rango [from, to]. */
export function habitTally(
  daysOfWeek: number[],
  done: Set<DateStr>,
  from: DateStr,
  to: DateStr,
): { scheduled: number; hit: number } {
  let scheduled = 0;
  let hit = 0;
  for (let day = from, i = 0; day <= to && i < 3660; day = addDays(day, 1), i++) {
    if (isScheduledOn(daysOfWeek, day)) {
      scheduled++;
      if (done.has(day)) hit++;
    }
  }
  return { scheduled, hit };
}

/** % de días programados cumplidos en un rango [from, to]. */
export function completionRate(
  daysOfWeek: number[],
  done: Set<DateStr>,
  from: DateStr,
  to: DateStr,
): number {
  const { scheduled, hit } = habitTally(daysOfWeek, done, from, to);
  return scheduled === 0 ? 0 : hit / scheduled;
}

export function habitDaysLabel(days: number[]): string {
  if (days.length === 0) return "Todos los días";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "Entre semana";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "Fines de semana";
  return WEEK_ORDER.filter((d) => days.includes(d)).map((d) => WEEKDAYS_SHORT[d]).join(" · ");
}


/** Hábitos sanos que se activan con un toque (desde Hábitos). */
export const HEALTHY_HABITS = [
  { name: "Verdura en la comida", emoji: "🥦", hint: "Un poco de verdura en la comida principal" },
  { name: "Fruta en el día", emoji: "🍎", hint: "Al menos una pieza de fruta" },
  { name: "Nada de picoteo después de cenar", emoji: "🌙", hint: "Cerrar la cocina después de la cena" },
  { name: "Sin refrescos", emoji: "🚰", hint: "Agua, infusiones o café en su lugar" },
] as const;
