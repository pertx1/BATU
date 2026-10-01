import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrls } from "@/lib/db-url.mjs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Ajusta la URL para Neon: con el pooler (PgBouncer) desactiva las sentencias
 * preparadas de Prisma, y da margen a que la base de datos "despierte" si
 * estaba suspendida (plan gratuito).
 */
function databaseUrl(): string | undefined {
  const raw = resolveDatabaseUrls(process.env)?.url;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.hostname.includes("-pooler.") && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "15");
    return url.toString();
  } catch {
    return raw;
  }
}

function createClient() {
  const url = databaseUrl();
  return new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
