import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, withUser } from "@/lib/api";
import { award } from "@/lib/gamification";
import { planInputSchema, saveProfile } from "@/lib/nutrition/profile";
import { syncWeightGoal } from "@/lib/nutrition/weight-service";

const schema = planInputSchema.extend({
  onboarding: z.boolean().default(false),
  // Desde «Recalcular» en los ajustes: si has cambiado el peso, cuenta como pesaje de hoy.
  recordWeight: z.boolean().default(false),
});

/** Crea o recalcula el perfil de nutrición (todo se calcula en el servidor). */
export const POST = withUser(async (req, { user }) => {
  const { onboarding, recordWeight, ...body } = await parseBody(req, schema);
  const { profile, plan } = await saveProfile(user, body, { firstWeighIn: onboarding || recordWeight });
  // El objetivo «Peso» sigue a la tendencia de los pesajes.
  if (!onboarding) await syncWeightGoal(user);
  // Crear el objetivo "Peso" puede desbloquear «Soñadora».
  const gamification = onboarding && profile.goalId ? await award(user, { type: "check" }) : null;
  return NextResponse.json({
    ok: true,
    plan: { kcal: plan.kcal, proteinG: plan.proteinG, carbsG: plan.carbsG, fatG: plan.fatG, notes: plan.notes },
    gamification,
  });
});
