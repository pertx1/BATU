"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/client/api";
import { HEALTHY_HABITS } from "@/lib/habits";
import { SectionTitle } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";

/** Hábitos sanos predefinidos: un toque y quedan activados (todos los días, sin aviso). */
export function HealthyHabits({ existing }: { existing: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const have = new Set(existing.map((n) => n.trim().toLowerCase()));
  const options = HEALTHY_HABITS.filter((h) => !have.has(h.name.toLowerCase()));
  if (!options.length) return null;

  async function activate(h: (typeof HEALTHY_HABITS)[number]) {
    setBusy(h.name);
    try {
      await api("/api/habits", { body: { name: h.name, emoji: h.emoji, color: null, daysOfWeek: [], reminderTime: null } });
      toast.show({ message: `«${h.name}» activado ${h.emoji}` });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <SectionTitle>Hábitos sanos</SectionTitle>
      <ul className="card divide-y divide-line overflow-hidden">
        {options.map((h) => (
          <li key={h.name} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <span className="text-2xl" aria-hidden>
              {h.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{h.name}</span>
              <span className="block text-[13px] text-muted">{h.hint}</span>
            </span>
            <button
              type="button"
              className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-accent-soft px-3 text-[14px] font-semibold text-accent"
              disabled={!!busy}
              onClick={() => activate(h)}
              aria-label={`Activar «${h.name}»`}
            >
              <Plus size={16} /> {busy === h.name ? "…" : "Activar"}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
