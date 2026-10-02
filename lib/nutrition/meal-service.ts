import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { addDays, dateStrToDb, localMinutes, todayStr, zonedToUtc, type DateStr } from "@/lib/dates";
import { aiConfigured, DAILY_AI_LIMIT, EstimateError, estimateMeal } from "@/lib/nutrition/ai";
import { midpoints, type Estimate } from "@/lib/nutrition/estimate";
import { mealTypeForMinutes, type MealType, type Totals } from "@/lib/nutrition/meals";
import { deletePhoto, mealPhotoKey, photosConfigured, putPhoto } from "@/lib/nutrition/r2";
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
    const meal = await db.mealLog.findFirst({ where: { id: mealId, userId }, select: { name: true } });
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
