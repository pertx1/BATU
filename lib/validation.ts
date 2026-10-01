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
