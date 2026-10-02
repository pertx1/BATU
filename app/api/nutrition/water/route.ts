import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, parseBody, withUser } from "@/lib/api";
import { dateStrToDb, isDateStr, todayStr } from "@/lib/dates";

const schema = z.object({
  ml: z.number().int().min(10, "Cantidad no válida").max(3000, "Cantidad no válida"),
  // Por defecto hoy; se puede apuntar en un día pasado (nunca en el futuro).
  day: z.string().refine(isDateStr, "Fecha no válida").optional(),
});

/** Añade agua al día. Devuelve el id (para deshacer) y el total del día. */
export const POST = withUser(async (req, { user }) => {
  const body = await parseBody(req, schema);
  const today = todayStr(user.timezone);
  const day = body.day ?? today;
  if (day > today) throw new HttpError(400, "No se puede apuntar agua en un día futuro");
  const log = await db.waterLog.create({ data: { userId: user.id, day: dateStrToDb(day), ml: body.ml }, select: { id: true } });
  const sum = await db.waterLog.aggregate({ where: { userId: user.id, day: dateStrToDb(day) }, _sum: { ml: true } });
  return NextResponse.json({ id: log.id, totalMl: sum._sum.ml ?? 0 }, { status: 201 });
});
