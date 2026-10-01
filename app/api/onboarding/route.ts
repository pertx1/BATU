import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
import { getSettings } from "@/lib/data/settings";
import { computeNextTimes } from "@/lib/notifications/timing";
import { colorSchema, emojiSchema, hhmmSchema, timezoneSchema } from "@/lib/validation";

const schema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre").max(60),
  timezone: timezoneSchema,
  morningTime: hhmmSchema,
  eveningTime: hhmmSchema,
  projects: z
    .array(z.object({ name: z.string().trim().min(1).max(60), color: colorSchema, emoji: emojiSchema.nullable() }))
    .max(20),
});

export const POST = withUser(async (req, { userId }) => {
  const body = await parseBody(req, schema);
  const [existing, current] = await Promise.all([db.project.count({ where: { userId } }), getSettings(userId)]);
  const schedule = { timezone: body.timezone, morningTime: body.morningTime, eveningTime: body.eveningTime };
  const nextTimes = computeNextTimes({ ...current, ...schedule });

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { name: body.name, onboardedAt: new Date() } }),
    db.settings.update({ where: { userId }, data: { ...schedule, ...nextTimes } }),
    db.project.createMany({
      data: body.projects.map((p, i) => ({
        userId,
        name: p.name,
        color: p.color,
        emoji: p.emoji || null,
        position: existing + i,
      })),
    }),
  ]);
  return NextResponse.json({ ok: true });
});
