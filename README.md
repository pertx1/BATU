# Antola

PWA multiusuario para organizar el día a día, pensada para usarse **instalada en el iPhone**
y con **notificaciones push**. Cada persona tiene su cuenta y solo ve sus datos. Toda la
interfaz está en español.

- **Hoy**: saludo, tareas vencidas (reprogramar a hoy o mañana), tareas, hábitos y eventos
  del día, barra de progreso y el objetivo «foco».
- **Tareas**: fecha, hora, prioridad, proyecto, objetivo, subtareas, recordatorio (a una
  hora o X minutos antes), repetición (diaria, días concretos, semanal, mensual), bandeja de
  entrada y captura rápida con el botón «+».
- **Hábitos** (en el menú de Hoy): días de la semana, recordatorio, rachas, cuadrícula de las
  últimas semanas y hábitos sanos predefinidos que se activan con un toque.
- **Calendario**: vistas mensual, semanal y diaria; eventos con recordatorio.
- **Objetivos**: numéricos (con gráfica de evolución), por hitos, por tareas vinculadas o de
  peso (sigue la tendencia de los pesajes).
- **Comida**: plan personal (TMB, gasto diario, calorías, macros, fibra y agua) con límites de
  seguridad; **Diario** con anillos de calorías y macros, agua y comidas que se describen
  con texto (o dictando) y estima la IA (rangos, corrección, comidas habituales, hambre y saciedad);
  **Análisis** (calorías, macros, agua, constancia, hambre) y **Peso** (tendencia, objetivo,
  hitos, proyección e historial).
- **Antola**: la hormiga que acompaña. XP, niveles, migas, logros, retos semanales, tienda de
  accesorios y frases que nunca regañan (y nunca juzgan la comida, el cuerpo ni el peso).
- **Estadísticas** (7 y 30 días) y **revisión semanal** guiada con historial.
- **Avisos**: tareas, eventos, hábitos, resumen de la mañana, repaso de la noche, tareas
  atrasadas, revisión semanal, beber agua y pesarse, con horario de «no molestar».
- **Mi cuenta** (exportar/eliminar), recuperar contraseña, panel de administración y
  página de privacidad.

**Stack**: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 + PostgreSQL
(Supabase) · date-fns + date-fns-tz · web-push (VAPID) · Resend · recharts · Anthropic SDK
(estimación de comidas) · Vercel (o Render).

---

## Índice

1. [Puesta en marcha en 10 minutos](#1-puesta-en-marcha-en-10-minutos)
2. [Variables de entorno](#2-variables-de-entorno)
3. [Claves VAPID y CRON_SECRET](#3-claves-vapid-y-cron_secret)
4. [Base de datos (Supabase)](#4-base-de-datos-supabase)
5. [Despliegue en Vercel](#5-despliegue-en-vercel)
6. [Despliegue en Render (alternativa)](#6-despliegue-en-render-alternativa)
7. [Programar los avisos con cron-job.org](#7-programar-los-avisos-con-cron-joborg)
8. [Emails con Resend](#8-emails-con-resend)
9. [Comida: estimación con IA (Anthropic)](#9-comida-estimación-con-ia-anthropic)
10. [Instalar en el iPhone y activar las notificaciones](#10-instalar-en-el-iphone-y-activar-las-notificaciones)
11. [Administración](#11-administración)
12. [Seguridad](#12-seguridad)
13. [Tests](#13-tests)
14. [Desarrollo local](#14-desarrollo-local)
15. [Cómo funciona por dentro](#15-cómo-funciona-por-dentro)
16. [Solución de problemas](#16-solución-de-problemas)
17. [Conectar con Profity (tareas de stock)](#17-conectar-con-profity-tareas-de-stock)

---

## 1. Puesta en marcha en 10 minutos

1. Crea un proyecto en **Supabase** y copia la URL del *Transaction pooler* ([§4](#4-base-de-datos-supabase)).
2. Genera las claves: `npm install && npm run secrets` ([§3](#3-claves-vapid-y-cron_secret)).
3. Importa el repositorio en **Vercel** y añade las variables ([§2](#2-variables-de-entorno), [§5](#5-despliegue-en-vercel)).
4. Abre `https://TU-APP.vercel.app/api/salud` → debe decir `"ok": true`.
5. Crea en **cron-job.org** una llamada cada minuto a `/api/cron/tick?key=…` ([§7](#7-programar-los-avisos-con-cron-joborg)).
6. Instálala en el iPhone y activa las notificaciones ([§10](#10-instalar-en-el-iphone-y-activar-las-notificaciones)).
7. (Opcional) Configura Resend para recuperar contraseñas ([§8](#8-emails-con-resend)).
8. Pon la clave de la IA de Comida ([§9](#9-comida-estimación-con-ia-anthropic)).

## 2. Variables de entorno

Plantilla en [`.env.example`](.env.example). En Vercel: **Settings → Environment Variables**,
marca **Production, Preview y Development** y vuelve a desplegar después de cambiarlas.

| Variable | Obligatoria | Para qué | Ejemplo |
|---|---|---|---|
| `DATABASE_URL` | **Sí** | PostgreSQL. En Supabase, la URL del *Transaction pooler* (puerto 6543). | `postgresql://postgres.abcd:CLAVE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres` |
| `DIRECT_URL` | No | Conexión para las migraciones. Si falta, se usa el mismo pooler en modo sesión (puerto 5432). | `…pooler.supabase.com:5432/postgres` |
| `APP_URL` | **Sí** | URL pública, sin barra final. Se usa en los enlaces de los emails. | `https://antola-ak.vercel.app` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Para avisos | Clave pública VAPID ([§3](#3-claves-vapid-y-cron_secret)). | `BKx…` |
| `VAPID_PRIVATE_KEY` | Para avisos | Clave privada VAPID. **Secreta.** | `x3…` |
| `VAPID_SUBJECT` | Para avisos | Contacto para los servicios push: `mailto:` + tu email. | `mailto:tu@email.com` |
| `CRON_SECRET` | Para avisos | Clave del endpoint del cron. **Secreta.** | `9f2c…` (48 caracteres) |
| `ADMIN_EMAIL` | No | Email de la única cuenta con acceso a `/admin`. | `tu@email.com` |
| `ALLOW_SIGNUP` | No | `true` (por defecto): registro abierto. `false`: cerrado. | `true` |
| `RESEND_API_KEY` | Para emails | API key de Resend ([§8](#8-emails-con-resend)). **Secreta.** | `re_…` |
| `EMAIL_FROM` | Para emails | Remitente, con un dominio verificado en Resend. | `Antola <no-reply@tudominio.com>` |
| `ANTHROPIC_API_KEY` | Para la IA | Estimación de calorías y macros de las comidas ([§9](#9-comida-estimación-con-ia-anthropic)). **Secreta.** | `sk-ant-…` |
| `PROFITY_URL` | Para Profity | URL de tu Profity, sin barra final ([§17](#17-conectar-con-profity-tareas-de-stock)). | `https://profity-tuusuario.vercel.app` |
| `PROFITY_TOKEN` | Para Profity | Clave compartida con Profity (la misma que su `ANTOLA_TOKEN`). **Secreta.** | `7c1…` (48 caracteres) |
| `PROFITY_USER_EMAIL` | Para Profity | Cuenta de Antola donde aparecen las tareas de stock. | `tu@email.com` |
| `ANTHROPIC_MODEL` | No | Modelo para estimar. Por defecto `claude-haiku-4-5-20251001`. | `claude-haiku-4-5-20251001` |

Sin las variables de avisos la app funciona igual, pero no envía notificaciones; sin las de
email, «He olvidado mi contraseña» no llega a enviar el correo. Sin `ANTHROPIC_API_KEY`, las
comidas se apuntan con sus valores a mano.
`/api/salud` dice qué variables están puestas (nunca sus valores).

## 3. Claves VAPID y CRON_SECRET

Las claves VAPID identifican a tu servidor ante los servicios push (Apple, Google, Mozilla).

```bash
npm install
npm run secrets
```

Imprime las cuatro líneas listas para pegar:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=…
VAPID_PRIVATE_KEY=…
VAPID_SUBJECT=mailto:tu-email@ejemplo.com   ← pon tu email
CRON_SECRET=…
```

También vale `npx web-push generate-vapid-keys` para las VAPID y
`openssl rand -hex 24` para el `CRON_SECRET`.

> ⚠️ **No cambies las claves VAPID una vez en uso**: todas las suscripciones dejarían de
> funcionar y cada persona tendría que volver a activar las notificaciones.

## 4. Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com). Usa una contraseña **solo con
   letras y números** (los símbolos `@ # / ? :` rompen la URL).
2. Pulsa **Connect** (arriba) → pestaña *Connection String* → **Transaction pooler**.
3. Copia la URL y sustituye `[YOUR-PASSWORD]` por la contraseña (sin corchetes). Debe tener:
   - host `aws-0-<región>.pooler.supabase.com`, puerto **6543**;
   - usuario `postgres.<ref-del-proyecto>` (no solo `postgres`).
4. Úsala como `DATABASE_URL`.

**No uses la *Direct connection*** (`db.<ref>.supabase.co`): solo funciona por IPv6 y
Vercel no puede conectarse. Las tablas se crean solas (ver [§15](#15-cómo-funciona-por-dentro)).

También funciona con cualquier PostgreSQL 14+ (Neon, Render, local…).

## 5. Despliegue en Vercel

1. **Vercel → Add New → Project** e importa este repositorio.
2. Framework **Next.js**. Deja *Build Command*, *Install Command* y *Output* por defecto
   (el build usa `npm run build`).
3. Añade las variables de [§2](#2-variables-de-entorno) (Production, Preview y Development).
4. **Deploy**.
5. Abre `https://TU-APP.vercel.app/api/salud`:
   - `{"ok":true,…}` → todo bien.
   - Si no, el JSON dice qué falla (`paso`: configuración, conexión, migraciones o tablas) y
     cómo arreglarlo, sin mostrar contraseñas.

Cada `git push` vuelve a desplegar. Si cambias variables, ve a **Deployments → ⋯ → Redeploy**.

## 6. Despliegue en Render (alternativa)

1. **New → Web Service** y conecta el repositorio.
2. Runtime **Node**, *Build Command*: `npm install && npm run build`,
   *Start Command*: `npm run start`.
3. Añade las variables de [§2](#2-variables-de-entorno) (`APP_URL` = la URL `.onrender.com`).
4. En Render el build ejecuta **`prisma migrate deploy`** automáticamente (detecta la variable
   `RENDER`). Si falla, la app vuelve a intentarlo al arrancar.

El plan gratuito de Render duerme el servidor: por eso los avisos no usan temporizadores
internos, sino el cron externo de [§7](#7-programar-los-avisos-con-cron-joborg), que además lo despierta.

## 7. Programar los avisos con cron-job.org

1. Crea una cuenta gratuita en [cron-job.org](https://cron-job.org) → **Create cronjob**.
2. **URL**: `https://TU-APP.vercel.app/api/cron/tick?key=TU_CRON_SECRET`
3. **Execution schedule**: *Every minute*.
4. En *Advanced*: método **GET**, *Timeout* 30 s. Guarda.
5. Pulsa **Test run**. Debe responder `200` con un JSON como:

```json
{"ok":true,"ms":42,"clavesVapid":true,"pendientes":{"tareas":0,"eventos":0,"habitos":0,"ajustes":1},
 "avisos":1,"enviados":1,"fallidos":0,"sinDispositivo":0,"duplicados":0,"esperandoNoMolestar":0,
 "descartados":0,"dispositivosBorrados":0}
```

La respuesta incluye también `"comida":{"agua":…,"pesaje":…}`: los recordatorios de beber
agua y de pesarse salen de esta misma llamada.

- `401 Clave incorrecta` → la `key` no coincide con `CRON_SECRET`.
- `"clavesVapid": false` → faltan las variables VAPID.

Si un minuto se salta o se repite no pasa nada: cada llamada recoge lo pendiente y nunca
envía dos veces el mismo aviso. Con Vercel también se puede usar *Vercel Cron* (envía
`Authorization: Bearer CRON_SECRET`), pero el plan gratuito solo permite una ejecución al día.

## 8. Emails con Resend

1. Crea una cuenta en [resend.com](https://resend.com).
2. **Domains → Add domain** y añade los registros DNS que te indique hasta que aparezca
   *Verified*. (Sin dominio propio, Resend solo deja enviar desde `onboarding@resend.dev` y
   solo a tu propio email: sirve para probar.)
3. **API Keys → Create API key** → cópiala en `RESEND_API_KEY`.
4. `EMAIL_FROM` = `Antola <no-reply@tudominio.com>` (con el dominio verificado).

El email de recuperación lleva un enlace que **caduca en 1 hora** y **solo sirve una vez**.

## 9. Comida: estimación con IA (Anthropic)

Las comidas se registran **describiéndolas con texto** (o dictando con el micrófono) y la IA
calcula las calorías, la proteína, los carbohidratos, la grasa y la fibra. No se usan fotos.

1. En [console.anthropic.com](https://console.anthropic.com) → **API Keys → Create Key**.
   Cópiala en `ANTHROPIC_API_KEY` (solo en el servidor: nunca llega al navegador).
2. En **Billing**, añade saldo y pon un **límite de gasto mensual** (Settings → Limits).
3. (Opcional) `ANTHROPIC_MODEL` para otro modelo. Por defecto, `claude-haiku-4-5-20251001`,
   rápido y barato.
4. Redespliega y comprueba en `/api/salud` que aparece la variable.

- Cada persona tiene un máximo de **20 estimaciones al día**; después puede seguir apuntando
  a mano. Se puede desactivar en *Comida → Ajustes*.
- La IA devuelve cada alimento con **rangos** (mínimo y máximo) y su confianza; la app guarda
  la estimación completa y los puntos medios para sumar. Se puede corregir («era media
  ración») y vuelve a estimar, o cambiar la ración de cada alimento.
- Lo que escribe el usuario se trata como datos, nunca como instrucciones para la IA.
- Sin la clave, Comida funciona igual poniendo los valores a mano.

**Cálculos y límites de salud**
- TMB con Mifflin-St Jeor, gasto diario con el factor de actividad y 7700 kcal por kg para el
  ritmo. Desde los 13 años; a los menores de 18 se les recomienda hablarlo con su médico.
- Nunca por debajo de la TMB, nunca más de un 1 % del peso por semana, sin bajar de peso con
  un IMC menor de 18,5 ni un peso objetivo por debajo de ese IMC.
- Si la tendencia cambia 2 kg desde el último cálculo, Antola propone recalcular; si baja
  más de un 1 % por semana dos semanas seguidas, recomienda ir más despacio.
- XP solo por registrar y cuidarse (3 comidas, agua, proteína, hambre y saciedad, pesarse),
  y solo hoy o ayer. Nunca por comer poco ni bajar rápido, y nunca se restan.
- Sin rojo ni mensajes de «te has pasado»: por encima del objetivo se dice en color neutro.

## 10. Instalar en el iPhone y activar las notificaciones

Necesitas **iOS 16.4 o posterior**. En el iPhone las notificaciones web solo funcionan con
la app instalada en la pantalla de inicio.

1. Abre la URL de la app en **Safari** (no en Chrome ni en otra app).
2. Pulsa **Compartir** (el cuadrado con la flecha hacia arriba) → **Añadir a pantalla de inicio** → **Añadir**.
3. Abre **Antola desde el icono** de la pantalla de inicio e inicia sesión.
4. Ve a **Menú (☰) → Ajustes → Activar notificaciones** y pulsa **Permitir**.
5. Pulsa **Enviar notificación de prueba**: debería llegarte en unos segundos.
6. En **Ajustes** elige qué avisos quieres, sus horas y el horario de «no molestar».

Si no llegan:
- Ajustes del iPhone → **Notificaciones → Antola**: que estén permitidas.
- Que el modo **Concentración / No molestar** del iPhone no las silencie.
- Si cambiaste las claves VAPID o reinstalaste la app: Ajustes de Antola →
  *Desactivar en este dispositivo* → *Activar notificaciones* otra vez.

Al tocar una notificación se abre la tarea o el evento con botones rápidos:
**Hecho**, **Posponer 15 min**, **Posponer 1 h** y **Mañana** (iOS no admite botones dentro
de las notificaciones web). El número del icono muestra las tareas pendientes de hoy.

## 11. Administración

La cuenta cuyo email coincide con `ADMIN_EMAIL` ve **Menú → Administración** (`/admin`):

- número de usuarios, activos en los últimos 7 días y desactivados;
- lista con email, fecha de registro y última actividad, con buscador;
- **desactivar / reactivar** cuentas (desactivar cierra todas sus sesiones al momento).

El administrador **no puede ver tareas, hábitos, eventos, comidas, pesos ni ningún otro
contenido**. Para
cualquier otra cuenta, `/admin` responde 404.

## 12. Seguridad

**Aislamiento de datos**
- Todas las tablas de contenido tienen `userId` con índice y borrado en cascada.
- El `userId` sale **siempre de la sesión del servidor** (`withUser` en `lib/api.ts`), nunca
  del cliente.
- Toda lectura filtra por `userId`; toda edición o borrado comprueba que el registro es del
  usuario y responde **404** si no (no se distingue entre «no existe» y «es de otro»).
- Los ids que llegan en el cuerpo (proyecto, objetivo…) también se validan
  (`lib/data/ownership.ts`).

**Datos de salud (Comida y Peso)**
- Perfil, comidas, agua y pesajes son privados de cada cuenta, entran en «Exportar mis
  datos» y se borran al eliminar la cuenta.
- La clave de Anthropic solo existe en el servidor.

**Sesiones y acceso**
- Contraseñas con bcrypt. Sesiones en la BD; en la cookie solo va un token aleatorio cuyo
  SHA-256 es el id de la sesión. Cookie `httpOnly`, `Secure`, `SameSite=Lax`, 1 año.
- Bloqueo temporal tras 5 fallos de login por email (o 20 por IP) en 15 minutos. Lo mismo al
  pedir la contraseña actual (cambiar email/contraseña, borrar la cuenta).
- Límite de registros por IP y de peticiones de recuperación de contraseña.
- Recuperar contraseña no revela si un email existe; enlaces de un solo uso, 1 hora.
- Cambiar la contraseña cierra las demás sesiones; restablecerla, todas.
- Al cerrar sesión se borra la suscripción push de ese dispositivo.

**Peticiones**
- Protección CSRF: las peticiones que modifican datos deben venir del propio origen.
- Cabeceras: CSP estricta (solo recursos propios), HSTS, `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy`.
- El servidor solo envía avisos a servicios push reales (Apple, Google, Mozilla, Microsoft):
  no acepta suscripciones a URLs arbitrarias.
- Rutas públicas: login, registro, recuperar contraseña, privacidad, manifest, iconos,
  service worker, `/api/cron/tick` (con su clave) y `/api/salud` (sin datos de usuarios).
- El service worker **no cachea** páginas ni respuestas de la API (datos privados).

## 13. Tests

```bash
npm test                 # unitarios: fechas, recurrencia, horarios, "no molestar", gráficas, Comida y Antola…
npm run test:security    # aislamiento entre usuarios, contra un servidor en marcha
```

**Pruebas de aislamiento** (`tests/security/`): crean un usuario A con un dato de cada tipo y
un usuario B que ataca **todos los endpoints** con los ids de A (leer, editar, borrar,
completar, posponer, reprogramar, vincular a proyectos u objetivos ajenos, el panel de
admin…). Comprueban que B recibe 404, que ninguna respuesta contiene datos de A y que la
exportación completa de A queda **idéntica**. También prueban el acceso sin sesión, cookies
inventadas, CSRF, SSRF, el bloqueo de login y que la exportación no incluye secretos.

`tests/unit/route-coverage.test.ts` (parte de `npm test`) falla si se añade un endpoint que
no esté en la matriz de ataques (`tests/security/matrix.ts`) o que no use `withUser`.

Para ejecutarlas:

```bash
npm run build && npm run start         # con una base de datos de PRUEBAS
TEST_BASE_URL=http://localhost:3000 npm run test:security
```

> Crean dos usuarios de prueba (`…@aislamiento.test`) y los borran al terminar. Aun así,
> lánzalas contra una base de datos de pruebas, no contra producción.

## 14. Desarrollo local

Requisitos: Node 24 y PostgreSQL.

```bash
cp .env.example .env     # DATABASE_URL de tu PostgreSQL local, CRON_SECRET, claves VAPID…
npm install
npx prisma migrate dev   # crea las tablas
npm run dev              # http://localhost:3000
```

Sin `RESEND_API_KEY`, en desarrollo el enlace de recuperación de contraseña se muestra en la
consola del servidor. Para probar los avisos: `curl "localhost:3000/api/cron/tick?key=TU_CRON_SECRET"`.

Scripts útiles:

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar (aplica migraciones si puede) y arrancar |
| `npm run typecheck` | Tipos de rutas + TypeScript |
| `npm test` / `npm run test:security` | Tests (ver [§13](#13-tests)) |
| `npm run secrets` | Genera claves VAPID y `CRON_SECRET` |
| `npm run icons` | Regenera los iconos de la PWA |
| `npm run db:migrate` | Nueva migración de Prisma (desarrollo) |

**npm 11+/12** bloquea los scripts de instalación de las dependencias. Los necesarios
(Prisma, esbuild…) están autorizados en `allowScripts` de `package.json`. Si añades una
dependencia que los necesite: `npm install-scripts approve <paquete> --no-allow-scripts-pin`.

## 15. Cómo funciona por dentro

```
app/(auth)/        login, registro, recuperar, restablecer, privacidad (públicas)
app/(app)/         pantallas de la app (exigen sesión y haber completado la bienvenida)
app/api/           endpoints (withUser / withPublic en lib/api.ts)
lib/data/          consultas a la BD, siempre filtradas por userId
lib/notifications/ programador de avisos (timing, textos, envío, tick, agua y pesaje)
lib/nutrition/     Comida: cálculos, estimación con IA, peso, análisis
lib/antola/        Antola: XP, niveles, logros, retos, tienda y frases
lib/auth/          sesiones, contraseñas, límites de intentos, recuperación, admin
proxy.ts           redirige al login si no hay cookie (la sesión se valida en el servidor)
public/sw.js       service worker: push, clic en notificación, caché de estáticos
prisma/            esquema y migraciones
tests/             unitarios y de seguridad
```

**Fechas**: los instantes se guardan en UTC; los días de calendario como `date`
(`YYYY-MM-DD`); las horas del día como minutos desde medianoche en la zona del usuario.
Todo se muestra en la zona horaria de cada usuario (Ajustes). Al cambiarla, las tareas y
hábitos conservan su hora local.

**Migraciones**: el build intenta `prisma migrate deploy` (en Vercel/Render) pero nunca falla
por la base de datos. Al arrancar, la app aplica sola las migraciones pendientes
(`lib/migrate.ts`, compatible con la tabla `_prisma_migrations`), con un bloqueo para que dos
instancias no migren a la vez.

**Avisos** (`lib/notifications/tick.ts`): cada tarea, evento, hábito y resumen guarda su
próximo disparo en UTC (`Task.remindAt`, `Event.remindAt`, `Habit.nextReminderAt`,
`Settings.next*At`). Cada llamada al cron:
1. busca en bloque todo lo que vence ya, de todos los usuarios activos (sin N+1);
2. aplica «no molestar» (se envía al terminar) y descarta lo de hace más de 2 horas;
3. reserva cada aviso en `NotificationLog` con una clave única por usuario
   (`task:<id>:<hora>`, `morning:<día>`…), así que nunca se repite;
4. envía en lotes con `Promise.allSettled` (un fallo no para al resto), borra las
   suscripciones que responden 404/410 y programa el siguiente disparo;
5. cada hora limpia registros viejos, sesiones caducadas y enlaces usados.

Los recordatorios de Comida (`lib/notifications/nutrition-tick.ts`) usan
`NutritionProfile.nextWaterAt` y `nextWeighInAt`: el de agua solo avisa si vas por detrás de
lo esperado a esa hora (reparto entre tu hora de despertar y la de dormir), como mucho cada
2 horas; el de pesaje llega los días elegidos 15 minutos después de despertar, si aún no te
has pesado.

## 16. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| «Error interno» al entrar o registrarse | La app no llega a la base de datos | Abre `/api/salud` y sigue lo que indique |
| `/api/salud` → `"paso":"configuracion"`, `variablesDeBaseDeDatos: []` | Falta `DATABASE_URL` en ese entorno | Añádela en Vercel marcando Production, Preview y Development → Redeploy |
| `/api/salud` → `paso: "conexion"` | URL o contraseña incorrecta, o *Direct connection* | Usa el *Transaction pooler* (6543) con usuario `postgres.<ref>` |
| «prepared statement already exists» | Pooler sin `pgbouncer=true` | La app lo añade sola; comprueba que usas el puerto 6543 |
| No aparece «Activar notificaciones» | La app no está instalada | Ábrela desde el icono de la pantalla de inicio |
| La prueba dice «Ningún dispositivo…» | No hay suscripción guardada | Ajustes → Activar notificaciones |
| El cron responde `401` | `key` distinta de `CRON_SECRET` | Copia de nuevo la clave en cron-job.org |
| No llega el email de recuperación | Falta Resend o el dominio no está verificado | [§8](#8-emails-con-resend); mira también el spam |
| «Demasiados intentos» | Bloqueo por fallos de login | Espera 15 minutos o recupera la contraseña |
| «La estimación con IA no está configurada» | Falta `ANTHROPIC_API_KEY` | [§9](#9-comida-estimación-con-ia-anthropic) |
| Las comidas quedan «sin estimar» con un aviso | Clave sin saldo, límite de gasto o modelo no disponible | Revisa Billing y Limits en la consola de Anthropic |

## 17. Conectar con Profity (tareas de stock)

Cada hora Antola pregunta a Profity qué hay que pedir (lo mismo que su lista «Hay que pedir»:
stock a 0 o menos, restando los pedidos pendientes) y crea **una tarea por artículo**, para
hoy, con prioridad alta y aviso en el móvil: «Pedir Camiseta blanca · talla M».

1. Genera una clave: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
2. En el proyecto de **Profity** en Vercel: `ANTOLA_TOKEN` = esa clave y
   `ANTOLA_PROFITY_EMAIL` = tu email de Profity. Redespliega.
3. En el proyecto de **Antola** en Vercel: `PROFITY_URL` = la URL de Profity,
   `PROFITY_TOKEN` = la misma clave y `PROFITY_USER_EMAIL` = tu email de Antola. Redespliega.
4. Para no esperar a la siguiente hora: abre
   `https://TU-APP.vercel.app/api/cron/tick?key=TU_CRON_SECRET&profity=1` y mira `"profity"`
   en la respuesta (`creadas`, `faltan` o el `error`).

- No repite tareas. Si tachas una y el artículo sigue a 0, no vuelve a salir; cuando Profity
  ya tiene stock, la tarea pendiente se completa sola y, si vuelve a faltar, sale otra.
- Si borras una tarea (en vez de tacharla) y sigue faltando, vuelve a aparecer a la hora.
