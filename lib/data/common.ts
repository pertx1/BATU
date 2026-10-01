import "server-only";
import { db } from "@/lib/db";
import type { ProjectView } from "@/lib/types";

export function listProjects(userId: string): Promise<ProjectView[]> {
  return db.project.findMany({
    where: { userId, archivedAt: null },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, color: true, emoji: true },
  });
}

export function listGoalOptions(userId: string) {
  return db.goal.findMany({
    where: { userId, status: { not: "ACHIEVED" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });
}
