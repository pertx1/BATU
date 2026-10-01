"use client";

import { api } from "@/lib/client/api";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration() {
  await navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Envía la suscripción al servidor (la liga a esta sesión). */
export async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  return api<{ ok: true; devices: number }>("/api/push/subscribe", {
    method: "POST",
    body: { endpoint: json.endpoint, keys: json.keys },
  });
}

/**
 * Crea la suscripción de este dispositivo. Ojo: el permiso se pide ANTES, con
 * Notification.requestPermission() directamente en el click (iOS lo exige).
 */
export async function subscribe(publicKey: string) {
  const reg = await withTimeout(registration(), "No se pudo preparar la app para recibir avisos. Ciérrala y vuelve a abrirla.");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await withTimeout(
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }),
        "El servicio de notificaciones no responde. Revisa tu conexión e inténtalo de nuevo.",
      );
    } catch (err) {
      if (err instanceof DOMException) {
        throw new Error("No se pudieron activar las notificaciones en este dispositivo. Inténtalo de nuevo.");
      }
      throw err;
    }
  }
  await saveSubscription(sub);
  return sub;
}

function withTimeout<T>(promise: Promise<T>, message: string, ms = 20_000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export async function unsubscribe() {
  const sub = await currentSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => {});
  await api("/api/push/subscribe", { method: "DELETE", body: { endpoint } }).catch(() => {});
}
