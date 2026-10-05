import type { Card, CharacterCard, Fx, ObjectCard, TextCard } from "./schema";
import { ACCENTS } from "./theme";

// ---------------------------------------------------------------------------
// Edita aquí los textos, colores e imágenes del reel. Cada tarjeta dura
// 4-5 s (120-150 frames a 30 fps). Las rutas de imagen son relativas a public/;
// si un archivo no existe se dibuja un placeholder SVG.
// ---------------------------------------------------------------------------

const common = {
  durationInFrames: 135,
  shadowImage: "sombra-ventana.jpg",
  shadowOpacity: 0.2,
} as const;

export const objectCard: ObjectCard = {
  template: "ObjectCentered",
  ...common,
  accent: ACCENTS.rojo,
  overlay: "grid",
  title: "Nuevo episodio",
  barText: "con Luisito Comunica",
  keyword: "CHINA",
  // 3 líneas cortas (≈ 26 caracteres máx.) para que se escriban en ~1 s.
  paragraph: "Lo bueno y lo malo\nde un país que parece\nvivir en el futuro.",
  objectSrc: "objeto.png",
  sealText: "Podcast",
};

export const characterCard: CharacterCard = {
  template: "CharacterBased",
  ...common,
  accent: ACCENTS.azul,
  overlay: "dots",
  name: "Luisito Comunica",
  tagline: "viajero y creador de contenido",
  wordBefore: "lo",
  bigWord: "BUENO",
  wordAfter: "y lo malo",
  personSrc: "persona.png",
};

export const textCard: TextCard = {
  template: "TextCentered",
  ...common,
  accent: ACCENTS.violeta,
  overlay: "grid",
  lineTop: "¿Viven en el",
  bigWord: "futuro",
  lineBottom: "o exageramos?",
  objectSrc: "objeto-pequeno.png",
};

/** Tarjetas del reel, en orden. */
export const scenes: Card[] = [objectCard, characterCard, textCard];

export const defaultFx: Fx = {
  stagger: 4,
  motionBlur: true,
  chromaticAberration: true,
};
