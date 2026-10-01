import { z } from "zod";
import { colorSchema, emojiSchema, hhmmSchema, weekdaysSchema } from "@/lib/validation";

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre").max(60, "Nombre demasiado largo"),
  color: colorSchema,
  emoji: emojiSchema.nullable().optional(),
});

export const habitSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre").max(80, "Nombre demasiado largo"),
  emoji: emojiSchema.nullable().optional(),
  color: colorSchema.nullable().optional(),
  // Los 7 días marcados equivalen a "todos los días" (lista vacía).
  daysOfWeek: weekdaysSchema.transform((d) => (d.length === 7 ? [] : d)),
  reminderTime: hhmmSchema.nullable(),
});
