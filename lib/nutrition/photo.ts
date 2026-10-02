/** Fotos de comida: tipos y comprobaciones (puro). */

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type PhotoUpload = { data: Uint8Array; mediaType: "image/jpeg" | "image/webp" | "image/png" };

/** Comprueba por los primeros bytes que es de verdad una imagen JPEG, WebP o PNG. */
export function sniffImage(data: Uint8Array): PhotoUpload["mediaType"] | null {
  const b = data;
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}
