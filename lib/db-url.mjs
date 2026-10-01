// Resolución y limpieza de las URLs de PostgreSQL (Neon). Lo usan el script de
// build (migraciones) y el cliente de Prisma en runtime.

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

/** Host con pooler de Neon → host directo. */
export function directFromPooled(url) {
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
  const direct = find(env, DIRECT_NAMES);
  const main = pooled ?? direct;
  if (!main) return null;
  return {
    url: main.value,
    urlSource: main.name,
    directUrl: direct ? direct.value : directFromPooled(main.value),
    directSource: direct ? direct.name : `${main.name} (sin "-pooler")`,
  };
}

/** Nombres (nunca valores) de las variables que parecen de base de datos. */
export function databaseEnvNames(env) {
  return Object.keys(env).filter((k) => /DATABASE|POSTGRES|DIRECT_URL|^PG/.test(k)).sort();
}
