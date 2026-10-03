import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, withUser } from "@/lib/api";
import { connectProfity, disconnectProfity } from "@/lib/integrations/profity";

const schema = z.object({
  token: z.string().trim().min(20, "Pega la clave completa de Profity").max(200, "Esa clave es demasiado larga"),
});

/** Conecta la cuenta con Profity usando la clave de Profity (Ajustes → Conectar con Antola). */
export const PUT = withUser(async (req, { userId }) => {
  const { token } = await parseBody(req, schema);
  const sync = await connectProfity(userId, token);
  return NextResponse.json({ ok: true, sync });
});

/** Desconecta Profity (las tareas ya creadas se quedan). */
export const DELETE = withUser(async (_req, { userId }) => {
  await disconnectProfity(userId);
  return NextResponse.json({ ok: true });
});
