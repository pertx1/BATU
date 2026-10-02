import { after, NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, withUser } from "@/lib/api";
import { isDateStr, localMinutes, todayStr } from "@/lib/dates";
import { MEAL_TYPES } from "@/lib/nutrition/meals";
import { createMeal, runEstimate } from "@/lib/nutrition/meal-service";
import { MAX_PHOTO_BYTES, sniffImage, type PhotoUpload } from "@/lib/nutrition/photo";

// La estimación sigue después de responder: margen para la IA.
export const maxDuration = 60;

const optNum = (max: number) => z.coerce.number().min(0).max(max).optional();

const schema = z.object({
  // Por defecto, hoy y ahora (en la zona horaria del usuario).
  day: z.string().refine(isDateStr, "Fecha no válida").optional(),
  minutes: z.coerce.number().int().min(0).max(1439).optional(),
  type: z.enum(MEAL_TYPES as [string, ...string[]]).optional(),
  description: z.string().trim().max(1000, "La descripción es demasiado larga").optional(),
  hungerBefore: z.coerce.number().int().min(1).max(5).optional(),
  kcal: optNum(5000),
  proteinG: optNum(400),
  carbsG: optNum(800),
  fatG: optNum(400),
  fiberG: optNum(150),
});

/**
 * Registra una comida (multipart: foto opcional + descripción opcional).
 * Responde enseguida; la estimación con IA llega después (la lista se refresca).
 */
export const POST = withUser(async (req, { user }) => {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, "Petición no válida");
  }
  const fields: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && v !== "") fields[k] = v;
  const parsed = schema.safeParse(fields);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Datos no válidos");
  const body = parsed.data;

  let photo: PhotoUpload | null = null;
  const file = form.get("photo");
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > MAX_PHOTO_BYTES) throw new HttpError(413, "La foto es demasiado grande");
    const data = new Uint8Array(await file.arrayBuffer());
    const mediaType = sniffImage(data);
    if (!mediaType) throw new HttpError(400, "El archivo no es una foto válida (JPEG, WebP o PNG)");
    photo = { data, mediaType };
  }

  const hasManual = body.kcal !== undefined;
  const meal = await createMeal(user, {
    day: body.day ?? todayStr(user.timezone),
    minutes: body.minutes ?? localMinutes(new Date(), user.timezone),
    type: (body.type as never) ?? null,
    description: body.description || null,
    hungerBefore: body.hungerBefore ?? null,
    photo,
    manual: hasManual
      ? { kcal: Math.round(body.kcal!), proteinG: body.proteinG ?? 0, carbsG: body.carbsG ?? 0, fatG: body.fatG ?? 0, fiberG: body.fiberG ?? 0 }
      : null,
  });

  if (meal.estimating) {
    after(() => runEstimate(user.id, meal.id, { description: body.description || null, photo }));
  }
  return NextResponse.json({ id: meal.id, estimating: meal.estimating, notice: meal.notice }, { status: 201 });
});
