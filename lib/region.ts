/** Región de AWS de Supabase → región de funciones de Vercel más cercana. */
const SUPABASE_TO_VERCEL: Record<string, string> = {
  "us-east-1": "iad1",
  "us-east-2": "cle1",
  "us-west-1": "sfo1",
  "us-west-2": "pdx1",
  "ca-central-1": "yul1",
  "sa-east-1": "gru1",
  "eu-west-1": "dub1",
  "eu-west-2": "lhr1",
  "eu-west-3": "cdg1",
  "eu-central-1": "fra1",
  "eu-central-2": "fra1",
  "eu-north-1": "arn1",
  "ap-south-1": "bom1",
  "ap-southeast-1": "sin1",
  "ap-southeast-2": "syd1",
  "ap-northeast-1": "hnd1",
  "ap-northeast-2": "icn1",
};

/** "aws-0-eu-central-1.pooler.supabase.com" → "eu-central-1". */
export function supabaseRegion(host: string): string | null {
  const m = /^aws-\d+-([a-z]{2}-[a-z]+-\d)\.pooler\.supabase\.com$/.exec(host);
  return m ? m[1] : null;
}

export function regionAdvice(dbHost: string, vercelRegion: string | undefined) {
  const db = supabaseRegion(dbHost);
  const ideal = db ? SUPABASE_TO_VERCEL[db] : undefined;
  const actual = vercelRegion?.split(",")[0]?.trim() || null;
  return {
    regionBaseDeDatos: db,
    regionServidor: actual,
    regionRecomendada: ideal ?? null,
    mismaZona: ideal && actual ? ideal === actual : null,
  };
}
