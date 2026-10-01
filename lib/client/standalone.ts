"use client";

import { useSyncExternalStore } from "react";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** ¿Está abierta como app instalada (pantalla de inicio)? */
export function useStandalone(): boolean {
  return useSyncExternalStore(subscribe, isStandalone, () => false);
}
