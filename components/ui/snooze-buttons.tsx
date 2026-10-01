"use client";

import { useState } from "react";
import { AlarmClock } from "lucide-react";
import { api } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";

function snoozeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/** "Posponer 15 min" y "Posponer 1 h": vuelve a avisar pasado ese tiempo. */
export function SnoozeButtons({ path }: { path: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function snooze(minutes: 15 | 60) {
    setBusy(true);
    try {
      const res = await api<{ remindAt: string }>(path, { body: { minutes } });
      toast.show({ message: `Te lo recordaré a las ${snoozeLabel(res.remindAt)}` });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-secondary gap-1.5 whitespace-nowrap px-2 text-[15px]" disabled={busy} onClick={() => snooze(15)}>
        <AlarmClock size={18} className="shrink-0" /> Posponer 15 min
      </button>
      <button type="button" className="btn btn-secondary gap-1.5 whitespace-nowrap px-2 text-[15px]" disabled={busy} onClick={() => snooze(60)}>
        <AlarmClock size={18} className="shrink-0" /> Posponer 1 h
      </button>
    </>
  );
}
