import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Target } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { todayStr } from "@/lib/dates";
import { listGoalViews } from "@/lib/data/goals";
import type { GoalStatus } from "@/lib/types";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { GoalCard } from "@/components/goals/goal-card";
import { EmptyState } from "@/components/ui/controls";

export const metadata: Metadata = { title: "Objetivos" };

const FILTERS: { key: string; status: GoalStatus; label: string; empty: string }[] = [
  { key: "activos", status: "ACTIVE", label: "Activos", empty: "Sin objetivos activos" },
  { key: "pausados", status: "PAUSED", label: "Pausados", empty: "Nada en pausa" },
  { key: "conseguidos", status: "ACHIEVED", label: "Conseguidos", empty: "Aún no hay objetivos conseguidos" },
];

export default async function ObjetivosPage({ searchParams }: PageProps<"/objetivos">) {
  const user = await requireOnboardedUser();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.estado) ?? FILTERS[0];
  const goals = await listGoalViews(user.id, filter.status);
  const today = todayStr(user.timezone);

  return (
    <>
      <PageHeader
        title="Objetivos"
        right={
          <Link href="/objetivos/nuevo" aria-label="Nuevo objetivo" className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Plus size={24} />
          </Link>
        }
      />
      <PageBody>
        <nav className="mb-5 flex rounded-xl bg-surface-2 p-1" aria-label="Filtrar objetivos">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "activos" ? "/objetivos" : `/objetivos?estado=${f.key}`}
              aria-current={f === filter ? "page" : undefined}
              className={`flex min-h-10 flex-1 items-center justify-center rounded-lg px-2 text-[15px] font-semibold transition ${
                f === filter ? "bg-surface text-fg shadow-sm" : "text-muted"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        {goals.length ? (
          <ul className="space-y-3">
            {goals.map((g) => (
              <li key={g.id}>
                <GoalCard goal={g} today={today} />
              </li>
            ))}
          </ul>
        ) : filter.status === "ACTIVE" ? (
          <>
            <EmptyState
              icon={<Target size={26} />}
              title="Define tu primer objetivo"
              text="Numérico, por hitos o por tareas. Márcalo como foco y lo verás cada día en Hoy."
            />
            <Link href="/objetivos/nuevo" className="btn btn-primary w-full">
              <Plus size={20} /> Nuevo objetivo
            </Link>
          </>
        ) : (
          <EmptyState icon={<Target size={26} />} title={filter.empty} />
        )}
      </PageBody>
    </>
  );
}
