import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MIGRATIONS } from "@/lib/migrations.generated";

/**
 * Aplica las migraciones pendientes al arrancar, por si no se pudieron aplicar
 * durante el build. Escribe en la misma tabla que `prisma migrate`
 * (_prisma_migrations, con el mismo checksum), así que ambos son compatibles.
 *
 * - Un bloqueo de PostgreSQL evita que dos instancias migren a la vez.
 * - Si una migración quedó a medias (fallo en un despliegue anterior), se
 *   completa: lo que ya existe se salta y la fila fallida se marca como
 *   revertida, igual que haría `prisma migrate resolve --rolled-back`.
 */
const LOCK_ID = 727069; // arbitrario, fijo

type MigrationRow = { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null };

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

/** ¿El error es "ya existe" (tabla, tipo, índice, columna, restricción)? */
function isAlreadyExists(err: unknown): boolean {
  const codes = ["42P07", "42710", "42701", "42P06", "42P16"];
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = err.meta as { code?: string; message?: string } | undefined;
    if (meta?.code && codes.includes(meta.code)) return true;
    if (meta?.message && /already exists/i.test(meta.message)) return true;
  }
  return err instanceof Error && /already exists/i.test(err.message);
}

async function readRows(client: Pick<typeof db, "$queryRawUnsafe">): Promise<MigrationRow[]> {
  return client.$queryRawUnsafe<MigrationRow[]>(
    `SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`,
  );
}

function appliedNames(rows: MigrationRow[]) {
  return new Set(rows.filter((r) => r.finished_at && !r.rolled_back_at).map((r) => r.migration_name));
}

async function run() {
  const exists = await db.$queryRawUnsafe<{ ok: boolean }[]>(
    `SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL AS ok`,
  );
  if (exists[0]?.ok) {
    const applied = appliedNames(await readRows(db));
    if (MIGRATIONS.every((m) => applied.has(m.name))) return; // caso normal: nada que hacer
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
      const applied = appliedNames(await readRows(tx));

      for (const m of MIGRATIONS) {
        if (applied.has(m.name)) continue;

        // Intentos fallidos anteriores → revertidos (si no, `prisma migrate deploy` se bloquea con P3009).
        await tx.$executeRawUnsafe(
          `UPDATE "_prisma_migrations" SET rolled_back_at = now()
           WHERE migration_name = $1 AND finished_at IS NULL AND rolled_back_at IS NULL`,
          m.name,
        );

        let step = 0;
        for (const stmt of statements(m.sql)) {
          const sp = `antola_${step++}`;
          await tx.$executeRawUnsafe(`SAVEPOINT ${sp}`);
          try {
            await tx.$executeRawUnsafe(stmt);
            await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${sp}`);
          } catch (err) {
            if (!isAlreadyExists(err)) throw err;
            await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${sp}`);
          }
        }

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

/** Estado de las migraciones para /api/salud. */
export async function migrationStatus() {
  const exists = await db.$queryRawUnsafe<{ ok: boolean }[]>(
    `SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL AS ok`,
  );
  if (!exists[0]?.ok) return { aplicadas: [], fallidas: [], pendientes: MIGRATIONS.map((m) => m.name) };
  const rows = await readRows(db);
  const applied = appliedNames(rows);
  return {
    aplicadas: [...applied],
    fallidas: rows.filter((r) => !r.finished_at && !r.rolled_back_at).map((r) => r.migration_name),
    pendientes: MIGRATIONS.filter((m) => !applied.has(m.name)).map((m) => m.name),
  };
}
