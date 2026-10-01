import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";
import { assertOwnProject } from "@/lib/data/ownership";
import { getEventView } from "@/lib/data/calendar";
import { eventFieldsToData, eventToFields, updateEventSchema } from "@/lib/event-input";

type Params = { id: string };

const sameInstant = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

export const GET = withUser<Params>(async (_req, { userId, user }, { id }) => {
  const event = await getEventView(userId, id, user.timezone);
  if (!event) throw notFound();
  return NextResponse.json(event);
});

export const PATCH = withUser<Params>(async (req, { userId, user }, { id }) => {
  const body = await parseBody(req, updateEventSchema);
  const current = await db.event.findFirst({ where: { id, userId } });
  if (!current) throw notFound();
  if (body.projectId !== undefined) await assertOwnProject(userId, body.projectId);
  const merged = { ...eventToFields(current, user.timezone), ...body };
  // Si cambia el día de inicio sin indicar el de fin, se conserva la duración en días.
  if (body.startDate && body.endDate === undefined) {
    const span = current.endDate.getTime() - current.startDate.getTime();
    merged.endDate = new Date(new Date(body.startDate + "T00:00:00Z").getTime() + span).toISOString().slice(0, 10);
  }
  const data = eventFieldsToData(merged, user.timezone);
  // Mismo aviso que antes → se conserva el pendiente (p. ej. uno pospuesto).
  const sameReminder =
    data.reminderMinutesBefore === current.reminderMinutesBefore &&
    sameInstant(data.startAt, current.startAt) &&
    sameInstant(data.startDate, current.startDate);
  if (sameReminder) data.remindAt = current.remindAt;
  await db.event.update({ where: { id, userId }, data });
  return NextResponse.json({ ok: true });
});

export const DELETE = withUser<Params>(async (_req, { userId }, { id }) => {
  const res = await db.event.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw notFound();
  return NextResponse.json({ ok: true });
});
