"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/client/api";
import { useLeave } from "@/lib/client/navigation";
import type { GoalType, GoalView, ProjectView } from "@/lib/types";
import { Segmented } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";

const TYPE_HELP: Record<GoalType, string> = {
  NUMERIC: "Un número que quieres alcanzar: 1000 seguidores, 10 € al día, 5 kg…",
  MILESTONES: "Una lista de pasos que vas marcando.",
  TASKS: "El progreso es el % de tareas vinculadas completadas.",
};

/** "1.000,5" o "1000.5" → número. */
function parseNumber(s: string): number | null {
  const t = s.trim().replace(/\s/g, "");
  if (!t) return null;
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function numberToInput(n: number | null): string {
  return n == null ? "" : String(n).replace(".", ",");
}

export function GoalForm({ goal, projects }: { goal?: GoalView; projects: ProjectView[] }) {
  const router = useRouter();
  const leave = useLeave();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [why, setWhy] = useState(goal?.why ?? "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [projectId, setProjectId] = useState(goal?.project?.id ?? "");
  const [type, setType] = useState<GoalType>(goal?.type ?? "NUMERIC");
  const [start, setStart] = useState(numberToInput(goal?.startValue ?? null));
  const [target, setTarget] = useState(numberToInput(goal?.targetValue ?? null));
  const [unit, setUnit] = useState(goal?.unit ?? "");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [newMilestone, setNewMilestone] = useState("");

  function addMilestone() {
    const t = newMilestone.trim();
    if (!t) return;
    setMilestones((m) => [...m, t]);
    setNewMilestone("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const startValue = parseNumber(start);
    const targetValue = parseNumber(target);
    if (type === "NUMERIC") {
      if (targetValue == null || Number.isNaN(targetValue)) return toast.error("Indica la meta (un número).");
      if (Number.isNaN(startValue)) return toast.error("El valor inicial debe ser un número.");
    }
    setBusy(true);
    const pendingMilestone = newMilestone.trim();
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      why: why.trim() || null,
      deadline: deadline || null,
      projectId: projectId || null,
      type,
      ...(type === "NUMERIC" ? { startValue: startValue ?? 0, targetValue, unit: unit.trim() || null } : {}),
      ...(!goal && type === "MILESTONES"
        ? { milestones: pendingMilestone ? [...milestones, pendingMilestone] : milestones }
        : {}),
    };
    try {
      if (goal) {
        await api(`/api/goals/${goal.id}`, { method: "PATCH", body });
        toast.show({ message: "Objetivo guardado" });
        // Vuelve a la ficha del objetivo (sin dejar la edición en el historial).
        leave(`/objetivos/${goal.id}`);
      } else {
        const created = await api<{ id: string }>("/api/goals", { body });
        toast.show({ message: "Objetivo creado 🎯" });
        router.push(`/objetivos/${created.id}`);
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input
        className="input text-lg font-semibold"
        placeholder="¿Qué quieres conseguir?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus={!goal}
        required
        maxLength={200}
        aria-label="Título"
      />

      <div>
        <span className="label">Tipo de progreso</span>
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "NUMERIC", label: "Numérico" },
            { value: "MILESTONES", label: "Hitos" },
            { value: "TASKS", label: "Tareas" },
          ]}
        />
        <p className="mt-1.5 text-sm text-muted">{TYPE_HELP[type]}</p>
      </div>

      {type === "NUMERIC" ? (
        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="label">Inicio</span>
            <input className="input" inputMode="decimal" placeholder="0" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Meta</span>
            <input className="input" inputMode="decimal" placeholder="1000" value={target} onChange={(e) => setTarget(e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">Unidad</span>
            <input className="input" placeholder="€, kg…" maxLength={30} value={unit} onChange={(e) => setUnit(e.target.value)} />
          </label>
        </div>
      ) : null}

      {type === "MILESTONES" && !goal ? (
        <div>
          <span className="label">Hitos</span>
          {milestones.length ? (
            <ol className="mb-2 space-y-1.5">
              {milestones.map((m, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                  <span className="w-5 text-sm text-muted">{i + 1}.</span>
                  <span className="flex-1">{m}</span>
                  <button type="button" aria-label="Quitar hito" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} className="text-muted">
                    <X size={18} />
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Añadir hito"
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addMilestone();
                }
              }}
            />
            <button type="button" className="btn btn-secondary px-4" aria-label="Añadir hito" onClick={addMilestone}>
              <Plus size={20} />
            </button>
          </div>
        </div>
      ) : null}

      <label className="block">
        <span className="label">¿Por qué es importante?</span>
        <textarea
          className="input min-h-20 resize-y"
          placeholder="Lo que te motiva. Lo verás cuando flaquees."
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          maxLength={2000}
        />
      </label>

      <label className="block">
        <span className="label">Descripción</span>
        <textarea
          className="input min-h-20 resize-y"
          placeholder="Detalles, cómo lo vas a medir…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Fecha límite</span>
          <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Proyecto</span>
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Ninguno</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji ? `${p.emoji} ` : ""}
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={busy || !title.trim()}>
        {busy ? "Guardando…" : goal ? "Guardar cambios" : "Crear objetivo"}
      </button>
    </form>
  );
}
