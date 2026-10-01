"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div className="pt-safe fixed inset-x-0 top-0 z-50 bg-warning text-center text-sm font-semibold text-black">
      <div className="px-4 py-2">Sin conexión. Los cambios no se guardarán hasta que vuelva.</div>
    </div>
  );
}
