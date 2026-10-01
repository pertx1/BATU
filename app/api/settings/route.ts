import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
import { getSettings, moveToTimezone, nextTimesAfterChange } from "@/lib/data/settings";
import { hhmmSchema, timezoneSchema } from "@/lib/validation";

const settingsSchema = z
  .object({
    timezone: timezoneSchema,
    morningTime: hhmmSchema,
    eveningTime: hhmmSchema,
    overdueTime: hhmmSchema,
    weeklyReviewTime: hhmmSchema,
    dndEnabled: z.boolean(),
    dndStart: hhmmSchema,
    dndEnd: hhmmSchema,
    notifyTasks: z.boolean(),
    notifyEvents: z.boolean(),
    notifyHabits: z.boolean(),
    notifyMorning: z.boolean(),
    notifyEvening: z.boolean(),
    notifyOverdue: z.boolean(),
    notifyWeekly: z.boolean(),
  })
  .partial()
  .strict();

export const PATCH = withUser(async (req, { userId }) => {
  const body = await parseBody(req, settingsSchema);
  const now = new Date();
  const before = await getSettings(userId);
  const after = { ...before, ...body };

  await db.$transaction(
    async (tx) => {
      await tx.settings.update({
        where: { userId },
        data: { ...body, ...nextTimesAfterChange(before, after, now) },
      });
      if (after.timezone !== before.timezone) {
        await moveToTimezone(tx, userId, before.timezone, after.timezone, now);
      }
    },
    { timeout: 30_000 },
  );
  return NextResponse.json({ ok: true });
});
