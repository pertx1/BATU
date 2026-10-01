import "server-only";
import { db } from "@/lib/db";

/**
 * Lo único que ve el administrador: recuentos y metadatos de cada cuenta.
 * NUNCA tareas, hábitos, eventos ni ningún otro contenido.
 */
export async function getAdminOverview(query: string | null) {
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const where = query ? { email: { contains: query.toLowerCase() } } : {};
  const [total, active7, disabled, users, matching] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { lastActiveAt: { gte: weekAgo }, disabledAt: null } }),
    db.user.count({ where: { disabledAt: { not: null } } }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, email: true, createdAt: true, lastActiveAt: true, disabledAt: true, onboardedAt: true },
    }),
    db.user.count({ where }),
  ]);
  return { total, active7, disabled, users, matching };
}
