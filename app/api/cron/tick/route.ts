import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { describeServerError } from "@/lib/api";
import { ensureMigrated } from "@/lib/migrate";
import { runTick } from "@/lib/notifications/tick";
import { syncAllProfity } from "@/lib/integrations/profity";
import { notificationEnvStatus } from "@/lib/deploy-info";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** ?key=CRON_SECRET (cron-job.org) o "Authorization: Bearer CRON_SECRET" (Vercel Cron). */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return safeEqual(key, secret) || safeEqual(bearer, secret);
}

/**
 * Programador de avisos. Hay que llamarlo cada minuto desde fuera (cron-job.org):
 * GET /api/cron/tick?key=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    const info = notificationEnvStatus();
    return NextResponse.json(
      {
        ok: false,
        error: `Falta la variable CRON_SECRET en el servidor (entorno de Vercel: ${info.entorno}).`,
        ayuda: `En Vercel → Settings → Environment Variables, añade CRON_SECRET marcando «${info.entorno === "production" ? "Production" : info.entorno === "preview" ? "Preview" : "Production y Preview"}» y haz Redeploy.`,
        ...info,
      },
      { status: 503 },
    );
  }
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "Clave incorrecta" }, { status: 401 });

  try {
    await ensureMigrated();
    const report = await runTick();
    // ?profity=1: sincroniza ya el stock de Profity de todos los conectados (normalmente va cada hora).
    if (req.nextUrl.searchParams.get("profity") === "1") {
      return NextResponse.json({ ...report, profity: await syncAllProfity() }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!report.clavesVapid) {
      console.warn("[antola] cron: faltan las claves VAPID; no se envían avisos.");
    }
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[antola] cron/tick:", err);
    const [status, error] = describeServerError(err);
    return NextResponse.json({ ok: false, error }, { status });
  }
}
