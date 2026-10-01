"use server";

import { revalidatePath } from "next/cache";

/**
 * Vacía la caché de pantallas del navegador (todas, no solo la actual) tras un
 * cambio, para que las pestañas precargadas nunca muestren datos viejos.
 * No lee ni modifica datos, así que no necesita sesión.
 */
export async function purgeClientCache() {
  revalidatePath("/", "layout");
}
