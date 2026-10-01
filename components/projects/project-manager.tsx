"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, FolderPlus, Pencil } from "lucide-react";
import { api } from "@/lib/client/api";
import { PROJECT_COLORS, type ProjectView } from "@/lib/types";
import { ColorPicker, EmptyState } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";

type ProjectWithCount = ProjectView & { pending: number };

export function ProjectManager({ projects }: { projects: ProjectWithCount[] }) {
  const [editing, setEditing] = useState<ProjectView | "new" | null>(null);

  return (
    <>
      {projects.length ? (
        <ul className="card divide-y divide-line overflow-hidden">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center">
              <Link href={`/tareas?f=p:${p.id}`} className="flex min-h-14 flex-1 items-center gap-3 px-4 active:bg-surface-2">
                <span
                  className="flex size-9 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${p.color}26`, color: p.color }}
                >
                  {p.emoji || <span className="size-3 rounded-full" style={{ backgroundColor: p.color }} />}
                </span>
                <span className="flex-1 font-medium">{p.name}</span>
                <span className="text-sm text-muted">{p.pending || ""}</span>
                <ChevronRight size={18} className="text-muted" />
              </Link>
              <button
                type="button"
                onClick={() => setEditing(p)}
                className="flex size-12 items-center justify-center text-muted"
                aria-label={`Editar ${p.name}`}
              >
                <Pencil size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<FolderPlus size={26} />} title="Sin proyectos" text="Agrupa tus tareas, eventos y objetivos por áreas." />
      )}
      <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => setEditing("new")}>
        <FolderPlus size={20} /> Nuevo proyecto
      </button>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo proyecto" : "Editar proyecto"}>
        {editing !== null ? (
          <ProjectForm key={editing === "new" ? "new" : editing.id} project={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
        ) : null}
      </Sheet>
    </>
  );
}

function ProjectForm({ project, onDone }: { project: ProjectView | null; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(project?.name ?? "");
  const [emoji, setEmoji] = useState(project?.emoji ?? "");
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { name, color, emoji: emoji.trim() || null };
      if (project) await api(`/api/projects/${project.id}`, { method: "PATCH", body });
      else await api("/api/projects", { body });
      router.refresh();
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!project) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/projects/${project.id}`, { method: "DELETE" });
      toast.show({ message: "Proyecto eliminado. Sus tareas se conservan." });
      router.refresh();
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex gap-2">
        <input
          className="input w-16 text-center text-xl"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          placeholder="🙂"
          maxLength={8}
          aria-label="Emoji"
        />
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" required maxLength={60} autoFocus aria-label="Nombre" />
      </div>
      <div>
        <span className="label">Color</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={busy || !name.trim()}>
        {project ? "Guardar" : "Crear proyecto"}
      </button>
      {project ? (
        <button type="button" className={`btn w-full ${confirmDelete ? "btn-danger" : "btn-secondary text-danger"}`} disabled={busy} onClick={remove}>
          {confirmDelete ? "Confirmar: eliminar proyecto" : "Eliminar proyecto"}
        </button>
      ) : null}
    </form>
  );
}
