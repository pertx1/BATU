import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, withUser } from "@/lib/api";
import { isDateStr, todayStr } from "@/lib/dates";
import { saveWeighIn } from "@/lib/nutrition/weight-service";

const schema = z.object({
  kg: z.number().finite().min(25, "Revisa el peso").max(350, "Revisa el peso"),
  day: z.string().refine(isDateStr, "Fecha no válida").optional(),
});

/** Registrar peso (uno por día: si ya había, se sustituye). */
export const POST = withUser(async (req, { user }) => {
  const { kg, day } = await parseBody(req, schema);
  const res = await saveWeighIn(user, day ?? todayStr(user.timezone), kg);
  return NextResponse.json(res, { status: 201 });
});
