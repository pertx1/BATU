"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronRight, Info, Plus, Scale, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { formatDateStr } from "@/lib/dates";
import { formatKg } from "@/lib/nutrition/calc";
import { formatChange, type TrendPoint, type WeightMilestone } from "@/lib/nutrition/weight";
import { Ring } from "@/components/nutrition/ring";
import { WeightChart } from "@/components/nutrition/weight-chart";
import { SectionTitle } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { WheelPicker } from "@/components/ui/wheel-picker";

export type WeightPageData = {
  today: string;
  logs: { id: string; day: string; kg: number }[];
  series: TrendPoint[];
  current: number | null;
  change7: number | null;
  change30: number | null;
  goal: {
    id: string;
    start: number;
    target: number;
    progress: number;
    achieved: boolean;
    eta: string | null;
    milestones: WeightMilestone[];
  } | null;
  bmi: number | null;
  reminder: string | null;
};

const KILOS = Array.from({ length: 221 }, (_, i) => i + 30);
const DECIMALS = Array.from({ length: 10 }, (_, i) => i);

export function WeightView({ data }: { data: WeightPageData }) {
  const [editing, setEditing] = useState<{ id: string | null; day: string; kg: number } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const history = [...data.logs].reverse();
  const last = data.logs.at(-1) ?? null;
  const open = () => setEditing({ id: null, day: data.today, kg: last?.kg ?? data.current ?? 70 });
  const g = data.goal;

  return (
    <div className="space-y-3 pt-3">
      {/* Peso actual según la tendencia */}
      <div className="card p-5">
        {data.current != null ? (
          <>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Tu peso (tendencia)</p>
            <p className="mt-1 text-[52px] font-bold leading-none tracking-tight tabular-nums">
              {formatKg(data.current)}
              <span className="ml-1 text-[22px] font-semibold text-muted">kg</span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-bg px-3 py-2">
                <p className="text-[12px] text-muted">Última semana</p>
                <p className="font-semibold tabular-nums">{formatChange(data.change7)}</p>
              </div>
              <div className="rounded-2xl bg-bg px-3 py-2">
                <p className="text-[12px] text-muted">Último mes</p>
                <p className="font-semibold tabular-nums">{formatChange(data.change30)}</p>
              </div>
            </div>
            {last ? (
              <p className="mt-3 text-[13px] text-muted">
                Último pesaje: {formatKg(last.kg)} kg · {last.day === data.today ? "hoy" : formatDateStr(last.day, "d 'de' MMMM")}
              </p>
            ) : null}
          </>
        ) : (
          <div className="py-4 text-center">
            <Scale size={30} className="mx-auto text-muted" />
            <p className="mt-2 font-semibold">Aún no hay pesajes</p>
            <p className="text-[15px] text-muted">Apunta tu peso y aquí verás la tendencia.</p>
          </div>
        )}
        <button type="button" className="btn btn-primary mt-4 w-full" onClick={open}>
          <Plus size={20} /> Registrar peso
        </button>
      </div>

      {/* Objetivo */}
      {g ? (
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <Ring value={g.progress} size={96} stroke={10} color="var(--success)" icon={g.achieved ? <Check size={20} strokeWidth={3} /> : <Scale size={18} />} label={`${Math.round(g.progress * 100)} % del camino`} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Objetivo</p>
              {g.achieved ? (
                <p className="text-[20px] font-bold">¡Objetivo conseguido! 🎉</p>
              ) : data.current != null ? (
                <p className="text-[20px] font-bold tabular-nums">
                  {formatKg(Math.abs(g.target - data.current))} kg {g.target < g.start ? "por perder" : "por ganar"}
                </p>
              ) : null}
              <p className="mt-1 text-[14px] text-muted tabular-nums">
                {formatKg(g.start)} → <b className="text-fg">{data.current != null ? formatKg(data.current) : "—"}</b> → {formatKg(g.target)} kg
              </p>
              {g.eta && !g.achieved ? <p className="mt-1 text-[14px] text-muted">A este ritmo, hacia el {formatDateStr(g.eta, "d 'de' MMMM")}</p> : null}
            </div>
          </div>
          {g.milestones.length ? (
            <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
              {g.milestones.map((m) => (
                <span
                  key={m.id}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold tabular-nums ${
                    m.reached ? "bg-success-soft text-success" : "bg-surface-2 text-muted"
                  }`}
                >
                  {m.reached ? <Check size={14} strokeWidth={3} /> : null}
                  {m.label} · {formatKg(m.kg)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Gráfico */}
      {data.series.length ? (
        <div className="card p-4">
          <WeightChart series={data.series} target={g?.target ?? null} today={data.today} eta={g?.achieved ? null : (g?.eta ?? null)} />
          <p className="mt-3 flex gap-2 text-[13px] text-muted">
            <Info size={15} className="mt-0.5 shrink-0" />
            Es normal que el peso suba o baje de un día a otro por el agua, la sal o la digestión. Lo que cuenta es la tendencia (la línea).
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[13px] text-muted">
        {data.bmi != null ? <span>IMC {formatKg(Math.round(data.bmi * 10) / 10)} · dato orientativo</span> : null}
        <Link href="/comida/ajustes" className="flex items-center gap-1">
          <Bell size={13} /> {data.reminder ?? "Sin recordatorio de pesaje"}
        </Link>
      </div>

      {/* Historial */}
      {data.logs.length ? (
        <>
          <SectionTitle>Pesajes</SectionTitle>
          <ul className="card divide-y divide-line overflow-hidden">
            {(showAll ? history : history.slice(0, 10)).map((l, i) => {
              const prev = history[i + 1];
              return (
                <li key={l.id}>
                  <button type="button" className="flex min-h-14 w-full items-center gap-3 px-4 text-left active:bg-surface-2" onClick={() => setEditing({ id: l.id, day: l.day, kg: l.kg })}>
                    <span className="flex-1">{l.day === data.today ? "Hoy" : formatDateStr(l.day, "EEE d 'de' MMM")}</span>
                    {prev ? <span className="text-[13px] text-muted tabular-nums">{formatChange(Math.round((l.kg - prev.kg) * 10) / 10)}</span> : null}
                    <span className="w-20 text-right font-semibold tabular-nums">{formatKg(l.kg)} kg</span>
                    <ChevronRight size={18} className="text-muted" />
                  </button>
                </li>
              );
            })}
          </ul>
          {history.length > 10 && !showAll ? (
            <button type="button" className="btn btn-ghost w-full" onClick={() => setShowAll(true)}>
              Ver los {history.length} pesajes
            </button>
          ) : null}
        </>
      ) : null}

      <WeighInSheet value={editing} today={data.today} onClose={() => setEditing(null)} />
    </div>
  );
}

/** Hoja para registrar o corregir un pesaje (ruedas de kilos y decimales). */
function WeighInSheet({ value, today, onClose }: { value: { id: string | null; day: string; kg: number } | null; today: string; onClose: () => void }) {
  return (
    <Sheet open={!!value} onClose={onClose} title={value?.id ? "Corregir pesaje" : "Registrar peso"}>
      {value ? <WeighInForm key={`${value.id}-${value.day}`} value={value} today={today} onClose={onClose} /> : null}
    </Sheet>
  );
}

function WeighInForm({ value, today, onClose }: { value: { id: string | null; day: string; kg: number }; today: string; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [kgInt, setKgInt] = useState(Math.min(250, Math.max(30, Math.floor(value.kg))));
  const [kgDec, setKgDec] = useState(Math.round((value.kg - Math.floor(value.kg)) * 10) % 10);
  const [day, setDay] = useState(value.day);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const kg = kgInt + kgDec / 10;

  async function save() {
    setBusy(true);
    try {
      if (value.id) await api(`/api/nutrition/weights/${value.id}`, { method: "PATCH", body: { kg, ...(day !== value.day ? { day } : {}) } });
      else await api("/api/nutrition/weights", { body: { kg, day } });
      toast.show({ message: value.id ? "Pesaje corregido" : `${formatKg(kg)} kg apuntados ⚖️` });
      onClose();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 4000);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/nutrition/weights/${value.id}`, { method: "DELETE" });
      toast.show({ message: "Pesaje borrado" });
      onClose();
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-1">
        <WheelPicker values={KILOS} value={kgInt} onChange={setKgInt} label="Kilos" width={110} />
        <span className="text-2xl font-bold">,</span>
        <WheelPicker values={DECIMALS} value={kgDec} onChange={setKgDec} label="Decimales" width={70} />
        <span className="ml-1 text-xl font-semibold text-muted">kg</span>
      </div>
      <label className="flex items-center gap-3">
        <span className="flex-1 font-medium">Día</span>
        <input type="date" className="input w-44 text-center" max={today} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
      </label>
      <p className="text-[13px] text-muted">Mejor por la mañana, después de ir al baño y antes de desayunar. Si ya había un pesaje ese día, se sustituye.</p>
      <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={save}>
        Guardar
      </button>
      {value.id ? (
        <button type="button" className="btn btn-secondary w-full text-muted" disabled={busy} onClick={remove}>
          <Trash2 size={18} /> {confirm ? "Toca otra vez para borrarlo" : "Borrar pesaje"}
        </button>
      ) : null}
    </div>
  );
}
