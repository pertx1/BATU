"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Flame, Lock, Shield } from "lucide-react";
import { api } from "@/lib/client/api";
import type { AntolaProfile } from "@/lib/data/antola";
import { playSound } from "@/lib/client/sounds";
import { Antola } from "@/components/antola/antola";
import { useGamification } from "@/components/antola/gamification-provider";
import { BarChart, type BarDatum } from "@/components/charts/bar-chart";
import { useToast } from "@/components/ui/toast";

const TABS = [
  { id: "logros", label: "Logros" },
  { id: "retos", label: "Retos" },
  { id: "tienda", label: "Tienda" },
  { id: "armario", label: "Armario" },
] as const;
type Tab = (typeof TABS)[number]["id"];

/** Pantalla de Antola: fase, nivel, racha, migas, pestañas e historial de XP. */
export function AntolaScreen({ profile, history, initialTab }: { profile: AntolaProfile; history: BarDatum[]; initialTab: string }) {
  const router = useRouter();
  const toast = useToast();
  const { sounds } = useGamification();
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === initialTab) ? (initialTab as Tab) : "logros");
  const [busy, setBusy] = useState<string | null>(null);
  const [text, setText] = useState(profile.greeting);
  const [poke, setPoke] = useState(0);
  useEffect(() => setText(profile.greeting), [profile.greeting]);

  const s = profile.stats;
  const unlocked = profile.achievements.filter((a) => a.unlocked).length;

  async function tap() {
    setPoke((n) => n + 1);
    if (sounds) playSound("tap");
    try {
      setText((await api<{ text: string }>("/api/antola/message", { body: { situation: "toque" } })).text);
    } catch {
      // solo la animación
    }
  }

  async function buy(id: string, name: string) {
    setBusy(id);
    try {
      await api("/api/antola/shop", { body: { itemId: id } });
      toast.show({ message: `${name}: ¡comprado! 🛍️` });
      if (sounds) playSound("chime");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function wear(id: string, equipped: boolean) {
    setBusy(id);
    try {
      await api("/api/antola/wardrobe", { body: { itemId: id, equipped } });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const accessories = profile.shop.filter((i) => i.kind === "accessory");
  const owned = profile.shop.filter((i) => i.owned && i.kind !== "shield");

  return (
    <>
      <section className="card relative overflow-hidden px-4 pb-4 pt-3 text-center">
        <p className="mx-auto mb-1 max-w-xs rounded-2xl bg-bg px-3.5 py-2 text-[15px] leading-snug" aria-live="polite">
          {text}
        </p>
        <button type="button" onClick={tap} aria-label="Tocar a Antola" className="mx-auto block active:scale-95">
          <span key={poke} className={poke ? "antola-poke inline-block" : "inline-block"}>
            <Antola expression="feliz" stage={profile.look.stage} accessories={profile.look.accessories} size={168} />
          </span>
        </button>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">Antola {profile.stageLabel.toLowerCase()}</p>
        <h2 className="mt-0.5 text-2xl font-bold">
          Nivel {s.level} · {s.title}
        </h2>
        <div className="mx-auto mt-3 max-w-xs">
          <div
            className="h-3 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={s.span}
            aria-valuenow={s.into}
            aria-label="XP hasta el siguiente nivel"
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${Math.round(s.ratio * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-[13px] text-muted">
            {s.xp} XP · faltan {s.needed} para el nivel {s.level + 1}
          </p>
        </div>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <Stat label="Racha" value={<span className="inline-flex items-center gap-0.5 text-warning"><Flame size={18} />{s.streak}</span>} />
        <Stat label="Mejor" value={String(s.bestStreak)} />
        <Stat label="Protectores" value={<span className="inline-flex items-center gap-0.5 text-accent"><Shield size={16} />{s.shields}/{s.maxShields}</span>} />
        <Stat label="Migas" value={`🍞 ${s.crumbs}`} />
      </div>

      <div className="mt-5 flex rounded-full bg-surface-2 p-1" role="tablist" aria-label="Secciones">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-10 flex-1 rounded-full text-[14px] font-semibold transition ${tab === t.id ? "bg-segment text-fg shadow-[0_3px_8px_rgb(0_0_0/0.12)]" : "text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3" role="tabpanel">
        {tab === "logros" ? (
          <>
            <p className="mb-2 px-1 text-[13px] text-muted">
              {unlocked} de {profile.achievements.length} conseguidos
            </p>
            <ul className="grid grid-cols-2 gap-2">
              {profile.achievements.map((a) => (
                <li key={a.id} className={`card p-3 ${a.unlocked ? "" : "opacity-55 grayscale"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden>
                      {a.icon}
                    </span>
                    {a.unlocked ? <Check size={16} className="ml-auto text-success" aria-label="Conseguido" /> : <Lock size={14} className="ml-auto text-muted" aria-label="Sin conseguir" />}
                  </div>
                  <p className="mt-1.5 text-[15px] font-semibold leading-tight">{a.name}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted">{a.description}</p>
                  <p className="mt-1 text-[12px] font-semibold text-accent">
                    +{a.crumbs} migas{a.shields ? ` · +${a.shields} 🛡️` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {tab === "retos" ? (
          <>
            <p className="mb-2 px-1 text-[13px] text-muted">Se renuevan cada lunes, adaptados a lo que sueles hacer.</p>
            <ul className="space-y-2">
              {profile.challenges.map((c) => (
                <li key={c.id} className="card p-4">
                  <div className="flex items-start gap-2">
                    <p className={`flex-1 font-semibold ${c.done ? "text-success" : ""}`}>{c.label}</p>
                    {c.done ? <Check size={20} className="text-success" aria-label="Completado" /> : null}
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={c.target} aria-valuenow={c.progress} aria-label={c.label}>
                    <div className={`h-full rounded-full ${c.done ? "bg-success" : "bg-accent"}`} style={{ width: `${Math.round((c.progress / c.target) * 100)}%` }} />
                  </div>
                  <p className="mt-1.5 flex justify-between text-[13px] text-muted">
                    <span>
                      {c.progress} / {c.target}
                    </span>
                    <span className="font-semibold text-accent">
                      +{c.rewardXp} XP · +{c.rewardCrumbs} migas
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {tab === "tienda" ? (
          <>
            <p className="mb-2 px-1 text-[13px] text-muted">Tienes 🍞 {s.crumbs} migas. Ganas 1 por cada 10 XP, y más con logros y retos.</p>
            <ul className="grid grid-cols-2 gap-2">
              {profile.shop.map((i) => {
                const locked = s.level < i.minLevel;
                const full = i.kind === "shield" && s.shields >= s.maxShields;
                return (
                  <li key={i.id} className="card flex flex-col p-3">
                    <div className="flex h-24 items-center justify-center rounded-xl bg-bg">
                      {i.kind === "accessory" ? (
                        <Antola stage="pequena" accessories={[i.id]} size={78} animated={false} />
                      ) : i.kind === "theme" && i.colors ? (
                        <span className="flex gap-1.5">
                          <span className="size-10 rounded-full" style={{ background: i.colors.light.accent }} />
                          <span className="size-10 rounded-full" style={{ background: i.colors.dark.accent }} />
                        </span>
                      ) : (
                        <Shield size={40} className="text-accent" />
                      )}
                    </div>
                    <p className="mt-2 text-[15px] font-semibold leading-tight">{i.name}</p>
                    <p className="mt-0.5 flex-1 text-[13px] leading-snug text-muted">{i.description}</p>
                    {i.owned && i.kind !== "shield" ? (
                      <p className="mt-2 text-center text-[14px] font-semibold text-success">Lo tienes</p>
                    ) : (
                      <button
                        type="button"
                        disabled={busy === i.id || locked || full || s.crumbs < i.price}
                        onClick={() => buy(i.id, i.name)}
                        className="btn btn-secondary mt-2 min-h-10 w-full px-3 text-[14px]"
                      >
                        {locked ? `Nivel ${i.minLevel}` : full ? "Máximo" : `🍞 ${i.price}`}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        {tab === "armario" ? (
          owned.length ? (
            <>
              <p className="mb-2 px-1 text-[13px] text-muted">
                Toca para ponérselo o quitárselo. {accessories.filter((a) => a.owned).length} de {accessories.length} accesorios.
              </p>
              <ul className="grid grid-cols-3 gap-2">
                {owned.map((i) => (
                  <li key={i.id}>
                    <button
                      type="button"
                      disabled={busy === i.id}
                      onClick={() => wear(i.id, !i.equipped)}
                      aria-pressed={i.equipped}
                      className={`card flex w-full flex-col items-center p-2 ${i.equipped ? "ring-2 ring-accent" : ""}`}
                    >
                      {i.kind === "accessory" ? (
                        <Antola stage="pequena" accessories={[i.id]} size={64} animated={false} />
                      ) : i.colors ? (
                        <span className="flex h-[74px] items-center gap-1">
                          <span className="size-8 rounded-full" style={{ background: i.colors.light.accent }} />
                          <span className="size-8 rounded-full" style={{ background: i.colors.dark.accent }} />
                        </span>
                      ) : null}
                      <span className="mt-1 text-[13px] font-semibold leading-tight">{i.name}</span>
                      <span className={`text-[12px] ${i.equipped ? "text-accent" : "text-muted"}`}>{i.equipped ? "Puesto" : "Quitado"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="card p-5 text-center text-muted">
              Aún no tienes accesorios. Mira la{" "}
              <button type="button" className="font-semibold text-accent" onClick={() => setTab("tienda")}>
                tienda
              </button>
              .
            </div>
          )
        ) : null}
      </div>

      <section className="card mt-5 p-4">
        <h2 className="font-semibold">XP de los últimos 30 días</h2>
        <p className="mb-3 text-sm text-muted">{history.reduce((n, d) => n + d.value, 0)} XP en total</p>
        <BarChart data={history} caption="XP ganados por día, últimos 30 días" unitOne="XP" unitMany="XP" tickEvery={7} />
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card px-1 py-2.5">
      <p className="text-[17px] font-bold tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
