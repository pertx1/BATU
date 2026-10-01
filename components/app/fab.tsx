"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Inbox, Lightbulb, Plus, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/client/api";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";

/** Botón "+" flotante: apunta algo en 2 segundos. Sin fecha ni proyecto → Bandeja. */
export function Fab() {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // En formularios de creación el "+" sobra.
  if (pathname.endsWith("/nueva") || pathname.endsWith("/nuevo")) return null;

  async function save(e: React.FormEvent | null, as: "task" | "idea" = "task") {
    e?.preventDefault();
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    try {
      if (as === "idea") await api("/api/ideas", { body: { text: t } });
      else await api("/api/tasks", { body: { title: t } });
      navigator.vibrate?.(10);
      toast.show({ message: as === "idea" ? "Guardada en Ideas 💡" : "Guardado en la Bandeja 📥" });
      setTitle("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Captura rápida"
        className="fixed right-5 z-40 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[0_8px_24px_rgb(0_0_0/0.18)] transition active:scale-90"
        style={{ bottom: "calc(max(env(safe-area-inset-bottom), 12px) + 62px + 14px)" }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <input
            className="input text-lg"
            placeholder="¿Qué tienes en mente?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            maxLength={300}
            enterKeyHint="done"
            aria-label="Nueva tarea"
          />
          <div className="flex gap-2">
            <Link
              href={`/tareas/nueva?title=${encodeURIComponent(title)}&back=${encodeURIComponent(pathname)}`}
              onClick={() => setOpen(false)}
              className="btn btn-secondary"
              aria-label="Más opciones"
            >
              <SlidersHorizontal size={20} />
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving || !title.trim()}
              onClick={() => save(null, "idea")}
              aria-label="Guardar como idea"
            >
              <Lightbulb size={20} />
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving || !title.trim()}>
              <Inbox size={20} /> {saving ? "Guardando…" : "A la Bandeja"}
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
