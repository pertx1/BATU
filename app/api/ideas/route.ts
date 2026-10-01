import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";

const schema = z.object({ text: z.string().trim().min(1, "Escribe la idea").max(5000) });

export const POST = withUser(async (req, { userId }) => {
  const { text } = await parseBody(req, schema);
  const idea = await db.idea.create({ data: { userId, text }, select: { id: true } });
  return NextResponse.json(idea, { status: 201 });
});
