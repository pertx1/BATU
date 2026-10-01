"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Pantallas visitadas dentro de la app en esta sesión de la pestaña.
let inAppVisits = 0;

/** Cuenta las navegaciones dentro de Antola (va en el layout de la app). */
export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    inAppVisits++;
  }, [pathname]);
  return null;
}

/**
 * Salir de una pantalla de edición tras guardar: vuelve a la pantalla anterior
 * de Antola; si se llegó directamente (p. ej. desde una notificación), va a
 * `fallback`. Los datos ya llegan actualizados: cada cambio vacía la caché.
 */
export function useLeave() {
  const router = useRouter();
  return (fallback: string) => {
    if (inAppVisits > 1) router.back();
    else router.replace(fallback);
  };
}
