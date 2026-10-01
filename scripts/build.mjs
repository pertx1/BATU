// Build de producción: genera Prisma, intenta aplicar migraciones y compila Next.
//
// El build NUNCA falla por la base de datos: si no hay URL o la migración falla,
// se avisa y se sigue. La app aplica las migraciones pendientes al arrancar
// (lib/migrate.ts), y /api/salud dice si la conexión funciona.
import { execSync } from "node:child_process";
import { databaseEnvNames, diagnoseEnv, resolveDatabaseUrls } from "../lib/db-url.mjs";

try {
  process.loadEnvFile(); // en local; en Vercel las variables ya vienen dadas
} catch {
  // sin .env
}

const env = { ...process.env };
const onVercel = env.VERCEL === "1" || env.MIGRATE_ON_BUILD === "1";
const resolved = resolveDatabaseUrls(env);
const problems = diagnoseEnv(env);
if (problems.length) {
  console.warn("\n⚠ Problemas en la configuración de la base de datos:");
  for (const p of problems) console.warn(`  • ${p}`);
  console.warn("");
}

const run = (cmd) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env });
};

if (resolved) {
  env.DATABASE_URL = resolved.url;
  env.DIRECT_URL = resolved.directUrl;
  console.log(`ℹ Base de datos: ${resolved.urlSource} (servidor ${new URL(resolved.url).hostname})`);
  console.log(`ℹ Migraciones: ${resolved.directSource} (servidor ${new URL(resolved.directUrl).hostname}:${new URL(resolved.directUrl).port || "5432"})`);
} else {
  if (onVercel) {
    const found = databaseEnvNames(env);
    console.warn(
      "\n⚠ No hay ninguna URL de PostgreSQL válida en este despliegue.\n" +
        "  La app se compilará, pero no funcionará hasta que añadas DATABASE_URL en\n" +
        "  Vercel → Settings → Environment Variables (Production) y vuelvas a desplegar.\n" +
        (found.length ? `  Variables encontradas (vacías o no válidas): ${found.join(", ")}\n` : ""),
    );
  }
  // Valor de relleno para que Prisma y Next compilen sin BD.
  env.DATABASE_URL = env.DIRECT_URL = "postgresql://user:pass@localhost:5432/db";
}

run("node scripts/gen-migrations.mjs");
run("npx prisma generate");

if (onVercel && resolved) {
  try {
    run("npx prisma migrate deploy");
  } catch {
    console.warn(
      "\n⚠ No se pudieron aplicar las migraciones durante el build (error de Prisma justo encima).\n" +
        "  No pasa nada: la app lo reintentará al arrancar. Abre /api/salud tras el despliegue\n" +
        "  para ver si conecta con la base de datos.\n",
    );
  }
}

run("npx next build");
