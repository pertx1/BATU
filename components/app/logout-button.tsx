"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { api } from "@/lib/client/api";

/** Cierra sesión y elimina la suscripción push de ESTE dispositivo. */
export async function logout() {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      await sub?.unsubscribe();
    }
    if ("clearAppBadge" in navigator) await navigator.clearAppBadge().catch(() => {});
  } catch {
    // seguimos con el cierre de sesión aunque falle la parte del navegador
  }
  await api("/api/auth/logout", { method: "POST" }).catch(() => {});
  // Recarga completa a propósito: limpia todo el estado de la sesión anterior.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/login";
}

export function LogoutButton({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      className={`btn btn-secondary w-full text-danger ${className}`}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await logout();
      }}
    >
      <LogOut size={20} />
      {loading ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
  );
}
