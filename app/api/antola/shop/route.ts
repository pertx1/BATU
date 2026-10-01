import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, notFound, parseBody, withUser } from "@/lib/api";
import { award, ensureStats } from "@/lib/gamification";
import { SHOP_BY_ID } from "@/lib/antola/shop";
import { MAX_SHIELDS } from "@/lib/antola/xp";

const schema = z.object({ itemId: z.string().min(1).max(40) });

/**
 * Compra en la tienda de Antola. El precio, el nivel mínimo y el límite de
 * protectores salen del catálogo del servidor; del cliente solo llega el id.
 */
export const POST = withUser(async (req, { userId, user }) => {
  const { itemId } = await parseBody(req, schema);
  const item = SHOP_BY_ID.get(itemId);
  if (!item) throw notFound();
  await ensureStats(userId, user.timezone);

  await db.$transaction(async (tx) => {
    const stats = await tx.userStats.findUniqueOrThrow({ where: { userId }, select: { level: true, streakShields: true } });
    if (stats.level < (item.minLevel ?? 1)) throw new HttpError(400, `Se desbloquea en el nivel ${item.minLevel}.`);

    if (item.kind === "shield") {
      if (stats.streakShields >= MAX_SHIELDS) throw new HttpError(400, `Ya tienes ${MAX_SHIELDS} protectores, el máximo.`);
      const res = await tx.userStats.updateMany({
        where: { userId, crumbs: { gte: item.price }, streakShields: { lt: MAX_SHIELDS } },
        data: { crumbs: { decrement: item.price }, streakShields: { increment: 1 } },
      });
      if (!res.count) throw new HttpError(400, "No tienes migas suficientes.");
      return;
    }

    const owned = await tx.userItem.findUnique({ where: { userId_itemId: { userId, itemId } } });
    if (owned) throw new HttpError(409, "Ya lo tienes.");
    const paid = await tx.userStats.updateMany({
      where: { userId, crumbs: { gte: item.price } },
      data: { crumbs: { decrement: item.price } },
    });
    if (!paid.count) throw new HttpError(400, "No tienes migas suficientes.");
    await tx.userItem.create({ data: { userId, itemId } });
  });

  // Comprar accesorios puede dar el logro «Coleccionista».
  const gamification = item.kind === "accessory" ? await award(user, { type: "check" }) : null;
  const stats = await db.userStats.findUniqueOrThrow({ where: { userId }, select: { crumbs: true, streakShields: true } });
  return NextResponse.json({ ok: true, crumbs: stats.crumbs, shields: stats.streakShields, gamification });
});
