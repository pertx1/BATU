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

1. **Base de datos (Supabase)**: en tu proyecto → **Connect** → pestaña *Connection String* →
   **Transaction pooler** (host `aws-0-<región>.pooler.supabase.com`, puerto **6543**).
   Copia esa URL y cambia `[YOUR-PASSWORD]` por la contraseña de la base de datos.
   - No uses la *Direct connection* (`db.xxxx.supabase.co`): es solo IPv6 y Vercel no llega.
   - Si la contraseña tiene símbolos (`@ # / ? :`), cámbiala por una solo con letras y números
     en *Project Settings → Database → Reset database password*.
2. **Vercel → Add New → Project** e importa este repositorio. Framework **Next.js** y el resto
   por defecto (Build Command `npm run build`, sin *Override*).
3. **Environment Variables** (Production): `DATABASE_URL` con la URL del paso 1 y el resto de
   `.env.example`. `DIRECT_URL` es opcional.
4. **Deploy**. Después abre `https://TU-APP.vercel.app/api/salud`: debe decir `"ok": true`.
   Si no, indica el problema (sin mostrar contraseñas).

Cómo funciona la base de datos en el despliegue (`scripts/build.mjs` y `lib/migrate.ts`):
- El build intenta `prisma migrate deploy`, pero **nunca falla por la base de datos**.
- Al arrancar, la app aplica sola las migraciones pendientes (compatibles con Prisma).
- En runtime se usa el pooler con `pgbouncer=true` y `connection_limit=1`; las migraciones
  van por el modo sesión (puerto 5432) del mismo pooler.

### Notificaciones push y cron

1. Genera las claves: `npm run secrets`. Imprime `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (pon tu email tras `mailto:`) y un `CRON_SECRET`.
   Añádelas en Vercel → Settings → Environment Variables y vuelve a desplegar.
   **No cambies las claves VAPID después**: todos los dispositivos tendrían que volver a activarlas.
2. En [cron-job.org](https://cron-job.org) crea un cronjob:
   - URL: `https://TU-APP.vercel.app/api/cron/tick?key=TU_CRON_SECRET`
   - Ejecución: **cada minuto**. Método GET.
   La respuesta es un JSON con lo enviado (`enviados`, `fallidos`, `esperandoNoMolestar`…).
3. En el iPhone: abre la web en Safari → Compartir → **Añadir a pantalla de inicio**, abre
   Antola desde el icono → **Menú → Ajustes → Activar notificaciones** → *Enviar notificación de prueba*.

Cómo funciona el programador (`lib/notifications/tick.ts`):
- Cada tarea, evento, hábito y resumen guarda su próximo disparo en UTC (`remindAt`,
  `nextReminderAt`, `Settings.next*At`); cada llamada busca todo lo que vence ya, en bloque.
- Cada aviso se reserva en `NotificationLog` con una clave única por usuario
  (`task:<id>:<hora>`, `morning:<día>`…): nunca se envía dos veces aunque el cron se repita.
- Lo que cae en "no molestar" se envía al terminar ese horario; lo que llega más de 2 h
  tarde se descarta. Las suscripciones que responden 404/410 se borran.

### Emails (recuperar contraseña) y administración

- **Resend**: crea una cuenta en [resend.com](https://resend.com), verifica tu dominio
  (Domains → Add domain) y crea una API key. En Vercel define `RESEND_API_KEY` y
  `EMAIL_FROM` (p. ej. `Antola <no-reply@tudominio.com>`, con el dominio verificado).
  Sin dominio propio, Resend solo deja enviar a tu propio email desde `onboarding@resend.dev`.
- Los enlaces para restablecer la contraseña caducan en 1 hora, son de un solo uso y
  cierran la sesión en todos los dispositivos.
- **Admin**: `ADMIN_EMAIL` es la única cuenta que ve *Menú → Administración* (`/admin`):
  número de usuarios, fecha de registro, última actividad y desactivar/reactivar cuentas.
  No puede ver tareas ni ningún otro contenido. Para el resto, `/admin` responde 404.

### Scripts de instalación (npm 11+/12)

Las versiones recientes de npm bloquean por defecto los scripts de instalación de las
dependencias. Los que necesita la app (Prisma, esbuild…) están autorizados en el campo
`allowScripts` de `package.json`. Si añades una dependencia que los necesite:

```bash
npm install-scripts ls        # ver cuáles están bloqueados
npm install-scripts approve <paquete> --no-allow-scripts-pin
```
