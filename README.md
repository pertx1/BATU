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
   - Build Command (activa *Override*): `npm run vercel-build`
     (ejecuta `prisma generate && prisma migrate deploy && next build`)
   - Install Command y Output Directory: por defecto
3. **Environment Variables**: añade todas las de `.env.example` (marca solo *Production*).
4. **Deploy**. Después ajusta `APP_URL` a la URL definitiva y vuelve a desplegar.
5. Si trabajas en una rama distinta de `main`, cámbiala en
   *Settings → Environments → Production → Branch Tracking*.
