import "server-only";
import webpush from "web-push";
import type { PushPayload } from "@/lib/notifications/messages";

export type VapidConfig = { publicKey: string; privateKey: string; subject: string };

/** Claves VAPID desde el entorno (null si faltan). */
export function vapidConfig(): VapidConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  let subject = process.env.VAPID_SUBJECT?.trim() || process.env.APP_URL?.trim() || "";
  if (subject && !/^(mailto:|https:\/\/)/.test(subject)) subject = `mailto:${subject}`;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export function vapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

/**
 * Servicios push reales de los navegadores. El servidor hace un POST al
 * endpoint de cada suscripción, así que no aceptamos cualquier URL (SSRF).
 */
const PUSH_HOSTS = [
  /^web\.push\.apple\.com$/,
  /(^|\.)push\.apple\.com$/,
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /(^|\.)notify\.windows\.com$/,
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

export type StoredSubscription = { id: string; endpoint: string; p256dh: string; auth: string };

export type SendResult =
  | { ok: true }
  | { ok: false; gone: boolean; error: string };

/** Envía un aviso a una suscripción. `gone` = el navegador la ha dado de baja (404/410). */
export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload,
  vapid: VapidConfig,
  ttlSeconds = 2 * 60 * 60,
): Promise<SendResult> {
  if (!isAllowedPushEndpoint(sub.endpoint)) return { ok: false, gone: true, error: "Endpoint no permitido" };
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ ...payload, timestamp: payload.timestamp ?? Date.now() }),
      {
        vapidDetails: vapid,
        TTL: ttlSeconds,
        urgency: "high",
        timeout: 10_000,
      },
    );
    return { ok: true };
  } catch (err) {
    const { statusCode, body } = err as { statusCode?: number; body?: unknown };
    if (typeof statusCode === "number") {
      return {
        ok: false,
        gone: statusCode === 404 || statusCode === 410,
        error: `HTTP ${statusCode}${body ? `: ${String(body).slice(0, 200)}` : ""}`,
      };
    }
    return { ok: false, gone: false, error: (err as Error)?.message?.slice(0, 200) ?? "Error desconocido" };
  }
}

/** Ejecuta tareas asíncronas en lotes, sin que un fallo pare al resto. */
export async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.allSettled(items.slice(i, i + size).map(fn))));
  }
  return results;
}
