import "server-only";
import { z } from "zod";
import type { Task } from "@prisma/client";
import { dbToDateStr, localDateStr, localMinutes, todayStr } from "@/lib/dates";
import { computeTaskTiming } from "@/lib/schedule";
import { dateStrSchema, hhmmSchema, idSchema, weekdaysSchema } from "@/lib/validation";

export const REMINDER_BEFORE_OPTIONS = [0, 5, 10, 15, 30, 60, 120, 1440] as const;

export const taskFieldsSchema = z.object({
  title: z.string().trim().min(1, "Escribe un título").max(300, "Título demasiado largo"),
  notes: z.string().max(5000).nullable(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  dueDate: dateStrSchema.nullable(),
  time: hhmmSchema.nullable(),
  projectId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  reminderMode: z.enum(["NONE", "AT_TIME", "BEFORE"]),
  reminderDate: dateStrSchema.nullable(),
  reminderTime: hhmmSchema.nullable(),
  reminderMinutesBefore: z
    .number()
    .int()
    .refine((n) => (REMINDER_BEFORE_OPTIONS as readonly number[]).includes(n), "Aviso no válido")
    .nullable(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKDAYS", "WEEKLY", "MONTHLY"]),
  recurrenceDays: weekdaysSchema,
});

export const createTaskSchema = taskFieldsSchema.partial().extend({
  title: taskFieldsSchema.shape.title,
  subtasks: z.array(z.string().trim().min(1).max(300)).max(50).optional(),
});

export const updateTaskSchema = taskFieldsSchema.partial();

type Fields = z.infer<typeof taskFieldsSchema>;

/** Valores actuales de una tarea expresados como los manda el cliente. */
export function taskToFields(t: Task, timeZone: string): Fields {
  return {
    title: t.title,
    notes: t.notes,
    priority: t.priority,
    dueDate: t.dueDate ? dbToDateStr(t.dueDate) : null,
    time: t.dueAt ? localMinutes(t.dueAt, timeZone) : null,
    projectId: t.projectId,
    goalId: t.goalId,
    reminderMode: t.reminderMode,
    reminderDate: t.reminderAt ? localDateStr(t.reminderAt, timeZone) : null,
    reminderTime: t.reminderAt ? localMinutes(t.reminderAt, timeZone) : null,
    reminderMinutesBefore: t.reminderMinutesBefore,
    recurrence: t.recurrence,
    recurrenceDays: t.recurrenceDays,
  };
}

export const DEFAULT_FIELDS: Omit<Fields, "title"> = {
  notes: null,
  priority: "MEDIUM",
  dueDate: null,
  time: null,
  projectId: null,
  goalId: null,
  reminderMode: "NONE",
  reminderDate: null,
  reminderTime: null,
  reminderMinutesBefore: null,
  recurrence: "NONE",
  recurrenceDays: [],
};

/** Convierte los campos (hora local) en columnas de la BD (UTC). */
export function fieldsToData(f: Fields, timeZone: string) {
  let dueDate = f.dueDate;
  // Una tarea repetitiva necesita fecha de inicio.
  if (f.recurrence !== "NONE" && !dueDate) dueDate = todayStr(timeZone);
  const recurrenceDays = f.recurrence === "WEEKDAYS" ? f.recurrenceDays : [];
  const recurrence = f.recurrence === "WEEKDAYS" && recurrenceDays.length === 0 ? "NONE" : f.recurrence;
  const timing = computeTaskTiming(
    {
      dueDate,
      time: dueDate ? f.time : null,
      reminderMode: f.reminderMode,
      reminderDate: f.reminderDate,
      reminderTime: f.reminderTime,
      reminderMinutesBefore: f.reminderMinutesBefore,
    },
    timeZone,
  );
  return {
    title: f.title,
    notes: f.notes?.trim() ? f.notes.trim() : null,
    priority: f.priority,
    projectId: f.projectId,
    goalId: f.goalId,
    recurrence,
    recurrenceDays,
    ...timing,
  };
}
