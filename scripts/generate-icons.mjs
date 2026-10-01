// Genera los iconos de placeholder de la PWA a partir de un SVG.
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6a5cff"/>
      <stop offset="1" stop-color="#4a3bd6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <circle cx="256" cy="256" r="132" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="28"/>
  <path d="M190 262 L237 309 L326 210" fill="none" stroke="#ffffff" stroke-width="36"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const out = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/maskable-512.png", 512],
  ["public/apple-touch-icon.png", 180],
  ["public/icons/badge-96.png", 96],
];
for (const [file, size] of out) {
  await sharp(Buffer.from(svg(size))).resize(size, size).png().toFile(file);
  console.log("✔", file);
}
