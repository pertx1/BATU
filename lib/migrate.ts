import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { MIGRATIONS } from "@/lib/migrations.generated";

/**
 * Aplica las migraciones pendientes al arrancar, por si no se pudieron aplicar
 * durante el build. Escribe en la misma tabla que `prisma migrate`
 * (_prisma_migrations, con el mismo checksum), así que ambos son compatibles.
 * Un bloqueo de PostgreSQL evita que dos instancias migren a la vez.
 */
const LOCK_ID = 727069; // arbitrario, fijo

let pending: Promise<void> | null = null;

export function ensureMigrated(): Promise<void> {
  if (!pending) {
    pending = run().catch((err) => {
      pending = null; // se reintenta en la siguiente petición
      throw err;
    });
  }
  return pending;
}

/** Divide el SQL generado por Prisma en sentencias (no contiene funciones con $$). */
function statements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/--.*$/gm, "").trim().length > 0);
}

async function run() {
  const exists = await db.$queryRawUnsafe<{ ok: boolean }[]>(
    `SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL AS ok`,
  );
  if (exists[0]?.ok) {
    const applied = await db.$queryRawUnsafe<{ migration_name: string }[]>(
      `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    );
    const names = new Set(applied.map((r) => r.migration_name));
    if (MIGRATIONS.every((m) => names.has(m.name))) return; // caso normal: nada que hacer
  }

  await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${LOCK_ID})`);
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )`);
      const applied = await tx.$queryRawUnsafe<{ migration_name: string }[]>(
        `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
      );
      const names = new Set(applied.map((r) => r.migration_name));
      for (const m of MIGRATIONS) {
        if (names.has(m.name)) continue;
        for (const stmt of statements(m.sql)) await tx.$executeRawUnsafe(stmt);
        await tx.$executeRawUnsafe(
          `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
           VALUES ($1, $2, now(), $3, now(), 1)`,
          randomUUID(),
          m.checksum,
          m.name,
        );
        console.log(`[antola] Migración aplicada: ${m.name}`);
      }
    },
    { maxWait: 20000, timeout: 120000 },
  );
}
