import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
import { projectSchema } from "@/lib/schemas";

export const POST = withUser(async (req, { userId }) => {
  const body = await parseBody(req, projectSchema);
  const last = await db.project.findFirst({
    where: { userId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const project = await db.project.create({
    data: {
      userId,
      name: body.name,
      color: body.color,
      emoji: body.emoji || null,
      position: (last?.position ?? -1) + 1,
    },
    select: { id: true, name: true, color: true, emoji: true },
  });
  return NextResponse.json(project, { status: 201 });
});
