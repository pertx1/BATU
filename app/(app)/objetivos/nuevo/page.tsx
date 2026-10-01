import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/data/common";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { GoalForm } from "@/components/goals/goal-form";

export const metadata: Metadata = { title: "Nuevo objetivo" };

export default async function NewGoalPage() {
  const user = await requireOnboardedUser();
  const projects = await listProjects(user.id);
  return (
    <>
      <PageHeader title="Nuevo objetivo" back="/objetivos" />
      <PageBody>
        <GoalForm projects={projects} />
      </PageBody>
    </>
  );
}
