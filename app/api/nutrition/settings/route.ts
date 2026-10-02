import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, parseBody, withUser } from "@/lib/api";

const minutes = z.number().int().min(0).max(1439);

const schema = z
  .object({
    aiEnabled: z.boolean(),
    hideNumbers: z.boolean(),
    glassMl: z.number().int().min(50, "El vaso tiene que tener al menos 50 ml").max(1000, "Ese vaso es demasiado grande"),
    bottleMl: z.number().int().min(100, "La botella tiene que tener al menos 100 ml").max(3000, "Esa botella es demasiado grande"),
    waterMl: z.number().int().min(500, "El agua tiene que estar entre 0,5 y 6 litros").max(6000, "El agua tiene que estar entre 0,5 y 6 litros"),
    wakeTime: minutes,
    sleepTime: minutes,
    waterReminders: z.boolean(),
    weighInPerWeek: z.number().int().min(0).max(3),
  })
  .partial()
  .strict();

/** Ajustes de nutrición (los que no cambian el plan). */
export const PATCH = withUser(async (req, { userId }) => {
  const body = await parseBody(req, schema);
  const profile = await db.nutritionProfile.findUnique({ where: { userId }, select: { wakeTime: true, sleepTime: true } });
  if (!profile) throw new HttpError(409, "Antes, completa el cuestionario de Comida");
  const wake = body.wakeTime ?? profile.wakeTime;
  const sleep = body.sleepTime ?? profile.sleepTime;
  if (sleep - wake < 6 * 60) throw new HttpError(400, "La hora de dormir tiene que ser al menos 6 horas después de la de despertar");
  // Cambian las horas o los avisos: los próximos recordatorios se recalculan.
  const resetReminders =
    body.wakeTime !== undefined || body.sleepTime !== undefined || body.waterReminders !== undefined || body.weighInPerWeek !== undefined;
  await db.nutritionProfile.update({
    where: { userId },
    data: { ...body, ...(resetReminders ? { nextWaterAt: null, nextWeighInAt: null } : {}) },
  });
  return NextResponse.json({ ok: true });
});
