import { NextResponse } from "next/server";
import { z } from "zod";
import { notFound, parseBody, withUser } from "@/lib/api";
import { isDateStr } from "@/lib/dates";
import { deleteWeighIn, updateWeighIn } from "@/lib/nutrition/weight-service";

const schema = z.object({
  kg: z.number().finite().min(25, "Revisa el peso").max(350, "Revisa el peso").optional(),
  day: z.string().refine(isDateStr, "Fecha no válida").optional(),
});

export const PATCH = withUser<{ id: string }>(async (req, { user }, { id }) => {
  const body = await parseBody(req, schema);
  const res = await updateWeighIn(user, id, body);
  if (!res) throw notFound();
  return NextResponse.json({ ok: true, ...res });
});

export const DELETE = withUser<{ id: string }>(async (_req, { user }, { id }) => {
  if (!(await deleteWeighIn(user, id))) throw notFound();
  return NextResponse.json({ ok: true });
});
