"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Lightbulb, Pin, PinOff, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { EmptyState, SectionTitle } from "@/components/ui/controls";
import { MicButton } from "@/components/ui/mic-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";

export type IdeaItem = { id: string; text: string; pinned: boolean; when: string };

export function IdeasBoard({ initial }: { initial: IdeaItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [ideas, setIdeas] = useState(initial);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<IdeaItem | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  // Cuando llegan datos nuevos del servidor (p. ej. una idea guardada desde el
  // botón «+»), se usan en lugar de la copia local.
  useEffect(() => setIdeas(initial), [initial]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ideas.filter((i) => i.text.toLowerCase().includes(q)) : ideas;
  }, [ideas, query]);
  const pinned = filtered.filter((i) => i.pinned);
  const rest = filtered.filter((i) => !i.pinned);

  async function add(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    try {
      const { id } = await api<{ id: string }>("/api/ideas", { body: { text } });
      setIdeas((list) => [{ id, text, pinned: false, when: "Hoy" }, ...list]);
      setDraft("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const card = (idea: IdeaItem) => (
    <li key={idea.id}>
      <button
        type="button"
        onClick={() => setOpen(idea)}
        className="card block w-full p-4 text-left transition active:scale-[0.99] active:opacity-80"
      >
        <p className="line-clamp-6 whitespace-pre-line break-words">{idea.text}</p>
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
          {idea.pinned ? <Pin size={13} className="text-accent" fill="currentColor" aria-label="Fijada" /> : null}
          {idea.when}
        </p>
      </button>
    </li>
  );

  return (
    <>
      <form onSubmit={add} className="card p-3">
        <textarea
          ref={draftRef}
          className="input min-h-[88px] resize-none"
          placeholder="Apunta o dicta una idea…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          maxLength={5000}
          aria-label="Nueva idea"
        />
        <div className="mt-2 flex justify-end gap-2">
          <MicButton value={draft} onChange={setDraft} field={draftRef} className="min-h-11" />
          <button type="submit" className="btn btn-primary min-h-11 px-5" disabled={saving || !draft.trim()}>
            <Lightbulb size={19} /> {saving ? "Guardando…" : "Guardar idea"}
          </button>
        </div>
      </form>

      {ideas.length > 5 ? (
        <div className="relative mt-4">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className="input rounded-full pl-10"
            placeholder="Buscar en tus ideas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar ideas"
          />
        </div>
      ) : null}

      {ideas.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Lightbulb size={26} />}
            title="Apunta tus ideas"
            text="Lo que se te ocurra, en un segundo. Cuando una cuaje, conviértela en tarea."
          />
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-center text-muted">Ninguna idea contiene «{query.trim()}».</p>
      ) : (
        <>
          {pinned.length ? (
            <>
              <SectionTitle>Fijadas</SectionTitle>
              <ul className="space-y-2.5">{pinned.map(card)}</ul>
            </>
          ) : null}
          {rest.length ? (
            <>
              <SectionTitle>{pinned.length ? "Otras ideas" : `${rest.length} ${rest.length === 1 ? "idea" : "ideas"}`}</SectionTitle>
              <ul className="space-y-2.5">{rest.map(card)}</ul>
            </>
          ) : null}
        </>
      )}

      <Sheet open={open !== null} onClose={() => setOpen(null)} title="Idea">
        {open ? (
          <IdeaEditor
            key={open.id}
            idea={open}
            onChange={(next) => {
              setIdeas((list) => (next ? list.map((i) => (i.id === next.id ? next : i)) : list.filter((i) => i.id !== open.id)));
              setOpen(next && next.text === open.text && next.pinned !== open.pinned ? next : null);
            }}
          />
        ) : null}
      </Sheet>
    </>
  );
}

/** Editar, fijar, convertir en tarea o eliminar. `onChange(null)` = la idea ya no está. */
function IdeaEditor({ idea, onChange }: { idea: IdeaItem; onChange: (next: IdeaItem | null) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState(idea.text);
  const [busy, setBusy] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const changed = text.trim() !== idea.text && text.trim().length > 0;

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

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          ref={textRef}
          className="input min-h-36 resize-y pb-16"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={5000}
          aria-label="Texto de la idea"
        />
        <MicButton value={text} onChange={setText} field={textRef} className="absolute bottom-3 right-2 min-h-11" />
      </div>
      {changed ? (
        <button
          type="button"
          className="btn btn-primary w-full"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api(`/api/ideas/${idea.id}`, { method: "PATCH", body: { text: text.trim() } });
              toast.show({ message: "Idea guardada" });
              onChange({ ...idea, text: text.trim() });
            })
          }
        >
          Guardar cambios
        </button>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await api(`/api/ideas/${idea.id}`, { method: "PATCH", body: { pinned: !idea.pinned } });
              onChange({ ...idea, pinned: !idea.pinned });
            })
          }
        >
          {idea.pinned ? <PinOff size={19} /> : <Pin size={19} />} {idea.pinned ? "Desfijar" : "Fijar"}
        </button>
        <button
          type="button"
          className="btn btn-secondary gap-1.5 whitespace-nowrap px-3"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const { taskId } = await api<{ taskId: string }>(`/api/ideas/${idea.id}/task`, { method: "POST" });
              onChange(null);
              toast.show({
                message: "Convertida en tarea 📥",
                actionLabel: "Ver",
                duration: 5000,
                onAction: () => router.push(`/tareas/${taskId}`),
              });
            })
          }
        >
          <CheckSquare size={19} className="shrink-0" /> Hacer tarea
        </button>
      </div>
      <button
        type="button"
        className={`btn w-full ${confirmDelete ? "btn-danger" : "btn-ghost text-danger"}`}
        disabled={busy}
        onClick={() => {
          if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 4000);
            return;
          }
          run(async () => {
            await api(`/api/ideas/${idea.id}`, { method: "DELETE" });
            onChange(null);
            toast.show({ message: "Idea eliminada" });
          });
        }}
      >
        <Trash2 size={19} /> {confirmDelete ? "Pulsa otra vez para eliminar" : "Eliminar"}
      </button>
    </div>
  );
}
