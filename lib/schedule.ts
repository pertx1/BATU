import type { ReminderMode } from "@prisma/client";
import { addDays, dateStrToDb, type DateStr, zonedToUtc } from "@/lib/dates";
import { isScheduledOn } from "@/lib/habits";

/** Hora de referencia para recordatorios "X min antes" de algo sin hora. */
export const DEFAULT_REFERENCE_MINUTES = 9 * 60;

export type TaskTimingInput = {
  dueDate: DateStr | null;
  time: number | null; // minutos locales
  reminderMode: ReminderMode;
  reminderDate?: DateStr | null; // AT_TIME
  reminderTime?: number | null; // AT_TIME
  reminderMinutesBefore?: number | null; // BEFORE
};

export type TaskTiming = {
  dueDate: Date | null;
  dueAt: Date | null;
  reminderMode: ReminderMode;
  reminderAt: Date | null;
  reminderMinutesBefore: number | null;
  remindAt: Date | null;
};

/** Convierte lo que elige el usuario (hora local) en columnas UTC. */
export function computeTaskTiming(input: TaskTimingInput, timeZone: string): TaskTiming {
  const dueDate = input.dueDate ? dateStrToDb(input.dueDate) : null;
  const dueAt = input.dueDate && input.time != null ? zonedToUtc(input.dueDate, input.time, timeZone) : null;

  let reminderMode: ReminderMode = input.reminderMode;
  let reminderAt: Date | null = null;
  let reminderMinutesBefore: number | null = null;
  let remindAt: Date | null = null;

  if (reminderMode === "AT_TIME" && input.reminderDate && input.reminderTime != null) {
    reminderAt = zonedToUtc(input.reminderDate, input.reminderTime, timeZone);
    remindAt = reminderAt;
  } else if (reminderMode === "BEFORE" && input.dueDate && input.reminderMinutesBefore != null) {
    reminderMinutesBefore = input.reminderMinutesBefore;
    const reference =
      dueAt ?? zonedToUtc(input.dueDate, DEFAULT_REFERENCE_MINUTES, timeZone);
    remindAt = new Date(reference.getTime() - reminderMinutesBefore * 60000);
  } else {
    reminderMode = "NONE";
  }

  return { dueDate, dueAt, reminderMode, reminderAt, reminderMinutesBefore, remindAt };
}

/** Próximo recordatorio (UTC) de un hábito, estrictamente posterior a `now`. */
export function nextHabitReminderAt(
  daysOfWeek: number[],
  reminderTime: number | null,
  timeZone: string,
  today: DateStr,
  now: Date = new Date(),
): Date | null {
  if (reminderTime == null) return null;
  for (let i = 0; i <= 8; i++) {
    const day = addDays(today, i);
    if (!isScheduledOn(daysOfWeek, day)) continue;
    const at = zonedToUtc(day, reminderTime, timeZone);
    if (at.getTime() > now.getTime()) return at;
  }
  return null;
}
