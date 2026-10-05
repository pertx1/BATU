import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

// --- Tipografía -------------------------------------------------------------
// Sans geométrica bold para títulos, serif elegante (fina) para subtítulos y
// condensada bold para palabras gigantes. Solo se cargan las variantes usadas.
const poppins = loadPoppins("normal", {
  weights: ["600", "700", "800"],
  subsets: ["latin", "latin-ext"],
});
loadPoppins("italic", { weights: ["800"], subsets: ["latin", "latin-ext"] });

const cormorant = loadCormorant("normal", {
  weights: ["400", "500"],
  subsets: ["latin", "latin-ext"],
});
loadCormorant("italic", {
  weights: ["400", "500"],
  subsets: ["latin", "latin-ext"],
});

const anton = loadAnton("normal", {
  weights: ["400"],
  subsets: ["latin", "latin-ext"],
});

export const FONTS = {
  sans: poppins.fontFamily,
  serif: cormorant.fontFamily,
  condensed: anton.fontFamily,
};

// --- Paleta -----------------------------------------------------------------
// Blanco, grises y negro + UN color de acento por tarjeta.
export const ACCENTS = {
  azul: "#1f4fd8",
  verde: "#1d7a4a",
  rojo: "#8c1c1c",
  violeta: "#5b3cc4",
} as const;

export const INK = "#0e0e0e";
export const PAPER = "#ffffff";
export const GRAYS = {
  g50: "#f6f6f6",
  g100: "#eeeeee",
  g200: "#e2e2e2",
  g300: "#cfcfcf",
  g500: "#8a8a8a",
  g700: "#4a4a4a",
};

// --- Formato y tiempos ------------------------------------------------------
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;

/** Frames de la entrada de cámara (escala 1.5 → 1, 8° → 0°, desenfoque → nítido). */
export const CAMERA_FRAMES = 18;
/** Frames del corte entre tarjetas (destello del acento + desenfoque). */
export const TRANSITION_FRAMES = 6;

/**
 * Orden de la cascada de entrada. Cada paso empieza `stagger` frames después
 * del anterior (3-5 frames).
 */
export const STEPS = {
  camera: 0,
  central: 1,
  shapes: 2,
  title: 3,
  bar: 4,
  keyword: 5,
  paragraph: 6,
} as const;

export type Step = keyof typeof STEPS;

/** Spring del elemento central: se pasa hasta ~1.10 (frame 7) y vuelve a 1. */
export const POP_SPRING = { mass: 0.6, damping: 11.5, stiffness: 160 };
/** Spring sin rebote para formas. */
export const SOFT_SPRING = { damping: 200, stiffness: 120, mass: 0.8 };
