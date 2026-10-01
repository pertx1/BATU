import { z } from "zod";

export const emailSchema = z
  .string({ error: "Escribe tu email" })
  .trim()
  .toLowerCase()
  .max(254, "Email demasiado largo")
  .pipe(z.email({ error: "El email no es válido" }));

export const passwordSchema = z
  .string({ error: "Escribe una contraseña" })
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(200, "La contraseña es demasiado larga");

export const timezoneSchema = z
  .string()
  .max(64)
  .refine(isValidTimeZone, "Zona horaria no válida");

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("es-ES", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const idSchema = z.string().min(1).max(64);

export const dateStrSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida")
  .refine((s) => {
    const d = new Date(s + "T00:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Fecha no válida");

/** "HH:mm" → minutos desde medianoche. */
export const hhmmSchema = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Hora no válida")
  .transform((s) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  });

export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color no válido");

export const emojiSchema = z.string().trim().max(16);

export const weekdaysSchema = z
  .array(z.number().int().min(0).max(6))
  .max(7)
  .transform((d) => Array.from(new Set(d)).sort());
