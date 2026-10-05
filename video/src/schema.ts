import { zColor, zTextarea } from "@remotion/zod-types";
import { z } from "zod";

// Campos comunes a todas las tarjetas.
const base = {
  /** Duración de la tarjeta (4-5 s = 120-150 frames a 30 fps). */
  durationInFrames: z.number().int().min(90).max(180),
  /** El único color de acento de la tarjeta. */
  accent: zColor(),
  /** Imagen B/N de sombra de ventana/persiana/hojas en public/ ("" = ninguna). */
  shadowImage: z.string(),
  /** Opacidad de la sombra (15-25 % recomendado). */
  shadowOpacity: z.number().min(0).max(0.4).step(0.01),
  /** Trama casi invisible por encima del fondo. */
  overlay: z.enum(["grid", "dots", "none"]),
};

export const objectCardSchema = z.object({
  template: z.literal("ObjectCentered"),
  ...base,
  title: z.string(),
  barText: z.string(),
  keyword: z.string(),
  /** Hasta 3 líneas (una por renglón). Se escriben en paralelo. */
  paragraph: zTextarea(),
  /** PNG recortado o WebM con alfa en public/ ("" = placeholder SVG). */
  objectSrc: z.string(),
  /** Texto del sello dentado ("" = sin sello). */
  sealText: z.string(),
});

export const characterCardSchema = z.object({
  template: z.literal("CharacterBased"),
  ...base,
  name: z.string(),
  tagline: z.string(),
  wordBefore: z.string(),
  bigWord: z.string(),
  wordAfter: z.string(),
  /** Persona recortada (PNG con alfa) en public/ ("" = silueta placeholder). */
  personSrc: z.string(),
});

export const textCardSchema = z.object({
  template: z.literal("TextCentered"),
  ...base,
  lineTop: z.string(),
  bigWord: z.string(),
  lineBottom: z.string(),
  /** Objeto pequeño que entra girando desde abajo ("" = placeholder SVG). */
  objectSrc: z.string(),
});

export const cardSchema = z.discriminatedUnion("template", [
  objectCardSchema,
  characterCardSchema,
  textCardSchema,
]);

export const fxSchema = z.object({
  /** Desfase de la cascada de entrada, en frames (3-5). */
  stagger: z.number().int().min(3).max(5),
  /** Motion blur en la entrada de cámara. */
  motionBlur: z.boolean(),
  /** Aberración cromática muy sutil. */
  chromaticAberration: z.boolean(),
});

export const captionSchema = z.object({
  /** Segundos del audio original. */
  start: z.number().min(0),
  end: z.number().min(0),
  text: z.string(),
});

export const audioSchema = z.object({
  /** Audio del clip en public/, ya cortado a su tramo ("" = sin audio). */
  src: z.string(),
  /** Segundo del podcast en el que empieza ese archivo (sincroniza subtítulos). */
  startSeconds: z.number().min(0),
  volume: z.number().min(0).max(2).step(0.05),
});

export const reelSchema = z.object({
  cards: z.array(cardSchema).min(1),
  fx: fxSchema,
  audio: audioSchema,
  showCaptions: z.boolean(),
  captions: z.array(captionSchema),
});

export const objectCompSchema = z.object({ card: objectCardSchema, fx: fxSchema });
export const characterCompSchema = z.object({
  card: characterCardSchema,
  fx: fxSchema,
});
export const textCompSchema = z.object({ card: textCardSchema, fx: fxSchema });

export type ObjectCard = z.infer<typeof objectCardSchema>;
export type CharacterCard = z.infer<typeof characterCardSchema>;
export type TextCard = z.infer<typeof textCardSchema>;
export type Card = z.infer<typeof cardSchema>;
export type Fx = z.infer<typeof fxSchema>;
export type ReelProps = z.infer<typeof reelSchema>;
export type Caption = z.infer<typeof captionSchema>;
export type AudioTrack = z.infer<typeof audioSchema>;
