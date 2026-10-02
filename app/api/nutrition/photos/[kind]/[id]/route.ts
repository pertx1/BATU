import { notFound, withUser } from "@/lib/api";
import { db } from "@/lib/db";
import { getPhoto, photosConfigured } from "@/lib/nutrition/r2";

/**
 * Foto privada de una comida (o comida habitual). Solo la ve su dueño: se busca
 * por id Y por el usuario de la sesión; si no es suya, 404.
 */
export const GET = withUser<{ kind: string; id: string }>(async (_req, { userId }, { kind, id }) => {
  if (!photosConfigured()) throw notFound();
  const row =
    kind === "meal"
      ? await db.mealLog.findFirst({ where: { id, userId }, select: { photoKey: true } })
      : kind === "favorite"
        ? await db.favoriteMeal.findFirst({ where: { id, userId }, select: { photoKey: true } })
        : null;
  if (!row?.photoKey) throw notFound();
  const photo = await getPhoto(row.photoKey);
  if (!photo) throw notFound();
  return new Response(Buffer.from(photo.body), {
    headers: {
      "Content-Type": photo.contentType,
      // Solo en la caché del propio navegador, nunca en una compartida.
      "Cache-Control": "private, max-age=604800, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
