// Build de producción (Vercel): genera Prisma, aplica migraciones y compila Next.
// Si no hay DIRECT_URL usa DATABASE_URL_UNPOOLED (integración Neon de Vercel)
// o, en último caso, DATABASE_URL.
import { execSync } from "node:child_process";

const env = { ...process.env };

if (!env.DATABASE_URL) {
  console.error(
    "\n✖ Falta la variable de entorno DATABASE_URL.\n" +
      "  Añádela en Vercel → Settings → Environment Variables (URL de Neon con pooler)\n" +
      "  y vuelve a desplegar.\n",
  );
  process.exit(1);
}
if (!env.DIRECT_URL) {
  env.DIRECT_URL = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  console.log("ℹ DIRECT_URL no definida: se usa", env.DATABASE_URL_UNPOOLED ? "DATABASE_URL_UNPOOLED" : "DATABASE_URL");
}

const run = (cmd) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env });
};

run("npx prisma generate");
run("npx prisma migrate deploy");
run("npx next build");
