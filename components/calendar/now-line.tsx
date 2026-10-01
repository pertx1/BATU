"use client";

import { useSyncExternalStore } from "react";

function nowMinutes(timeZone: string): number {
  const parts = new Intl.DateTimeFormat("es-ES", { timeZone, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function subscribe(cb: () => void) {
  const id = setInterval(cb, 30000);
  return () => clearInterval(id);
}

/** Línea roja con la hora actual (en la zona horaria del usuario). */
export function NowLine({ hourPx, timeZone }: { hourPx: number; timeZone: string }) {
  const minutes = useSyncExternalStore(subscribe, () => nowMinutes(timeZone), () => null);
  if (minutes == null) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: (minutes / 60) * hourPx }}>
      <span className="ml-12 size-2.5 rounded-full bg-danger" />
      <span className="h-0.5 flex-1 bg-danger" />
    </div>
  );
}
