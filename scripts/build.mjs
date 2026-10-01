// Build de producción: genera Prisma, aplica migraciones (en Vercel) y compila Next.
//
// - En Vercel (VERCEL=1) o con MIGRATE_ON_BUILD=1 ejecuta `prisma migrate deploy`,
//   así da igual si el Build Command es `npm run build` o `npm run vercel-build`.
// - Acepta DATABASE_URL o los nombres que crea la integración de Neon en Vercel
//   (POSTGRES_PRISMA_URL, DATABASE_URL_UNPOOLED…), y limpia URLs pegadas con
//   comillas o con el prefijo `psql`.
// - Las migraciones usan la conexión DIRECTA de Neon (sin pooler).
import { execSync } from "node:child_process";
import { databaseEnvNames, resolveDatabaseUrls } from "../lib/db-url.mjs";

// En local, carga el .env si existe (en Vercel las variables ya vienen dadas).
try {
  process.loadEnvFile();
} catch {
  // sin .env
}

const env = { ...process.env };
const migrate = env.VERCEL === "1" || env.MIGRATE_ON_BUILD === "1";
const resolved = resolveDatabaseUrls(env);

if (resolved) {
  env.DATABASE_URL = resolved.url;
  env.DIRECT_URL = resolved.directUrl;
  console.log(`ℹ Base de datos: ${resolved.urlSource} · migraciones con ${resolved.directSource}`);
  console.log(`  Servidor: ${new URL(resolved.url).hostname}`);
} else if (migrate) {
  const found = databaseEnvNames(env);
  console.error(
    "\n✖ No encuentro una URL de PostgreSQL válida.\n" +
      "  Añade DATABASE_URL en Vercel → Settings → Environment Variables, marcada para\n" +
      "  Production, con un valor que empiece por postgresql:// (cópialo de Neon → Connect).\n" +
      (found.length
        ? `  Variables de base de datos encontradas (vacías o con formato no válido): ${found.join(", ")}\n`
        : "  No hay ninguna variable de base de datos definida en este despliegue.\n"),
  );
  process.exit(1);
} else {
  // En local sin BD se puede compilar igualmente.
  env.DATABASE_URL = env.DIRECT_URL = "postgresql://user:pass@localhost:5432/db";
}

const run = (cmd) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env });
};

run("npx prisma generate");
if (migrate) {
  try {
    run("npx prisma migrate deploy");
  } catch {
    console.error(
      "\n✖ No se pudieron aplicar las migraciones (mira el error de Prisma justo encima).\n" +
        "  P1001 / P1002: no se llega a la base de datos → revisa la URL y que el proyecto de Neon exista.\n" +
        "  P1000: usuario o contraseña incorrectos → vuelve a copiar la URL desde Neon → Connect.\n" +
        "  P3005: la base de datos ya tiene tablas de otra app → usa una base de datos vacía.\n",
    );
    process.exit(1);
  }
}
run("npx next build");
