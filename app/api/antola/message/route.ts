import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
import { antolaSay, antolaSettings } from "@/lib/gamification";

const schema = z.object({ situation: z.enum(["toque"]) });

/** Frase de Antola al tocarla (sin repetir las 10 últimas que has visto). */
export const POST = withUser(async (req, { userId, user }) => {
  await parseBody(req, schema);
  const [settings, stats] = await Promise.all([
    antolaSettings(userId),
    db.userStats.findUnique({ where: { userId }, select: { level: true, currentStreak: true } }),
  ]);
  const said = await antolaSay(
    userId,
    "toque",
    { nombre: user.name, nivel: stats?.level ?? 1, racha: stats?.currentStreak ?? 0 },
    settings.antolaTone,
  );
  return NextResponse.json({ text: said.text });
});
