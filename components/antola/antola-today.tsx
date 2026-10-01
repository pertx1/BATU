"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Flame, Lightbulb, Shield, X } from "lucide-react";
import { api } from "@/lib/client/api";
import { addDays, type DateStr } from "@/lib/dates";
import type { AntolaToday as Data } from "@/lib/data/antola";
import type { Expression } from "@/lib/antola/messages";
import type { Reward } from "@/lib/gamification";
import { playSound } from "@/lib/client/sounds";
import { Antola } from "@/components/antola/antola";
import { useGamification } from "@/components/antola/gamification-provider";
import { useToast } from "@/components/ui/toast";

const TIP_KEY = "antola-tip-dismissed";

/** Antola arriba en "Hoy": bocadillo, siguiente tarea, vencidas y consejo del día. */
export function AntolaToday({ data, overdueIds, today }: { data: Data; overdueIds: string[]; today: DateStr }) {
  const router = useRouter();
  const toast = useToast();
  const { sounds, look } = useGamification();
  const [expression, setExpression] = useState<Expression>(data.say.expression);
  const [text, setText] = useState(data.say.text);
  const [poke, setPoke] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tipHidden, setTipHidden] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Datos nuevos del servidor (tras completar algo) → nuevo bocadillo.
  useEffect(() => {
    setExpression(data.say.expression);
    setText(data.say.text);
  }, [data.say.expression, data.say.text]);

  useEffect(() => {
    try {
      setTipHidden(!data.tip || localStorage.getItem(TIP_KEY) === data.tip.id);
    } catch {
      setTipHidden(!data.tip);
    }
  }, [data.tip]);

  // Reacciona a lo que haces (completar una tarea, un hábito…).
  useEffect(() => {
    const onReward = (e: Event) => {
      const r = (e as CustomEvent<Reward>).detail;
      if (!r?.enabled || r.xp <= 0) return;
      setExpression("celebrando");
      if (r.reaction) setText(r.reaction);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setExpression(data.say.expression), 2600);
    };
    window.addEventListener("antola:reward", onReward);
    return () => window.removeEventListener("antola:reward", onReward);
  }, [data.say.expression]);

  async function tap() {
    setPoke((n) => n + 1);
    if (sounds) playSound("tap");
    try {
      const res = await api<{ text: string }>("/api/antola/message", { body: { situation: "toque" } });
      setText(res.text);
      setExpression("feliz");
    } catch {
      // sin frase nueva, solo la animación
    }
  }

  async function moveOverdue() {
    setBusy(true);
    try {
      await api("/api/tasks/reschedule", { body: { ids: overdueIds, dueDate: addDays(today, 1) } });
      toast.show({ message: overdueIds.length > 1 ? `${overdueIds.length} tareas pasadas a mañana` : "Pasada a mañana" });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const s = data.stats;
  return (
    <section className="card mb-3 overflow-hidden" aria-label="Antola">
      <div className="flex items-start gap-2 p-3 pb-2">
        <button
          type="button"
          onClick={tap}
          className="-mb-1 -ml-1 shrink-0 rounded-2xl active:scale-95"
          aria-label="Tocar a Antola"
        >
          <span key={poke} className={poke ? "antola-poke inline-block" : "inline-block"}>
            <Antola expression={expression} stage={look.stage} accessories={look.accessories} size={84} />
          </span>
        </button>
        <div className="antola-bubble mt-2 min-w-0 flex-1 rounded-2xl bg-bg px-3.5 py-2.5" aria-live="polite">
          <p className="text-[16px] leading-snug">{text}</p>
        </div>
      </div>

      {data.suggestion ? (
        <div className="mx-3 mb-2 flex items-center gap-3 rounded-2xl bg-accent-soft px-3.5 py-2.5">
          <p className="min-w-0 flex-1 text-[15px] leading-snug">{data.suggestion.text}</p>
          <Link href={`/tareas/${data.suggestion.id}`} className="btn btn-primary min-h-9 shrink-0 px-4 text-[15px]">
            Vamos
          </Link>
        </div>
      ) : null}

      {data.overdue ? (
        <div className="mx-3 mb-2 flex items-center gap-3 rounded-2xl bg-danger-soft px-3.5 py-2.5">
          <p className="min-w-0 flex-1 text-[15px] leading-snug">
            {data.overdue.count === 1 ? "Tienes 1 tarea vencida." : `Tienes ${data.overdue.count} tareas vencidas.`} {data.overdue.text}
          </p>
          <button type="button" disabled={busy} onClick={moveOverdue} className="btn min-h-9 shrink-0 bg-danger px-4 text-[15px] text-white">
            A mañana
          </button>
        </div>
      ) : null}

      {data.tip && !tipHidden ? (
        <div className="mx-3 mb-2 flex items-start gap-2.5 rounded-2xl bg-bg px-3.5 py-2.5 text-[14px] text-muted">
          <Lightbulb size={17} className="mt-0.5 shrink-0 text-warning" />
          <p className="flex-1 leading-snug">{data.tip.text}</p>
          <button
            type="button"
            aria-label="Cerrar consejo"
            className="-m-1 p-1"
            onClick={() => {
              setTipHidden(true);
              try {
                localStorage.setItem(TIP_KEY, data.tip!.id);
              } catch {
                // sin almacenamiento
              }
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      <Link href="/antola" className="flex items-center gap-3 border-t border-line px-4 py-2.5 active:bg-surface-2" aria-label="Ver la pantalla de Antola">
        <span className="text-[13px] font-semibold">
          Nv {s.level} · <span className="text-muted">{s.title}</span>
        </span>
        <span className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(s.ratio * 100)}%` }} />
        </span>
        <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-warning" title="Racha">
          <Flame size={14} /> {s.streak}
        </span>
        {s.shields ? (
          <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-accent" title="Protectores">
            <Shield size={13} /> {s.shields}
          </span>
        ) : null}
        <span className="text-[13px] font-semibold" title="Migas">
          🍞 {s.crumbs}
        </span>
        <ChevronRight size={16} className="text-muted" />
      </Link>
    </section>
  );
}
