import type { Metadata } from "next";
import { requireOnboardedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listProjects } from "@/lib/data/common";
import { PageBody, PageHeader } from "@/components/app/page-header";
import { ProjectManager } from "@/components/projects/project-manager";

export const metadata: Metadata = { title: "Proyectos" };

export default async function ProjectsPage() {
  const user = await requireOnboardedUser();
  const [projects, counts] = await Promise.all([
    listProjects(user.id),
    db.task.groupBy({
      by: ["projectId"],
      where: { userId: user.id, completedAt: null, projectId: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const pending = new Map(counts.map((c) => [c.projectId, c._count._all]));
  return (
    <>
      <PageHeader title="Proyectos" back="/menu" />
      <PageBody>
        <ProjectManager projects={projects.map((p) => ({ ...p, pending: pending.get(p.id) ?? 0 }))} />
      </PageBody>
    </>
  );
}
