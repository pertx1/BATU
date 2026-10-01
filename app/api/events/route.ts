import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
import { assertOwnProject } from "@/lib/data/ownership";
import { createEventSchema, DEFAULT_EVENT_FIELDS, eventFieldsToData } from "@/lib/event-input";

export const POST = withUser(async (req, { userId, user }) => {
  const body = await parseBody(req, createEventSchema);
  await assertOwnProject(userId, body.projectId);
  const data = eventFieldsToData({ ...DEFAULT_EVENT_FIELDS, ...body }, user.timezone);
  const event = await db.event.create({ data: { ...data, userId }, select: { id: true } });
  return NextResponse.json(event, { status: 201 });
});
