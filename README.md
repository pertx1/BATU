# Antola

PWA multiusuario para organizar el día a día (tareas, hábitos, calendario y objetivos),
pensada para usarse instalada en el iPhone y con notificaciones push.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 + PostgreSQL (Neon) ·
date-fns(-tz) · web-push · Resend · Vercel.

> Este README se completará en la fase 7 (claves VAPID, cron-job.org, instalación en iPhone…).

## Desarrollo local

```bash
cp .env.example .env      # y rellena DATABASE_URL / DIRECT_URL
npm install
npx prisma migrate dev    # crea las tablas
npm run dev
```

## Despliegue en Vercel

1. **Neon**: crea un proyecto y copia dos cadenas de conexión desde *Connect*:
   con *Connection pooling* activado (`DATABASE_URL`, el host lleva `-pooler`) y desactivado (`DIRECT_URL`).
2. **Vercel → Add New → Project** e importa este repositorio.
   - Framework Preset: **Next.js**
   - Build Command: por defecto (`npm run build`) o `npm run vercel-build`; son lo mismo.
     `scripts/build.mjs` ejecuta `prisma generate`, `prisma migrate deploy` (solo en Vercel) y `next build`
   - Install Command y Output Directory: por defecto
3. **Environment Variables**: añade todas las de `.env.example` (marca solo *Production*).
4. **Deploy**. Después ajusta `APP_URL` a la URL definitiva y vuelve a desplegar.
5. `DIRECT_URL` es opcional en Vercel: si falta se usa `DATABASE_URL_UNPOOLED`
   (la crea la integración de Neon) o se deduce de `DATABASE_URL` quitando `-pooler` del host.
6. Si trabajas en una rama distinta de `main`, cámbiala en
   *Settings → Environments → Production → Branch Tracking*.

### Scripts de instalación (npm 11+/12)

Las versiones recientes de npm bloquean por defecto los scripts de instalación de las
dependencias. Los que necesita la app (Prisma, esbuild…) están autorizados en el campo
`allowScripts` de `package.json`. Si añades una dependencia que los necesite:

```bash
npm install-scripts ls        # ver cuáles están bloqueados
npm install-scripts approve <paquete> --no-allow-scripts-pin
```
