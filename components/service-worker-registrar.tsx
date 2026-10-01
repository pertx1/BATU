"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ServiceWorkerRegistrar() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});

    // Si el SW no puede navegar la ventana, nos pide que lo hagamos nosotros.
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "navigate" && typeof event.data.url === "string") {
        const url = new URL(event.data.url);
        if (url.origin === location.origin) router.push(url.pathname + url.search);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
