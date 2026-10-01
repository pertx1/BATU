import { NextResponse } from "next/server";
import { withPublic } from "@/lib/api";
import { destroyCurrentSession } from "@/lib/auth/session";

// Borra la sesión de este dispositivo y, en cascada, su suscripción push.
export const POST = withPublic(async () => {
  await destroyCurrentSession();
  return NextResponse.json({ ok: true });
});
