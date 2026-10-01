import "server-only";
import { db } from "@/lib/db";

export type IdeaView = { id: string; text: string; pinned: boolean; createdAt: string };

export async function listIdeas(userId: string): Promise<IdeaView[]> {
  const ideas = await db.idea.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select: { id: true, text: true, pinned: true, createdAt: true },
    take: 500,
  });
  return ideas.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }));
}

/** Una idea → tarea: la primera línea es el título; el resto, las notas. */
export function ideaToTask(text: string): { title: string; notes: string | null } {
  const lines = text.trim().split(/\r?\n/);
  let title = lines[0].trim();
  let rest = lines.slice(1).join("\n").trim();
  if (title.length > 300) {
    rest = `${title.slice(300)}${rest ? `\n${rest}` : ""}`.trim();
    title = title.slice(0, 300);
  }
  return { title, notes: rest || null };
}
