// Build de producción: genera Prisma, aplica migraciones (en Vercel) y compila Next.
//
// - En Vercel (VERCEL=1) o con MIGRATE_ON_BUILD=1 ejecuta `prisma migrate deploy`,
//   así da igual si el Build Command es `npm run build` o `npm run vercel-build`.
// - Las migraciones necesitan la conexión DIRECTA de Neon (no la del pooler).
//   Si no hay DIRECT_URL se usa DATABASE_URL_UNPOOLED o, si DATABASE_URL es la URL
//   con pooler de Neon, se deduce la directa quitando "-pooler" del host.
import { execSync } from "node:child_process";

// En local, carga el .env si existe (en Vercel las variables ya vienen dadas).
try {
  process.loadEnvFile();
} catch {
  // sin .env
}

const env = { ...process.env };
const migrate = env.VERCEL === "1" || env.MIGRATE_ON_BUILD === "1";

function directFromPooled(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("-pooler.")) return url;
    u.hostname = u.hostname.replace("-pooler.", ".");
    u.searchParams.delete("pgbouncer");
    return u.toString();
  } catch {
    return url;
  }
}

if (!env.DATABASE_URL) {
  if (migrate) {
    console.error(
      "\n✖ Falta la variable de entorno DATABASE_URL.\n" +
        "  Añádela en Vercel → Settings → Environment Variables (URL de Neon con pooler),\n" +
        "  márcala para Production y vuelve a desplegar.\n",
    );
    process.exit(1);
  }
  // En local sin BD se puede compilar igualmente.
  env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
}

if (!env.DIRECT_URL) {
  if (env.DATABASE_URL_UNPOOLED) {
    env.DIRECT_URL = env.DATABASE_URL_UNPOOLED;
    console.log("ℹ DIRECT_URL no definida: se usa DATABASE_URL_UNPOOLED");
  } else {
    env.DIRECT_URL = directFromPooled(env.DATABASE_URL);
    console.log("ℹ DIRECT_URL no definida: se deduce de DATABASE_URL");
  }
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
      "\n✖ No se pudieron aplicar las migraciones de la base de datos.\n" +
        "  Revisa que DATABASE_URL (y DIRECT_URL si la usas) sean correctas en Vercel,\n" +
        "  que la base de datos de Neon esté activa y que la URL lleve ?sslmode=require.\n",
    );
    process.exit(1);
  }
}
run("npx next build");
