import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { addDays, dateStrToDb, dbToDateStr, DEFAULT_TZ, localMinutes, todayStr, zonedToUtc, type DateStr } from "@/lib/dates";
import { award } from "@/lib/gamification";
import { aiConfigured, DAILY_AI_LIMIT, EstimateError, estimateMeal } from "@/lib/nutrition/ai";
import { exactFood, midpoints, readEstimate, totalsOf, type Estimate, type FoodItem } from "@/lib/nutrition/estimate";
import { MEAL_TYPE_INFO, mealTypeForMinutes, type MealType, type Totals } from "@/lib/nutrition/meals";
import { copyPhoto, deletePhoto, favoritePhotoKey, getPhoto, keyExt, mealPhotoKey, photosConfigured, putPhoto } from "@/lib/nutrition/r2";
import type { PhotoUpload } from "@/lib/nutrition/photo";

/**
 * Reserva una estimación del cupo diario (20). Devuelve false si ya no quedan.
 * Se reserva antes de llamar a la IA para que dos peticiones a la vez no se pasen.
 */
async function reserveAi(userId: string, today: DateStr): Promise<boolean> {
  const day = dateStrToDb(today);
  const usage = await db.aiUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, count: 1 },
    update: { count: { increment: 1 } },
  });
  if (usage.count <= DAILY_AI_LIMIT) return true;
  await db.aiUsage.update({ where: { userId_day: { userId, day } }, data: { count: { decrement: 1 } } });
  return false;
}

export const AI_LIMIT_MESSAGE = `Hoy ya has hecho ${DAILY_AI_LIMIT} estimaciones con IA, que es el máximo diario. Mañana vuelve a estar disponible; mientras, puedes poner los valores a mano.`;

export type NewMeal = {
  day: DateStr;
  minutes: number;
  type: MealType | null;
  description: string | null;
  hungerBefore: number | null;
  photo: PhotoUpload | null;
  /** Valores a mano (si la IA está desactivada o no disponible). */
  manual: Totals | null;
};

/**
 * Guarda una comida y, si toca, deja la estimación con IA en marcha.
 * Devuelve el id, si se está estimando y un aviso amable si no se ha podido.
 */
export async function createMeal(
  user: { id: string; timezone: string },
  input: NewMeal,
  now = new Date(),
): Promise<{ id: string; estimating: boolean; notice: string | null; photo: PhotoUpload | null }> {
  const today = todayStr(user.timezone, now);
  if (input.day > today) throw new HttpError(400, "No se puede registrar una comida en un día futuro");
  if (input.day < addDays(today, -365)) throw new HttpError(400, "Esa fecha es demasiado antigua");
  if (!input.photo && !input.description) throw new HttpError(400, "Haz una foto o describe lo que has comido");
  if (input.photo && !photosConfigured()) {
    throw new HttpError(503, "Las fotos aún no están configuradas en el servidor. De momento, describe la comida con texto.");
  }

  // La hora no puede quedar en el futuro.
  let eatenAt = zonedToUtc(input.day, input.minutes, user.timezone);
  if (eatenAt > now) eatenAt = now;
  const type = input.type ?? mealTypeForMinutes(localMinutes(eatenAt, user.timezone));

  const profile = await db.nutritionProfile.findUnique({ where: { userId: user.id }, select: { aiEnabled: true } });
  if (!profile) throw new HttpError(409, "Antes de registrar comidas, completa el cuestionario de Comida");

  let estimating = false;
  let notice: string | null = null;
  if (!input.manual && profile.aiEnabled && aiConfigured()) {
    estimating = await reserveAi(user.id, today);
    if (!estimating) notice = AI_LIMIT_MESSAGE;
  } else if (!input.manual && profile.aiEnabled) {
    notice = "La estimación con IA no está configurada. Puedes poner los valores a mano.";
  }

  const meal = await db.mealLog.create({
    data: {
      userId: user.id,
      day: dateStrToDb(input.day),
      eatenAt,
      type,
      description: input.description,
      hungerBefore: input.hungerBefore,
      status: estimating ? "PENDING" : "NONE",
      ...(input.manual ?? {}),
    },
    select: { id: true },
  });

  if (input.photo) {
    const key = mealPhotoKey(user.id, meal.id, input.photo.mediaType === "image/webp" ? "webp" : "jpg");
    try {
      await putPhoto(key, input.photo.data, input.photo.mediaType);
      await db.mealLog.update({ where: { id: meal.id }, data: { photoKey: key } });
    } catch (err) {
      console.error("[antola] R2: no se pudo subir la foto:", (err as Error).message);
      await db.mealLog.delete({ where: { id: meal.id } });
      throw new HttpError(502, "No se ha podido subir la foto. Inténtalo otra vez.");
    }
  }
  return { id: meal.id, estimating, notice, photo: input.photo };
}

/** Estima una comida ya guardada (se llama después de responder). */
export async function runEstimate(
  userId: string,
  mealId: string,
  input: { description: string | null; photo: PhotoUpload | null; correction?: { previous: Estimate; text: string } | null },
) {
  try {
    const estimate = await estimateMeal({ description: input.description, image: input.photo, correction: input.correction });
    const meal = await db.mealLog.findFirst({ where: { id: mealId, userId }, select: { name: true, day: true } });
    if (!meal) return; // la han borrado mientras tanto
    await db.mealLog.updateMany({
      where: { id: mealId, userId },
      data: {
        status: "DONE",
        name: meal.name ?? estimate.name,
        estimate: estimate as unknown as Prisma.InputJsonValue,
        confidence: estimate.confidence,
        ...midpoints(estimate),
      },
    });
    // Con los números ya puestos, puede haber llegado a la proteína del día (los XP se ven al volver).
    const tz = (await db.settings.findUnique({ where: { userId }, select: { timezone: true } }))?.timezone ?? DEFAULT_TZ;
    await award({ id: userId, timezone: tz }, { type: "food", day: dbToDateStr(meal.day), mealId });
  } catch (err) {
    const message = err instanceof EstimateError ? err.message : "No he podido estimar esta comida. Inténtalo otra vez.";
    if (!(err instanceof EstimateError)) console.error("[antola] estimación:", err);
    await db.mealLog.updateMany({ where: { id: mealId, userId }, data: { status: "FAILED", estimate: { error: message } } }).catch(() => {});
  }
}

/** Si una estimación se ha quedado colgada (el servidor se cortó), se da por fallida. */
export async function failStaleEstimates(userId: string, now = new Date()) {
  await db.mealLog.updateMany({
    where: { userId, status: "PENDING", updatedAt: { lt: new Date(now.getTime() - 3 * 60_000) } },
    data: { status: "FAILED", estimate: { error: "La estimación ha tardado demasiado. Inténtalo otra vez." } },
  });
}

/** Borra una comida y su foto. */
export async function deleteMeal(userId: string, mealId: string): Promise<boolean> {
  const meal = await db.mealLog.findFirst({ where: { id: mealId, userId }, select: { photoKey: true } });
  if (!meal) return false;
  await db.mealLog.deleteMany({ where: { id: mealId, userId } });
  if (meal.photoKey && photosConfigured()) {
    await deletePhoto(meal.photoKey).catch((err) => console.error("[antola] R2: no se pudo borrar la foto:", (err as Error).message));
  }
  return true;
}

/* ─── Corregir ────────────────────────────────────────────────────────── */

export type MealPatch = {
  name?: string | null;
  type?: MealType;
  minutes?: number;
  hungerBefore?: number | null;
  fullnessAfter?: number | null;
  /** Lista completa de alimentos editada: los totales se recalculan aquí. */
  foods?: FoodItem[];
};

/** Guarda los cambios del detalle. Devuelve el día de la comida, o null si no es del usuario. */
export async function updateMeal(user: { id: string; timezone: string }, mealId: string, patch: MealPatch, now = new Date()) {
  const meal = await db.mealLog.findFirst({ where: { id: mealId, userId: user.id } });
  if (!meal) return null;
  if (patch.foods && meal.status === "PENDING") throw new HttpError(409, "Espera a que termine de analizarse");
  const data: Prisma.MealLogUpdateManyMutationInput = {};
  if (patch.name !== undefined) data.name = patch.name?.trim() || null;
  if (patch.type) data.type = patch.type;
  if (patch.hungerBefore !== undefined) data.hungerBefore = patch.hungerBefore;
  if (patch.fullnessAfter !== undefined) data.fullnessAfter = patch.fullnessAfter;
  if (patch.minutes !== undefined) {
    const day = meal.day.toISOString().slice(0, 10);
    let eatenAt = zonedToUtc(day, patch.minutes, user.timezone);
    if (eatenAt > now) eatenAt = now;
    data.eatenAt = eatenAt;
  }
  if (patch.foods) {
    const previous = readEstimate(meal.estimate);
    const estimate: Estimate = {
      name: previous?.name ?? meal.name ?? MEAL_TYPE_INFO[meal.type].label,
      foods: patch.foods,
      totals: totalsOf(patch.foods),
      confidence: previous?.confidence ?? "alta",
      assumptions: previous?.assumptions ?? [],
    };
    Object.assign(data, {
      estimate: estimate as unknown as Prisma.InputJsonValue,
      confidence: estimate.confidence,
      status: "DONE",
      ...midpoints(estimate),
    });
  }
  await db.mealLog.updateMany({ where: { id: mealId, userId: user.id }, data });
  return dbToDateStr(meal.day);
}

/**
 * Vuelve a estimar una comida (con una corrección como «era media ración» o
 * sin ella si la primera vez falló). Cuenta para el límite diario.
 */
export async function reestimateMeal(user: { id: string; timezone: string }, mealId: string, correction: string | null, now = new Date()) {
  const meal = await db.mealLog.findFirst({ where: { id: mealId, userId: user.id } });
  if (!meal) return null;
  if (meal.status === "PENDING") throw new HttpError(409, "Ya se está analizando");
  if (!aiConfigured()) throw new HttpError(503, "La estimación con IA no está configurada. Puedes corregir los valores a mano.");
  const profile = await db.nutritionProfile.findUnique({ where: { userId: user.id }, select: { aiEnabled: true } });
  if (!profile?.aiEnabled) throw new HttpError(409, "Tienes la estimación con IA desactivada en los ajustes de nutrición.");
  if (!meal.description && !meal.photoKey && !correction) throw new HttpError(400, "Escribe qué has comido para poder estimarlo");
  if (!(await reserveAi(user.id, todayStr(user.timezone, now)))) throw new HttpError(429, AI_LIMIT_MESSAGE);

  let photo: PhotoUpload | null = null;
  if (meal.photoKey && photosConfigured()) {
    const p = await getPhoto(meal.photoKey).catch(() => null);
    if (p) photo = { data: p.body, mediaType: (["image/jpeg", "image/webp", "image/png"].includes(p.contentType) ? p.contentType : "image/jpeg") as PhotoUpload["mediaType"] };
  }
  const previous = readEstimate(meal.estimate);
  await db.mealLog.updateMany({ where: { id: mealId, userId: user.id }, data: { status: "PENDING" } });
  return {
    run: () =>
      runEstimate(user.id, mealId, {
        description: meal.description,
        photo,
        correction: correction ? { previous: previous ?? { name: meal.name ?? "", foods: [], totals: totalsOf([]), confidence: "baja", assumptions: [] }, text: correction } : null,
      }),
  };
}

/* ─── Comidas habituales ──────────────────────────────────────────────── */

/** Estimación de una comida (si se puso a mano, un único alimento con sus totales). */
function estimateFor(meal: { estimate: Prisma.JsonValue; name: string | null; type: MealType } & Totals): Estimate {
  const e = readEstimate(meal.estimate);
  if (e && e.foods.length) return e;
  const name = meal.name ?? MEAL_TYPE_INFO[meal.type].label;
  const foods = meal.kcal > 0 ? [exactFood(name, "1 ración", { kcal: meal.kcal, protein: meal.proteinG, carbs: meal.carbsG, fat: meal.fatG, fiber: meal.fiberG })] : [];
  return { name, foods, totals: totalsOf(foods), confidence: "alta", assumptions: [] };
}

/** «Guardar como comida habitual»: se copia todo (foto incluida) para reutilizarla sin llamar a la IA. */
export async function saveFavorite(userId: string, mealId: string, name: string | null) {
  const meal = await db.mealLog.findFirst({ where: { id: mealId, userId } });
  if (!meal) return null;
  if (meal.status === "PENDING") throw new HttpError(409, "Espera a que termine de analizarse");
  const estimate = estimateFor(meal);
  if (!estimate.foods.length) throw new HttpError(400, "Añade al menos un alimento antes de guardarla");
  if ((await db.favoriteMeal.count({ where: { userId } })) >= 100) throw new HttpError(400, "Ya tienes 100 comidas habituales. Borra alguna para guardar más.");
  const fav = await db.favoriteMeal.create({
    data: {
      userId,
      name: (name?.trim() || meal.name || estimate.name).slice(0, 80),
      type: meal.type,
      estimate: estimate as unknown as Prisma.InputJsonValue,
      ...midpoints(estimate),
    },
    select: { id: true },
  });
  if (meal.photoKey && photosConfigured()) {
    const key = favoritePhotoKey(userId, fav.id, keyExt(meal.photoKey));
    try {
      await copyPhoto(meal.photoKey, key);
      await db.favoriteMeal.update({ where: { id: fav.id }, data: { photoKey: key } });
    } catch (err) {
      console.error("[antola] R2: no se pudo copiar la foto:", (err as Error).message);
    }
  }
  return fav;
}

/** Registra una comida habitual con un toque (sin IA). */
export async function logFavorite(user: { id: string; timezone: string }, favoriteId: string, when: { day: DateStr; minutes: number }, now = new Date()) {
  const fav = await db.favoriteMeal.findFirst({ where: { id: favoriteId, userId: user.id } });
  if (!fav) return null;
  const today = todayStr(user.timezone, now);
  if (when.day > today) throw new HttpError(400, "No se puede registrar una comida en un día futuro");
  if (when.day < addDays(today, -365)) throw new HttpError(400, "Esa fecha es demasiado antigua");
  let eatenAt = zonedToUtc(when.day, when.minutes, user.timezone);
  if (eatenAt > now) eatenAt = now;
  const estimate = readEstimate(fav.estimate);
  const meal = await db.mealLog.create({
    data: {
      userId: user.id,
      day: dateStrToDb(when.day),
      eatenAt,
      type: mealTypeForMinutes(when.minutes),
      name: fav.name,
      status: "DONE",
      estimate: (estimate ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      confidence: estimate?.confidence ?? null,
      kcal: fav.kcal,
      proteinG: fav.proteinG,
      carbsG: fav.carbsG,
      fatG: fav.fatG,
      fiberG: fav.fiberG,
    },
    select: { id: true },
  });
  if (fav.photoKey && photosConfigured()) {
    const key = mealPhotoKey(user.id, meal.id, keyExt(fav.photoKey) === "webp" ? "webp" : "jpg");
    await copyPhoto(fav.photoKey, key)
      .then(() => db.mealLog.update({ where: { id: meal.id }, data: { photoKey: key } }))
      .catch((err) => console.error("[antola] R2: no se pudo copiar la foto:", (err as Error).message));
  }
  await db.favoriteMeal.update({ where: { id: fav.id }, data: { useCount: { increment: 1 }, lastUsedAt: now } });
  return meal;
}

export async function deleteFavorite(userId: string, favoriteId: string): Promise<boolean> {
  const fav = await db.favoriteMeal.findFirst({ where: { id: favoriteId, userId }, select: { photoKey: true } });
  if (!fav) return false;
  await db.favoriteMeal.deleteMany({ where: { id: favoriteId, userId } });
  if (fav.photoKey && photosConfigured()) await deletePhoto(fav.photoKey).catch(() => {});
  return true;
}
