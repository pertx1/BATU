import { captions } from "./data/captions";
import type {
  Card,
  CharacterCard,
  Fx,
  ObjectCard,
  ReelProps,
  TextCard,
} from "./schema";
import { ACCENTS } from "./theme";

// ---------------------------------------------------------------------------
// Edita aquí los textos, colores e imágenes del reel. Las rutas de imagen son
// relativas a public/; "icon:<nombre>" usa un objeto SVG integrado
// (telefono, tarjeta, billetes, edificio, wifi, qr, mango, cajero).
//
// Clips cortos (16-19 s) sacados del fragmento 1:36.8–2:29 del podcast con
// Luisito Comunica (pagar en China). Cada clip lleva su tramo de audio; cada
// tarjeta se corta cuando cambia la idea. La duración de un clip es la suma de
// sus tarjetas menos 6 frames por transición.
// ---------------------------------------------------------------------------

const common = {
  shadowImage: "sombra-ventana.jpg",
  shadowOpacity: 0.2,
} as const;

// ─── Clip 1 · «China no se adapta» (1:36.8–1:53.0, 16.2 s) ──────────────────

// «Pero sí creo yo que es muy notable, muy notorio, que China…»
export const objectCard: ObjectCard = {
  template: "ObjectCentered",
  ...common,
  durationInFrames: 147,
  accent: ACCENTS.rojo,
  overlay: "grid",
  title: "Muy notorio",
  barText: "dice Luisito Comunica",
  keyword: "CHINA",
  paragraph: "Lo bueno y lo malo\nde un país que parece\nvivir en el futuro.",
  objectSrc: "icon:edificio",
  sealText: "Podcast",
};

// «…no quiere adaptarse al mundo de afuera»
export const characterCard: CharacterCard = {
  template: "CharacterBased",
  ...common,
  durationInFrames: 144,
  accent: ACCENTS.azul,
  overlay: "dots",
  name: "Luisito Comunica",
  tagline: "estuvo en China hace poco",
  wordBefore: "China no se",
  bigWord: "ADAPTA",
  wordAfter: "a ti",
  personSrc: "persona.png",
};

// «¿En qué lo notas? Desde el internet, es súper difícil»
export const textCard: TextCard = {
  template: "TextCentered",
  ...common,
  durationInFrames: 111,
  accent: ACCENTS.violeta,
  overlay: "grid",
  lineTop: "empezando por",
  bigWord: "internet",
  lineBottom: "súper difícil",
  objectSrc: "icon:wifi",
};

const clip1: Card[] = [
  objectCard,
  characterCard,
  textCard,
  // «Pagar, pagar es bien difícil en China, güey. —¿Eh? —Sí.»
  {
    template: "ObjectCentered",
    ...common,
    durationInFrames: 102,
    accent: ACCENTS.verde,
    overlay: "dots",
    title: "Pagar",
    barText: "es bien difícil",
    keyword: "EN CHINA",
    paragraph: "—¿Eh?\n—Sí.",
    objectSrc: "icon:qr",
    sealText: "Ojo",
  },
];

// ─── Clip 2 · «¿Pagar con tarjeta?» (1:53.0–2:10.2, 17.2 s) ──────────────────

const clip2: Card[] = [
  // «Todo mundo ya paga con sus teléfonos»
  {
    template: "ObjectCentered",
    ...common,
    durationInFrames: 111,
    accent: ACCENTS.verde,
    overlay: "grid",
    title: "¿Cómo se paga?",
    barText: "en China",
    keyword: "TELÉFONO",
    paragraph: "Todo mundo ya paga\ncon sus teléfonos.",
    objectSrc: "icon:telefono",
    sealText: "Alipay",
  },
  // «que si WeChat, que si Alipay, bla, bla, bla»
  {
    template: "TextCentered",
    ...common,
    durationInFrames: 105,
    accent: ACCENTS.rojo,
    overlay: "dots",
    lineTop: "que si",
    bigWord: "WeChat",
    lineBottom: "que si Alipay",
    objectSrc: "icon:qr",
  },
  // «llegas con tus tarjetitas Visa, en el hotel sí puedes moverte»
  {
    template: "ObjectCentered",
    ...common,
    durationInFrames: 153,
    accent: ACCENTS.azul,
    overlay: "grid",
    title: "Tarjetitas Visa",
    barText: "en el hotel, sí",
    keyword: "¿Y EN LA CALLE?",
    paragraph: "En restaurantes y tal,\npero por ejemplo…",
    objectSrc: "icon:tarjeta",
    sealText: "Visa",
  },
  // «comprarle un mango al señor en la calle…»
  {
    template: "TextCentered",
    ...common,
    durationInFrames: 165,
    accent: ACCENTS.verde,
    overlay: "dots",
    lineTop: "¿comprarle un",
    bigWord: "mango",
    lineBottom: "al señor de la calle?",
    objectSrc: "icon:mango",
  },
];

// ─── Clip 3 · «El que tiene cash es el apestoso» (2:10.2–2:29.0, 18.8 s) ─────

const clip3: Card[] = [
  // «Dices: ok, saco cash, voy al cajero…»
  {
    template: "CharacterBased",
    ...common,
    durationInFrames: 99,
    accent: ACCENTS.violeta,
    overlay: "dots",
    name: "Luisito Comunica",
    tagline: "«ok, saco cash, voy al cajero…»",
    wordBefore: "saco",
    bigWord: "CASH",
    wordAfter: "y…",
    personSrc: "persona-cash.png",
  },
  // «9 de 10 cajeros no van a aceptar tu tarjeta. De verdad»
  {
    template: "ObjectCentered",
    ...common,
    durationInFrames: 180,
    accent: ACCENTS.rojo,
    overlay: "grid",
    title: "Cajeros",
    barText: "así te la pongo",
    keyword: "9 DE 10",
    paragraph: "no van a aceptar\ntu tarjeta.\nDe verdad.",
    objectSrc: "icon:cajero",
    sealText: "9/10",
  },
  // «un amigo que vive allá, Max y Noel, les mando saludos»
  {
    template: "TextCentered",
    ...common,
    durationInFrames: 168,
    accent: ACCENTS.verde,
    overlay: "dots",
    lineTop: "saludos a",
    bigWord: "Max",
    lineBottom: "y Noel, que viven allá",
    objectSrc: "icon:billetes",
  },
  // «el que tiene el cash aquí es el apestoso, no quieren cash»
  {
    template: "CharacterBased",
    ...common,
    durationInFrames: 135,
    accent: ACCENTS.azul,
    overlay: "grid",
    name: "Según Max y Noel",
    tagline: "«el que tiene el cash aquí es el…»",
    wordBefore: "el",
    bigWord: "APESTOSO",
    wordAfter: "güey",
    personSrc: "persona-apestoso.png",
  },
];

export const defaultFx: Fx = {
  stagger: 4,
  motionBlur: true,
  chromaticAberration: true,
};

const clipProps = (cards: Card[], startSeconds: number): ReelProps => ({
  cards,
  fx: defaultFx,
  audio: { src: "podcast-audio.m4a", startSeconds, volume: 1 },
  showCaptions: true,
  captions,
});

/** Clips cortos: cada uno es una composición en el Studio. */
export const clips: { id: string; props: ReelProps }[] = [
  { id: "Clip1-NoSeAdapta", props: clipProps(clip1, 96.8) },
  { id: "Clip2-PagarConTarjeta", props: clipProps(clip2, 113.0) },
  { id: "Clip3-ElApestoso", props: clipProps(clip3, 130.2) },
];
