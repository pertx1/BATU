export function cleanDatabaseUrl(raw: string | undefined): string | null;
export function directFromPooled(url: string): string;
export function resolveDatabaseUrls(
  env: Record<string, string | undefined>,
): { url: string; urlSource: string; directUrl: string; directSource: string } | null;
export function databaseEnvNames(env: Record<string, string | undefined>): string[];
