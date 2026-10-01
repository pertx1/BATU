import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { describeServerError } from "@/lib/api";
import { databaseEnvNames, diagnoseEnv, resolveDatabaseUrls } from "@/lib/db-url.mjs";
import { ensureMigrated, migrationStatus } from "@/lib/migrate";
import { notificationEnvStatus } from "@/lib/deploy-info";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico público: ¿llega la app a la base de datos y están las tablas?
 * No devuelve ningún valor secreto (solo nombres de variables, host y códigos).
 */
export async function GET() {
  const resolved = resolveDatabaseUrls(process.env);
  const base = {
    variablesDeBaseDeDatos: databaseEnvNames(process.env),
    variableUsada: resolved?.urlSource ?? null,
    servidor: resolved ? `${new URL(resolved.url).hostname}:${new URL(resolved.url).port || "5432"}` : null,
    problemas: diagnoseEnv(process.env),
  };
  if (!resolved) {
    return NextResponse.json(
      { ok: false, paso: "configuracion", ayuda: "Define DATABASE_URL en Vercel y vuelve a desplegar.", ...base },
      { status: 503 },
    );
  }

  const step = async <T,>(paso: string, fn: () => Promise<T>) => {
    try {
      return { ok: true as const, value: await fn() };
    } catch (err) {
      console.error(`[antola] /api/salud (${paso}):`, err);
      const [, mensaje] = describeServerError(err);
      const detalle = (err as Error).message?.split("\n").map((l) => l.trim()).filter(Boolean).slice(-1)[0];
      return { ok: false as const, paso, mensaje, detalle: detalle?.replace(/postgres(ql)?:\/\/\S+/gi, "[url]").slice(0, 300) };
    }
  };

  const conn = await step("conexion", () => db.$queryRawUnsafe(`SELECT 1`));
  if (!conn.ok) return NextResponse.json({ ...conn, ...base }, { status: 503 });

  const mig = await step("migraciones", () => ensureMigrated());
  const status = await step("estado", () => migrationStatus());
  const tables = await step("tablas", () => db.$queryRawUnsafe(`SELECT 1 FROM "User" LIMIT 1`));

  const ok = mig.ok && tables.ok;
  // Todo bien: no hace falta enseñar detalles de la configuración.
  if (ok) return NextResponse.json({ ok: true, conexion: "ok", tablas: "ok", configuracion: notificationEnvStatus() });
  return NextResponse.json(
    {
      ok,
      conexion: "ok",
      migraciones: status.ok ? status.value : null,
      ...(mig.ok ? {} : { errorMigraciones: mig }),
      tablas: tables.ok ? "ok" : tables,
      ...base,
    },
    { status: ok ? 200 : 503 },
  );
}
