// Resolución y limpieza de las URLs de PostgreSQL (Supabase o Neon). Lo usan el
// script de build (migraciones) y el cliente de Prisma en runtime.
//
// Supabase:
// - Pooler en modo transacción: aws-X-<región>.pooler.supabase.com:6543 → app
//   (necesita pgbouncer=true).
// - Pooler en modo sesión: mismo host, puerto 5432 → migraciones.
// - Conexión directa db.<ref>.supabase.co: solo IPv6, Vercel NO puede usarla.

/**
 * Limpia una URL pegada a mano: espacios, comillas, el prefijo `psql` que
 * muestra Neon en "Connect" y el parámetro channel_binding (Prisma no lo usa).
 * @param {string | undefined} raw
 * @returns {string | null}
 */
export function cleanDatabaseUrl(raw) {
  if (!raw) return null;
  let s = raw.trim();
  if (s.toLowerCase().startsWith("psql ")) s = s.slice(5).trim();
  s = s.replace(/^['"]+|['"]+$/g, "").trim();
  if (!/^postgres(ql)?:\/\//i.test(s)) return null;
  try {
    const url = new URL(s);
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    return null;
  }
}

export function isSupabasePooler(url) {
  try {
    return new URL(url).hostname.endsWith(".pooler.supabase.com");
  } catch {
    return false;
  }
}

export function isSupabaseDirect(url) {
  try {
    return /^db\.[a-z0-9]+\.supabase\.co$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * URL del pooler → URL apta para migraciones.
 * Supabase: puerto 6543 (transacción) → 5432 (sesión). Neon: quita "-pooler" del host.
 */
export function directFromPooled(url) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith(".pooler.supabase.com")) {
      if (u.port === "6543") u.port = "5432";
      u.searchParams.delete("pgbouncer");
      u.searchParams.delete("connection_limit");
      return u.toString();
    }
    if (!u.hostname.includes("-pooler.")) return url;
    u.hostname = u.hostname.replace("-pooler.", ".");
    u.searchParams.delete("pgbouncer");
    return u.toString();
  } catch {
    return url;
  }
}

/** URL para la app en runtime (serverless). */
export function runtimeUrl(url) {
  try {
    const u = new URL(url);
    const transactionPooler =
      (u.hostname.endsWith(".pooler.supabase.com") && u.port === "6543") || u.hostname.includes("-pooler.");
    if (transactionPooler) {
      if (!u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
      if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "1");
    }
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "15");
    return u.toString();
  } catch {
    return url;
  }
}

/** Problemas típicos de configuración, en español (sin revelar secretos). */
export function diagnoseDatabaseUrl(raw) {
  const problems = [];
  if (!raw) return problems;
  if (/\[YOUR-PASSWORD\]|\[PASSWORD\]|YOUR-PASSWORD/i.test(raw)) {
    problems.push("La URL todavía contiene [YOUR-PASSWORD]: sustitúyelo por la contraseña real de la base de datos (sin corchetes).");
  }
  const cleaned = cleanDatabaseUrl(raw);
  let suspicious = false;
  if (cleaned) {
    const afterScheme = raw.trim().replace(/^[^:]+:\/\//, "");
    const u = new URL(cleaned);
    const host = u.hostname;
    suspicious =
      (afterScheme.split("/")[0].match(/@/g) ?? []).length > 1 ||
      /#/.test(raw) ||
      (!host.includes(".") && host !== "localhost" && !/^[\d:]+$/.test(host));
  }
  if (suspicious) {
    problems.push(
      "Parece que la contraseña tiene símbolos (@ # / ? :) que rompen la URL. Cambia la contraseña de la base de datos en Supabase (Project Settings → Database) por una solo con letras y números y actualiza la URL.",
    );
  } else if (!cleaned) {
    problems.push(
      "La URL no tiene un formato válido. Debe empezar por postgresql://. Si la contraseña tiene símbolos (@ # / ? : %), cámbiala en Supabase por una solo con letras y números.",
    );
  } else if (isSupabasePooler(cleaned) && !decodeURIComponent(new URL(cleaned).username).includes(".")) {
    problems.push(
      "Con el pooler de Supabase el usuario debe ser «postgres.TU_REF» (no solo «postgres»). Copia la URL completa desde Supabase → Connect → Transaction pooler.",
    );
  } else if (isSupabaseDirect(cleaned)) {
    problems.push(
      "Estás usando la conexión directa de Supabase (db.xxxx.supabase.co), que solo funciona por IPv6 y Vercel no puede usarla. En Supabase → Connect elige «Transaction pooler» (puerto 6543) y usa esa URL.",
    );
  }
  return problems;
}

const POOLED_NAMES = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
const DIRECT_NAMES = ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];

/** Busca la variable por nombre exacto o con prefijo (p. ej. STORAGE_DATABASE_URL). */
function find(env, names) {
  for (const name of names) {
    const value = cleanDatabaseUrl(env[name]);
    if (value) return { name, value };
  }
  for (const name of names) {
    const key = Object.keys(env).find((k) => k.endsWith(`_${name}`) && cleanDatabaseUrl(env[k]));
    if (key) return { name: key, value: cleanDatabaseUrl(env[key]) };
  }
  return null;
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {{ url: string, urlSource: string, directUrl: string, directSource: string } | null}
 */
export function resolveDatabaseUrls(env) {
  const pooled = find(env, POOLED_NAMES);
  let direct = find(env, DIRECT_NAMES);
  const main = pooled ?? direct;
  if (!main) return null;
  // La conexión directa de Supabase es solo IPv6 (inalcanzable desde Vercel):
  // si tenemos el pooler, migramos por su modo sesión (puerto 5432).
  if (direct && pooled && isSupabaseDirect(direct.value) && isSupabasePooler(pooled.value)) direct = null;
  return {
    url: main.value,
    urlSource: main.name,
    directUrl: direct ? direct.value : directFromPooled(main.value),
    directSource: direct ? direct.name : `${main.name} (modo sesión / sin pooler)`,
  };
}

/** Problemas detectados en las variables de base de datos definidas. */
export function diagnoseEnv(env) {
  const out = [];
  for (const key of databaseEnvNames(env)) {
    if (!/URL/.test(key)) continue;
    for (const p of diagnoseDatabaseUrl(env[key])) out.push(`${key}: ${p}`);
  }
  return out;
}

/** Nombres (nunca valores) de las variables que parecen de base de datos. */
export function databaseEnvNames(env) {
  return Object.keys(env).filter((k) => /DATABASE|POSTGRES|DIRECT_URL|^PG/.test(k)).sort();
}
