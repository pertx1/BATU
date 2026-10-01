// Empaqueta las migraciones SQL de Prisma en un módulo TS para que la app pueda
// aplicarlas por sí misma al arrancar (lib/migrate.ts). Uso: node scripts/gen-migrations.mjs
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "prisma", "migrations");
const migrations = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(path.join(dir, d.name, "migration.sql")))
  .map((d) => d.name)
  .sort()
  .map((name) => {
    const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
    return { name, checksum: createHash("sha256").update(sql).digest("hex"), sql };
  });

const out =
  "// Generado por scripts/gen-migrations.mjs — no editar a mano.\n" +
  "export const MIGRATIONS: { name: string; checksum: string; sql: string }[] = " +
  JSON.stringify(migrations, null, 2) +
  ";\n";
writeFileSync(path.join(process.cwd(), "lib", "migrations.generated.ts"), out);
console.log(`✔ ${migrations.length} migración(es) empaquetadas`);
