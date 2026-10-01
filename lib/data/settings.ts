import "server-only";
import type { Prisma, Settings } from "@prisma/client";
import { db } from "@/lib/db";
import { dbToDateStr, localDateStr, localMinutes, todayStr } from "@/lib/dates";
import { computeTaskTiming, nextHabitReminderAt } from "@/lib/schedule";
import { NEXT_FIELD, nextPeriodicAt, PERIODIC_KINDS, type PeriodicKind } from "@/lib/notifications/timing";

/** Ajustes del usuario (se crean con los valores por defecto si faltan). */
export function getSettings(userId: string): Promise<Settings> {
  return db.settings.upsert({ where: { userId }, create: { userId }, update: {} });
}

/** Qué campo de horario afecta a cada aviso periódico. */
const TIME_FIELD = {
  morning: "morningTime",
  evening: "eveningTime",
  overdue: "overdueTime",
  weekly: "weeklyReviewTime",
} as const satisfies Record<PeriodicKind, keyof Settings>;

/**
 * Próximos disparos que hay que recalcular tras un cambio de ajustes. Solo los
 * afectados, para no perder un aviso que esté esperando a que acabe "no molestar".
 */
export function nextTimesAfterChange(before: Settings, after: Settings, now: Date) {
  const tzChanged = before.timezone !== after.timezone;
  const out: Partial<Record<(typeof NEXT_FIELD)[PeriodicKind], Date>> = {};
  for (const kind of PERIODIC_KINDS) {
    const field = TIME_FIELD[kind];
    if (tzChanged || before[field] !== after[field] || !before[NEXT_FIELD[kind]]) {
      out[NEXT_FIELD[kind]] = nextPeriodicAt(kind, after, now);
    }
  }
  return out;
}

/**
 * Al cambiar de zona horaria, las tareas y hábitos mantienen su hora local
 * (una tarea "a las 9:00" sigue siendo a las 9:00 en la nueva zona). Los
 * eventos son citas en un instante concreto y no se mueven.
 */
export async function moveToTimezone(
  tx: Prisma.TransactionClient,
  userId: string,
  from: string,
  to: string,
  now: Date,
) {
  const [tasks, habits] = await Promise.all([
    tx.task.findMany({
      where: { userId, completedAt: null, OR: [{ dueAt: { not: null } }, { reminderAt: { not: null } }, { remindAt: { not: null } }] },
      select: {
        id: true,
        dueDate: true,
        dueAt: true,
        reminderMode: true,
        reminderAt: true,
        reminderMinutesBefore: true,
      },
    }),
    tx.habit.findMany({
      where: { userId, archivedAt: null, reminderTime: { not: null } },
      select: { id: true, daysOfWeek: true, reminderTime: true },
    }),
  ]);

  for (const t of tasks) {
    const timing = computeTaskTiming(
      {
        dueDate: t.dueDate ? dbToDateStr(t.dueDate) : null,
        time: t.dueAt ? localMinutes(t.dueAt, from) : null,
        reminderMode: t.reminderMode,
        reminderDate: t.reminderAt ? localDateStr(t.reminderAt, from) : null,
        reminderTime: t.reminderAt ? localMinutes(t.reminderAt, from) : null,
        reminderMinutesBefore: t.reminderMinutesBefore,
      },
      to,
    );
    // Un recordatorio que ya ha pasado no se vuelve a programar.
    if (timing.remindAt && timing.remindAt.getTime() <= now.getTime()) timing.remindAt = null;
    await tx.task.update({ where: { id: t.id, userId }, data: timing });
  }

  const today = todayStr(to, now);
  for (const h of habits) {
    await tx.habit.update({
      where: { id: h.id, userId },
      data: { nextReminderAt: nextHabitReminderAt(h.daysOfWeek, h.reminderTime, to, today, now) },
    });
  }
}
