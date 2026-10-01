"use client";

import { useEffect } from "react";

/** Actualiza el número del icono de la app con las tareas pendientes de hoy. */
export function BadgeSync({ count }: { count: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!nav.setAppBadge) return;
    (count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.())?.catch(() => {});
  }, [count]);
  return null;
}
