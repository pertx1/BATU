import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { databaseEnvNames, diagnoseEnv, resolveDatabaseUrls } from "@/lib/db-url.mjs";
import { ensureMigrated } from "@/lib/migrate";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico público: ¿llega la app a la base de datos y están las tablas?
 * No devuelve ningún valor secreto (solo nombres de variables y códigos).
 */
export async function GET() {
  const resolved = resolveDatabaseUrls(process.env);
  const base = {
    variablesDeBaseDeDatos: databaseEnvNames(process.env),
    variableUsada: resolved?.urlSource ?? null,
    servidor: resolved ? new URL(resolved.url).hostname : null,
    problemas: diagnoseEnv(process.env),
  };
  if (!resolved) {
    return NextResponse.json(
      { ok: false, baseDeDatos: "sin_configurar", ayuda: "Define DATABASE_URL en Vercel y vuelve a desplegar.", ...base },
      { status: 503 },
    );
  }
  try {
    await ensureMigrated();
    const users = await db.user.count();
    return NextResponse.json({ ok: true, baseDeDatos: "ok", tablas: "ok", usuarios: users, ...base });
  } catch (err) {
    const code =
      err instanceof Prisma.PrismaClientKnownRequestError
        ? err.code
        : err instanceof Prisma.PrismaClientInitializationError
          ? err.errorCode
          : undefined;
    return NextResponse.json(
      {
        ok: false,
        baseDeDatos: "error",
        codigo: code ?? null,
        mensaje: (err as Error).message.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 300),
        ...base,
      },
      { status: 503 },
    );
  }
}
