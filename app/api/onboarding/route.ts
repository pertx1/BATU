import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
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
  const existing = await db.project.count({ where: { userId } });

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { name: body.name, onboardedAt: new Date() } }),
    db.settings.upsert({
      where: { userId },
      create: { userId, timezone: body.timezone, morningTime: body.morningTime, eveningTime: body.eveningTime },
      update: { timezone: body.timezone, morningTime: body.morningTime, eveningTime: body.eveningTime },
    }),
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
