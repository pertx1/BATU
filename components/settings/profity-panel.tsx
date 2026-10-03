"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, RefreshCw } from "lucide-react";
import { api } from "@/lib/client/api";
import { formatTz } from "@/lib/dates";
import { useToast } from "@/components/ui/toast";

type Sync = { creadas: number; actualizadas: number; completadas: number; faltan: number };

export type ProfityState = { connected: boolean; syncedAt: string | null; error: string | null; timezone: string };

function syncMessage(s: Sync) {
  if (!s.faltan && !s.completadas) return "Todo en orden: no hay nada que pedir 👌";
  const parts = [
    s.creadas ? `${s.creadas} ${s.creadas === 1 ? "tarea nueva" : "tareas nuevas"}` : null,
    s.completadas ? `${s.completadas} ${s.completadas === 1 ? "completada sola" : "completadas solas"}` : null,
  ].filter(Boolean);
  return parts.length ? `Sincronizado: ${parts.join(", ")}` : `Sincronizado: ${s.faltan} ${s.faltan === 1 ? "artículo" : "artículos"} por pedir`;
}

/**
 * Conexión con Profity: cada usuario pega la clave que genera en Profity
 * (Ajustes → Conectar con Antola). La clave nunca vuelve al navegador.
 */
export function ProfityPanel({ state }: { state: ProfityState }) {
  const router = useRouter();
  const toast = useToast();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const connect = () =>
    run(async () => {
      const res = await api<{ sync: Sync }>("/api/integraciones/profity", { method: "PUT", body: { token } });
      setToken("");
      toast.show({ message: `Profity conectado ✅ ${syncMessage(res.sync)}`, duration: 5000 });
    });
  const sync = () =>
    run(async () => {
      const res = await api<{ sync: Sync }>("/api/integraciones/profity/sincronizar", { method: "POST" });
      toast.show({ message: syncMessage(res.sync) });
    });
  const disconnect = () => {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 4000);
      return;
    }
    void run(async () => {
      await api("/api/integraciones/profity", { method: "DELETE" });
      toast.show({ message: "Profity desconectado. Las tareas que ya había se quedan." });
    });
  };

  if (!state.connected) {
    return (
      <div className="card space-y-3 p-4">
        <p className="text-[15px]">
          Cada artículo que tengas que pedir en Profity (stock a 0 o menos) te aparecerá aquí como una tarea para hoy, con aviso en el móvil.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-[14px] text-muted">
          <li>En Profity, ve a Ajustes → Conectar con Antola y pulsa «Generar clave para Antola».</li>
          <li>Copia la clave y pégala aquí.</li>
        </ol>
        <input
          className="input font-mono text-[14px]"
          placeholder="pf_…"
          value={token}
          onChange={(e) => setToken(e.target.value.trim())}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Clave de Profity"
        />
        <button type="button" className="btn btn-primary w-full" disabled={busy || token.length < 20} onClick={connect}>
          <Link2 size={18} /> {busy ? "Conectando…" : "Conectar con Profity"}
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <p className="text-[15px] font-semibold">✅ Conectado con Profity</p>
      <p className="text-[14px] text-muted">
        Cada hora se revisa tu stock y se crea una tarea por artículo que haya que pedir. Si la tachas y sigue a 0, no se repite; cuando
        vuelve a haber stock, se completa sola.
      </p>
      {state.error ? (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-[14px]">⚠️ {state.error}</p>
      ) : state.syncedAt ? (
        <p className="text-[13px] text-muted">Última revisión: {formatTz(new Date(state.syncedAt), state.timezone, "d MMM, HH:mm")}</p>
      ) : null}
      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary flex-1" disabled={busy} onClick={disconnect}>
          {confirm ? "Toca otra vez" : "Desconectar"}
        </button>
        <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={sync}>
          <RefreshCw size={18} /> Revisar
        </button>
      </div>
    </div>
  );
}
