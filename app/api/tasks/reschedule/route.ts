import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseBody, withUser } from "@/lib/api";
import { fieldsToData, taskToFields } from "@/lib/task-input";
import { dateStrSchema, idSchema } from "@/lib/validation";

const schema = z.object({
  ids: z.array(idSchema).min(1).max(200),
  dueDate: dateStrSchema,
});

// Reprograma varias tareas a la vez (solo las del usuario; el resto se ignora).
export const POST = withUser(async (req, { userId, user }) => {
  const { ids, dueDate } = await parseBody(req, schema);
  const tasks = await db.task.findMany({ where: { id: { in: ids }, userId, completedAt: null } });
  await db.$transaction(
    tasks.map((t) =>
      db.task.update({
        where: { id: t.id, userId },
        data: fieldsToData({ ...taskToFields(t, user.timezone), dueDate }, user.timezone),
      }),
    ),
  );
  return NextResponse.json({ ok: true, updated: tasks.length });
});
