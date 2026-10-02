"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Info } from "lucide-react";
import { api } from "@/lib/client/api";
import type { FoodNudges as Nudges } from "@/lib/nutrition/weight-service";
import { Antola } from "@/components/antola/antola";
import { useGamification } from "@/components/antola/gamification-provider";
import { useToast } from "@/components/ui/toast";

const SLOW_KEY = "antola:ir-despacio-visto";
const SLOW_SNOOZE_MS = 7 * 86_400_000;
const recalcKey = (kg: number) => `antola:recalcular-descartado:${kg}`;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // sin almacenamiento: se volverá a mostrar
  }
}

/** Propuestas de Antola: recalcular (±2 kg) e ir más despacio. Se pueden descartar. */
export function FoodNudges({ nudges, className = "" }: { nudges: Nudges; className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { enabled, look } = useGamification();
  const [hidden, setHidden] = useState({ recalc: true, slow: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const slowSeen = Number(read(SLOW_KEY) ?? 0);
    setHidden({
      recalc: !nudges.recalc || read(recalcKey(nudges.recalc.weightAtCalc)) === "1",
      slow: !nudges.slowDown || Date.now() - slowSeen < SLOW_SNOOZE_MS,
    });
  }, [nudges]);

  async function recalc() {
    setBusy(true);
    try {
      const res = await api<{ plan: { kcal: number } }>("/api/nutrition/recalculate", { method: "POST" });
      toast.show({ message: `Objetivos recalculados ✨ ${res.plan.kcal} kcal al día` });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const avatar = enabled ? (
    <Antola expression="pensativa" stage={look.stage} accessories={look.accessories} size={56} />
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
      <Info size={20} />
    </span>
  );

  if (hidden.recalc && hidden.slow) return null;
  return (
    <div className={`space-y-3 ${className}`}>
      {!hidden.recalc && nudges.recalc ? (
        <div className="card p-4">
          <div className="flex items-start gap-3">
            {avatar}
            <p className="flex-1 text-[15px]">{nudges.recalc.text}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={() => {
                write(recalcKey(nudges.recalc!.weightAtCalc), "1");
                setHidden((h) => ({ ...h, recalc: true }));
              }}
            >
              Ahora no
            </button>
            <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={recalc}>
              <Calculator size={18} /> Recalcular
            </button>
          </div>
        </div>
      ) : null}
      {!hidden.slow && nudges.slowDown ? (
        <div className="card p-4">
          <div className="flex items-start gap-3">
            {avatar}
            <p className="flex-1 text-[15px]">{nudges.slowDown.text}</p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={() => {
                write(SLOW_KEY, String(Date.now()));
                setHidden((h) => ({ ...h, slow: true }));
              }}
            >
              Entendido
            </button>
            <Link href="/comida/ajustes" className="btn btn-primary flex-1">
              Ajustar ritmo
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
