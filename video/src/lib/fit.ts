/**
 * Tamaño de letra aproximado para que una palabra quepa en `maxWidth`.
 * `ratio` = ancho medio de un carácter en ems para esa fuente/peso.
 */
export const fitFontSize = (
  text: string,
  maxWidth: number,
  maxSize: number,
  ratio: number,
) => {
  const chars = Math.max(1, Array.from(text).length);
  return Math.min(maxSize, maxWidth / (chars * ratio));
};
