import "server-only";
import { notFound } from "next/navigation";
import { HttpError } from "@/lib/api";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/env";

/** Página de administración: a quien no es admin se le responde 404 (ni sabe que existe). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) notFound();
  return user;
}

export function assertAdmin(user: SessionUser) {
  if (!isAdminEmail(user.email)) throw new HttpError(404, "No encontrado");
}
