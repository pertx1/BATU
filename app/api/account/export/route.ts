import { db } from "@/lib/db";
import { withUser } from "@/lib/api";
import { dbToDateStr, todayStr } from "@/lib/dates";

const day = (d: Date | null) => (d ? dbToDateStr(d) : null);

/**
 * Descarga de TODOS los datos del usuario en JSON. Solo lo suyo (filtrado por
 * userId) y sin secretos: ni hash de contraseña, ni tokens de sesión, ni
 * claves de las suscripciones push.
 */
export const GET = withUser(async (_req, { userId, user }) => {
  const where = { userId };
  const [account, settings, projects, tasks, habits, habitLogs, events, goals, reviews, devices, notifications] =
    await Promise.all([
      db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true, name: true, createdAt: true, onboardedAt: true, lastActiveAt: true },
      }),
      db.settings.findUnique({ where }),
      db.project.findMany({ where, orderBy: { position: "asc" } }),
      db.task.findMany({ where, include: { subtasks: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "asc" } }),
      db.habit.findMany({ where, orderBy: { position: "asc" } }),
      db.habitLog.findMany({ where, orderBy: { date: "asc" }, select: { habitId: true, date: true, createdAt: true } }),
      db.event.findMany({ where, orderBy: { startDate: "asc" } }),
      db.goal.findMany({
        where,
        include: { milestones: { orderBy: { position: "asc" } }, progressLogs: { orderBy: { date: "asc" } } },
        orderBy: { createdAt: "asc" },
      }),
      db.weeklyReview.findMany({ where, orderBy: { weekStart: "asc" } }),
      db.pushSubscription.findMany({ where, select: { userAgent: true, createdAt: true, lastSuccessAt: true } }),
      db.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 1000,
        select: { kind: true, status: true, scheduledFor: true, sentAt: true },
      }),
    ]);

  // Sin el userId repetido en cada registro: todo es de esta cuenta.
  const strip = <T extends { userId?: string }>(rows: T[]) => rows.map(({ userId: _u, ...rest }) => rest);

  const data = {
    exportadoEl: new Date().toISOString(),
    formato: "Antola v1. Las fechas-hora están en UTC; las fechas de calendario en YYYY-MM-DD.",
    cuenta: account,
    ajustes: settings ? (({ userId: _u, ...s }) => s)(settings) : null,
    proyectos: strip(projects),
    tareas: strip(tasks).map((t) => ({
      ...t,
      dueDate: day(t.dueDate),
      subtasks: strip(t.subtasks),
    })),
    habitos: strip(habits),
    registrosDeHabitos: habitLogs.map((l) => ({ ...l, date: day(l.date) })),
    eventos: strip(events).map((e) => ({ ...e, startDate: day(e.startDate), endDate: day(e.endDate) })),
    objetivos: strip(goals).map((g) => ({
      ...g,
      deadline: day(g.deadline),
      milestones: strip(g.milestones),
      progressLogs: strip(g.progressLogs).map((l) => ({ ...l, date: day(l.date) })),
    })),
    revisionesSemanales: strip(reviews).map((r) => ({ ...r, weekStart: day(r.weekStart) })),
    dispositivosConNotificaciones: devices,
    notificacionesRecientes: notifications,
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="antola-${todayStr(user.timezone)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
