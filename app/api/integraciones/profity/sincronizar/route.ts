import { NextResponse } from "next/server";
import { HttpError, withUser } from "@/lib/api";
import { syncProfityUser } from "@/lib/integrations/profity";

/** Sincroniza ya el stock de Profity de esta cuenta (normalmente va solo cada hora). */
export const POST = withUser(async (_req, { userId }) => {
  const sync = await syncProfityUser(userId);
  if (!sync) throw new HttpError(409, "Antes, conecta tu cuenta de Profity");
  return NextResponse.json({ ok: true, sync });
});
