"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Reward } from "@/lib/gamification";
import type { AntolaLook } from "@/lib/gamification";
import { STAGE_LABEL } from "@/lib/antola/levels";
import { playSound } from "@/lib/client/sounds";
import { Antola } from "@/components/antola/antola";

type Ctx = { enabled: boolean; sounds: boolean; look: AntolaLook };

const GamificationContext = createContext<Ctx>({ enabled: false, sounds: false, look: { stage: "pequena", accessories: [] } });

export function useGamification() {
  return useContext(GamificationContext);
}

type Floating = { id: number; x: number; y: number; text: string; negative: boolean };

type Celebration =
  | { kind: "level"; reward: Reward }
  | { kind: "achievement"; achievement: Reward["achievements"][number] }
  | { kind: "challenge"; challenge: Reward["challenges"][number] }
  | { kind: "day"; streak: number };

async function confetti(big = false) {
  try {
    const { default: fire } = await import("canvas-confetti");
    const opts = { disableForReducedMotion: true, zIndex: 100, colors: ["#F2894E", "#7D7AFF", "#FFD23F", "#34C759", "#FF6B8B"] };
    fire({ ...opts, particleCount: big ? 140 : 80, spread: big ? 100 : 70, origin: { y: 0.6 } });
    if (big) setTimeout(() => fire({ ...opts, particleCount: 80, spread: 120, origin: { y: 0.5 } }), 350);
  } catch {
    // sin confeti, no pasa nada
  }
}

/**
 * Escucha lo que devuelven las acciones (evento «antola:reward», lo lanza
 * lib/client/api.ts) y lo celebra: «+10 XP» flotando donde tocaste, sonido
 * (si está activado), confeti y una ventana con Antola al subir de nivel,
 * conseguir un logro o un reto, o completar el día.
 */
export function GamificationProvider({
  enabled,
  sounds,
  look,
  children,
}: {
  enabled: boolean;
  sounds: boolean;
  look: AntolaLook;
  children: React.ReactNode;
}) {
  const [floating, setFloating] = useState<Floating[]>([]);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const nextId = useRef(0);
  const [currentLook, setLook] = useState(look);
  useEffect(() => setLook(look), [look]);

  const onReward = useCallback(
    (reward: Reward) => {
      if (!reward.enabled) return;
      if (reward.xp !== 0) {
        const p = pointer.current ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const id = nextId.current++;
        setFloating((f) => [...f, { id, x: p.x, y: p.y - 16, text: `${reward.xp > 0 ? "+" : "−"}${Math.abs(reward.xp)} XP`, negative: reward.xp < 0 }]);
        setTimeout(() => setFloating((f) => f.filter((x) => x.id !== id)), 1200);
        if (sounds && reward.xp > 0) playSound("pop");
      }
      const items: Celebration[] = [];
      if (reward.levelUp) {
        items.push({ kind: "level", reward });
        setLook((l) => ({ ...l, stage: reward.levelUp!.stage }));
      }
      for (const a of reward.achievements) items.push({ kind: "achievement", achievement: a });
      for (const c of reward.challenges) items.push({ kind: "challenge", challenge: c });
      if (reward.dayCompleted) items.push({ kind: "day", streak: reward.streak });
      if (items.length) setQueue((q) => [...q, ...items]);
    },
    [sounds],
  );

  useEffect(() => {
    if (!enabled) return;
    const down = (e: PointerEvent) => (pointer.current = { x: e.clientX, y: e.clientY });
    const reward = (e: Event) => onReward((e as CustomEvent<Reward>).detail);
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("antola:reward", reward);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("antola:reward", reward);
    };
  }, [enabled, onReward]);

  const current = queue[0] ?? null;
  useEffect(() => {
    if (!current) return;
    void confetti(current.kind === "level");
    if (sounds) playSound(current.kind === "level" ? "fanfare" : "chime");
  }, [current, sounds]);

  return (
    <GamificationContext.Provider value={{ enabled, sounds, look: currentLook }}>
      {children}
      {enabled
        ? floating.map((f) => (
            <span
              key={f.id}
              aria-hidden
              className={`xp-float pointer-events-none fixed z-[90] rounded-full px-2.5 py-1 text-sm font-bold shadow-lg ${
                f.negative ? "bg-surface-2 text-muted" : "bg-accent text-accent-fg"
              }`}
              style={{ left: f.x, top: f.y }}
            >
              {f.text}
            </span>
          ))
        : null}
      {enabled && current ? (
        <CelebrationModal celebration={current} look={currentLook} onClose={() => setQueue((q) => q.slice(1))} />
      ) : null}
      {/* Para lectores de pantalla */}
      <p className="sr-only" aria-live="polite">
        {current ? describe(current) : ""}
      </p>
    </GamificationContext.Provider>
  );
}

function describe(c: Celebration): string {
  switch (c.kind) {
    case "level":
      return `Has subido al nivel ${c.reward.levelUp!.to}`;
    case "achievement":
      return `Logro conseguido: ${c.achievement.name}`;
    case "challenge":
      return `Reto completado: ${c.challenge.label}`;
    case "day":
      return "Día completado";
  }
}

function CelebrationModal({ celebration: c, look, onClose }: { celebration: Celebration; look: AntolaLook; onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  let title = "";
  let text = "";
  let extra: React.ReactNode = null;
  switch (c.kind) {
    case "level": {
      const l = c.reward.levelUp!;
      title = "¡Subes de nivel!";
      text = c.reward.levelUpText ?? `Nivel ${l.to}. Ahora eres ${l.title}.`;
      extra = (
        <ul className="mt-3 space-y-1 text-[15px]">
          {l.unlocked.length ? (
            l.unlocked.map((u) => <li key={u}>🔓 {u}</li>)
          ) : (
            <li className="text-muted">
              {l.title} · Antola {STAGE_LABEL[l.stage].toLowerCase()}
            </li>
          )}
        </ul>
      );
      break;
    }
    case "achievement":
      title = `${c.achievement.icon} ${c.achievement.name}`;
      text = c.achievement.description;
      extra = (
        <p className="mt-3 text-[15px] font-semibold text-accent">
          +{c.achievement.crumbs} migas{c.achievement.shields ? ` · +${c.achievement.shields} protector${c.achievement.shields > 1 ? "es" : ""}` : ""}
        </p>
      );
      break;
    case "challenge":
      title = "¡Reto completado!";
      text = c.challenge.label;
      extra = (
        <p className="mt-3 text-[15px] font-semibold text-accent">
          +{c.challenge.xp} XP · +{c.challenge.crumbs} migas
        </p>
      );
      break;
    case "day":
      title = "¡Día completado!";
      text = c.streak > 1 ? `Todo hecho. Llevas ${c.streak} días de racha. 🔥` : "Todo lo de hoy, hecho. +25 XP de bonus.";
      break;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 px-6 animate-fade-up" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="card w-full max-w-sm p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="-mt-16 flex justify-center">
          <Antola expression={c.kind === "achievement" ? "orgullosa" : "celebrando"} stage={look.stage} accessories={look.accessories} size={130} />
        </div>
        <h2 className="mt-2 text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-muted">{text}</p>
        {extra}
        <div className="mt-5 flex gap-2">
          {c.kind !== "day" ? (
            <Link href="/antola" onClick={onClose} className="btn btn-secondary flex-1">
              Ver
            </Link>
          ) : null}
          <button ref={ref} type="button" className="btn btn-primary flex-1" onClick={onClose}>
            ¡Genial!
          </button>
        </div>
      </div>
    </div>
  );
}
