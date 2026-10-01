import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrls, runtimeUrl } from "@/lib/db-url.mjs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** URL de la BD ajustada para serverless (pgbouncer, timeouts…), ver lib/db-url.mjs. */
function databaseUrl(): string | undefined {
  const resolved = resolveDatabaseUrls(process.env);
  return resolved ? runtimeUrl(resolved.url) : undefined;
}

function createClient() {
  const url = databaseUrl();
  return new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
