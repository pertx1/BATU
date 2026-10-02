/** Qué ve el servidor de su configuración (solo sí/no, nunca valores). */
export function notificationEnvStatus() {
  const has = (name: string) => !!process.env[name]?.trim();
  return {
    entorno: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "desconocido",
    rama: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    variables: {
      CRON_SECRET: has("CRON_SECRET"),
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: has("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
      VAPID_PRIVATE_KEY: has("VAPID_PRIVATE_KEY"),
      VAPID_SUBJECT: has("VAPID_SUBJECT"),
      APP_URL: has("APP_URL"),
      ADMIN_EMAIL: has("ADMIN_EMAIL"),
      RESEND_API_KEY: has("RESEND_API_KEY"),
      EMAIL_FROM: has("EMAIL_FROM"),
      // Comida: estimación con IA y fotos en Cloudflare R2.
      ANTHROPIC_API_KEY: has("ANTHROPIC_API_KEY"),
      ANTHROPIC_MODEL: has("ANTHROPIC_MODEL"),
      R2_ACCOUNT_ID: has("R2_ACCOUNT_ID"),
      R2_ACCESS_KEY_ID: has("R2_ACCESS_KEY_ID"),
      R2_SECRET_ACCESS_KEY: has("R2_SECRET_ACCESS_KEY"),
      R2_BUCKET: has("R2_BUCKET"),
    },
    // Variables con nombre parecido (p. ej. con un espacio o en minúsculas): solo el nombre.
    nombresParecidos: Object.keys(process.env).filter(
      (k) =>
        /cron|vapid|anthropic|r2_/i.test(k) &&
        ![
          "CRON_SECRET",
          "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
          "VAPID_PRIVATE_KEY",
          "VAPID_SUBJECT",
          "ANTHROPIC_API_KEY",
          "ANTHROPIC_MODEL",
          "ANTHROPIC_BASE_URL",
          "R2_ACCOUNT_ID",
          "R2_ACCESS_KEY_ID",
          "R2_SECRET_ACCESS_KEY",
          "R2_BUCKET",
          "R2_ENDPOINT",
        ].includes(k),
    ),
  };
}
