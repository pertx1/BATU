import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/data/common";
import { getGoalDetail } from "@/lib/data/goals";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { GoalForm } from "@/components/goals/goal-form";
import { DeleteButton } from "@/components/ui/delete-button";

export const metadata: Metadata = { title: "Editar objetivo" };

export default async function EditGoalPage({ params }: PageProps<"/objetivos/[id]/editar">) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  const [detail, projects] = await Promise.all([getGoalDetail(user.id, id), listProjects(user.id)]);
  if (!detail) notFound();
  return (
    <>
      <PageHeader title="Editar objetivo" back={`/objetivos/${id}`} />
      <PageBody>
        <div className="space-y-5">
          <GoalForm goal={detail.goal} projects={projects} />
          <DeleteButton
            path={`/api/goals/${id}`}
            label="Eliminar objetivo"
            confirmLabel="Pulsa otra vez: se borran hitos y registros"
            done="Objetivo eliminado"
            redirectTo="/objetivos"
          />
          <p className="text-center text-sm text-muted">Las tareas vinculadas no se borran, solo se desvinculan.</p>
        </div>
      </PageBody>
    </>
  );
}
