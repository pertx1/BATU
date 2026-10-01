import "server-only";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";

// Comprueba que los ids que manda el cliente pertenecen al usuario de la sesión.

export async function assertOwnProject(userId: string, projectId: string | null | undefined) {
  if (!projectId) return;
  const found = await db.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (!found) throw new HttpError(404, "Proyecto no encontrado");
}

export async function assertOwnGoal(userId: string, goalId: string | null | undefined) {
  if (!goalId) return;
  const found = await db.goal.findFirst({ where: { id: goalId, userId }, select: { id: true } });
  if (!found) throw new HttpError(404, "Objetivo no encontrado");
}
