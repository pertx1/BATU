export function cleanDatabaseUrl(raw: string | undefined): string | null;
export function directFromPooled(url: string): string;
export function resolveDatabaseUrls(
  env: Record<string, string | undefined>,
): { url: string; urlSource: string; directUrl: string; directSource: string } | null;
export function databaseEnvNames(env: Record<string, string | undefined>): string[];
export function isSupabasePooler(url: string): boolean;
export function isSupabaseDirect(url: string): boolean;
export function runtimeUrl(url: string): string;
export function diagnoseDatabaseUrl(raw: string | undefined): string[];
export function diagnoseEnv(env: Record<string, string | undefined>): string[];
