import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound, parseBody, withUser } from "@/lib/api";
import { SHOP, SHOP_BY_ID } from "@/lib/antola/shop";

const schema = z.object({ itemId: z.string().min(1).max(40), equipped: z.boolean() });

/** Equipar o quitar un accesorio o un tema (solo de lo que has comprado). */
export const POST = withUser(async (req, { userId }) => {
  const { itemId, equipped } = await parseBody(req, schema);
  const item = SHOP_BY_ID.get(itemId);
  if (!item || item.kind === "shield") throw notFound();
  const owned = await db.userItem.findUnique({ where: { userId_itemId: { userId, itemId } } });
  if (!owned) throw notFound();

  await db.$transaction(async (tx) => {
    if (equipped) {
      // Uno por hueco: un sombrero, unas gafas… y un solo tema.
      const sameSlot = SHOP.filter((i) =>
        item.kind === "theme" ? i.kind === "theme" : i.kind === "accessory" && i.slot === item.slot,
      ).map((i) => i.id);
      await tx.userItem.updateMany({ where: { userId, itemId: { in: sameSlot }, NOT: { itemId } }, data: { equipped: false } });
    }
    await tx.userItem.updateMany({ where: { userId, itemId }, data: { equipped } });
  });
  return NextResponse.json({ ok: true });
});
