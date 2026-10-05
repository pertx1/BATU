import { getStaticFiles } from "@remotion/studio";
import { staticFile } from "remotion";

const clean = (src: string) => src.replace(/^\/+/, "");

/**
 * Devuelve la URL de un archivo de public/ o null si no existe, para que los
 * componentes pinten un placeholder SVG en vez de romper el render.
 */
export const resolveAsset = (src: string): string | null => {
  if (!src.trim()) {
    return null;
  }
  const files = getStaticFiles();
  // Fuera del Studio y del render getStaticFiles() está vacío: confiamos en la ruta.
  if (files.length === 0) {
    return staticFile(clean(src));
  }
  return files.some((f) => f.name === clean(src)) ? staticFile(clean(src)) : null;
};

export const isVideo = (src: string) => /\.(webm|mov|mp4)$/i.test(src);

/** Lista de assets referenciados que no están en public/. */
export const missingAssets = (srcs: string[]): string[] =>
  Array.from(new Set(srcs.filter((s) => s.trim() && resolveAsset(s) === null)));
