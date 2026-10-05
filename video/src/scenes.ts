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
// Reel de ejemplo: fragmento 1:36.8–2:29 del podcast con Luisito Comunica
// (pagar en China). Cada tarjeta se corta cuando cambia la idea en el audio;
// las duraciones suman la longitud del fragmento (52.2 s = 1566 frames,
// contando que cada transición solapa 6 frames).
// ---------------------------------------------------------------------------

const common = {
  shadowImage: "sombra-ventana.jpg",
  shadowOpacity: 0.2,
} as const;

// 0:00 «es muy notable, muy notorio, que China…»
export const objectCard: ObjectCard = {
  template: "ObjectCentered",
  ...common,
  durationInFrames: 153,
  accent: ACCENTS.rojo,
  overlay: "grid",
  title: "Lo bueno y lo malo",
  barText: "de China, con Luisito",
  keyword: "PAGAR",
  paragraph: "Es muy notable,\nmuy notorio, que China\nno quiere adaptarse.",
  objectSrc: "icon:edificio",
  sealText: "Podcast",
};

// 0:05 «…no quiere adaptarse al mundo de afuera»
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

// 0:09 «¿En qué lo notas? Desde el internet, es súper difícil»
export const textCard: TextCard = {
  template: "TextCentered",
  ...common,
  durationInFrames: 138,
  accent: ACCENTS.violeta,
  overlay: "grid",
  lineTop: "empezando por",
  bigWord: "internet",
  lineBottom: "súper difícil",
  objectSrc: "icon:wifi",
};

/** Tarjetas del reel, en orden. */
export const scenes: Card[] = [
  objectCard,
  characterCard,
  textCard,
  // 0:14 «Pagar es bien difícil en China. Todo mundo paga con sus teléfonos»
  {
    template: "ObjectCentered",
    ...common,
    durationInFrames: 144,
    accent: ACCENTS.verde,
    overlay: "dots",
    title: "Pagar",
    barText: "es bien difícil",
    keyword: "EN CHINA",
    paragraph: "Todo mundo ya paga\ncon sus teléfonos.",
    objectSrc: "icon:telefono",
    sealText: "Alipay",
  },
  // 0:18 «que si WeChat, que si Alipay, bla, bla, bla»
  {
    template: "TextCentered",
    ...common,
    durationInFrames: 150,
    accent: ACCENTS.rojo,
    overlay: "grid",
    lineTop: "que si",
    bigWord: "WeChat",
    lineBottom: "que si Alipay",
    objectSrc: "icon:qr",
  },
  // 0:23 «llegas con tus tarjetitas Visa, en el hotel sí puedes moverte»
  {
    template: "ObjectCentered",
    ...common,
    durationInFrames: 144,
    accent: ACCENTS.azul,
    overlay: "dots",
    title: "Tarjetitas Visa",
    barText: "en el hotel, sí",
    keyword: "¿Y EN LA CALLE?",
    paragraph: "En restaurantes y tal,\npero por ejemplo…",
    objectSrc: "icon:tarjeta",
    sealText: "Visa",
  },
  // 0:28 «comprarle un mango al señor en la calle»
  {
    template: "TextCentered",
    ...common,
    durationInFrames: 144,
    accent: ACCENTS.verde,
    overlay: "grid",
    lineTop: "¿comprarle un",
    bigWord: "mango",
    lineBottom: "al señor de la calle?",
    objectSrc: "icon:mango",
  },
  // 0:32 «ok, saco cash, voy al cajero»
  {
    template: "CharacterBased",
    ...common,
    durationInFrames: 138,
    accent: ACCENTS.violeta,
    overlay: "dots",
    name: "Luisito Comunica",
    tagline: "«ok, saco cash, voy al cajero…»",
    wordBefore: "saco",
    bigWord: "CASH",
    wordAfter: "y…",
    personSrc: "persona-cash.png",
  },
  // 0:37 «9 de 10 cajeros no van a aceptar tu tarjeta»
  {
    template: "ObjectCentered",
    ...common,
    durationInFrames: 150,
    accent: ACCENTS.rojo,
    overlay: "grid",
    title: "Cajeros",
    barText: "así te la pongo",
    keyword: "9 DE 10",
    paragraph: "no van a aceptar\ntu tarjeta.\nDe verdad.",
    objectSrc: "icon:cajero",
    sealText: "9/10",
  },
  // 0:42 «un amigo que vive allá, Max y Noel, les mando saludos»
  {
    template: "TextCentered",
    ...common,
    durationInFrames: 150,
    accent: ACCENTS.verde,
    overlay: "dots",
    lineTop: "saludos a",
    bigWord: "Max",
    lineBottom: "y Noel, que viven allá",
    objectSrc: "icon:billetes",
  },
  // 0:47 «el que tiene el cash aquí es el apestoso, no quieren cash»
  {
    template: "CharacterBased",
    ...common,
    durationInFrames: 171,
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

export const reelDefaults: ReelProps = {
  cards: scenes,
  fx: defaultFx,
  audio: {
    src: "podcast-audio.m4a",
    startSeconds: 96.8,
    volume: 1,
  },
  showCaptions: true,
  captions,
};
