import "server-only";
import { z } from "zod";
import type { Event } from "@prisma/client";
import { dateStrToDb, dbToDateStr, localMinutes, zonedToUtc } from "@/lib/dates";
import { DEFAULT_REFERENCE_MINUTES } from "@/lib/schedule";
import { HttpError } from "@/lib/api";
import { dateStrSchema, hhmmSchema, idSchema } from "@/lib/validation";

export const EVENT_REMINDERS = [5, 15, 30, 60, 1440] as const;

export const eventFieldsSchema = z.object({
  title: z.string().trim().min(1, "Escribe un título").max(200, "Título demasiado largo"),
  startDate: dateStrSchema,
  endDate: dateStrSchema.nullable(),
  allDay: z.boolean(),
  startTime: hhmmSchema.nullable(),
  endTime: hhmmSchema.nullable(),
  location: z.string().trim().max(200).nullable(),
  notes: z.string().max(5000).nullable(),
  projectId: idSchema.nullable(),
  reminderMinutesBefore: z
    .number()
    .int()
    .refine((n) => (EVENT_REMINDERS as readonly number[]).includes(n), "Aviso no válido")
    .nullable(),
});

export const createEventSchema = eventFieldsSchema.partial().extend({
  title: eventFieldsSchema.shape.title,
  startDate: eventFieldsSchema.shape.startDate,
});

export const updateEventSchema = eventFieldsSchema.partial();

export type EventFields = z.infer<typeof eventFieldsSchema>;

export const DEFAULT_EVENT_FIELDS: Omit<EventFields, "title" | "startDate"> = {
  endDate: null,
  allDay: false,
  startTime: null,
  endTime: null,
  location: null,
  notes: null,
  projectId: null,
  reminderMinutesBefore: null,
};

export function eventToFields(e: Event, timeZone: string): EventFields {
  return {
    title: e.title,
    startDate: dbToDateStr(e.startDate),
    endDate: dbToDateStr(e.endDate),
    allDay: e.allDay,
    startTime: e.startAt ? localMinutes(e.startAt, timeZone) : null,
    endTime: e.endAt ? localMinutes(e.endAt, timeZone) : null,
    location: e.location,
    notes: e.notes,
    projectId: e.projectId,
    reminderMinutesBefore: e.reminderMinutesBefore,
  };
}

/** Campos en hora local → columnas de la BD (UTC). Sin hora de inicio = todo el día. */
export function eventFieldsToData(f: EventFields, timeZone: string) {
  const allDay = f.allDay || f.startTime == null;
  let endDate = f.endDate && f.endDate >= f.startDate ? f.endDate : f.startDate;

  let startAt: Date | null = null;
  let endAt: Date | null = null;
  if (!allDay) {
    startAt = zonedToUtc(f.startDate, f.startTime!, timeZone);
    if (f.endTime != null) {
      // Si la hora de fin es anterior a la de inicio en el mismo día, se entiende
      // que termina al día siguiente (p. ej. 22:00 – 01:00).
      if (endDate === f.startDate && f.endTime <= f.startTime!) {
        const next = new Date(dateStrToDb(endDate).getTime() + 86400000).toISOString().slice(0, 10);
        endDate = next;
      }
      endAt = zonedToUtc(endDate, f.endTime, timeZone);
    } else {
      endAt = new Date(startAt.getTime() + 60 * 60000); // 1 h por defecto
      endDate = f.endDate && f.endDate > f.startDate ? f.endDate : f.startDate;
    }
    if (endAt.getTime() < startAt.getTime()) throw new HttpError(400, "El evento termina antes de empezar");
  }

  const reference = startAt ?? zonedToUtc(f.startDate, DEFAULT_REFERENCE_MINUTES, timeZone);
  const remindAt =
    f.reminderMinutesBefore != null ? new Date(reference.getTime() - f.reminderMinutesBefore * 60000) : null;

  return {
    title: f.title,
    allDay,
    startDate: dateStrToDb(f.startDate),
    endDate: dateStrToDb(endDate),
    startAt,
    endAt,
    location: f.location?.trim() || null,
    notes: f.notes?.trim() || null,
    projectId: f.projectId,
    reminderMinutesBefore: f.reminderMinutesBefore,
    remindAt,
  };
}
