/**
 * Tienda de Antola. Los precios se validan SIEMPRE en el servidor con este
 * catálogo; el cliente solo manda el id del artículo.
 */

export type AccessorySlot = "head" | "face" | "neck" | "back";

export type ThemeColors = {
  light: { accent: string; soft: string };
  dark: { accent: string; soft: string; fg: string };
};

export type ShopItem =
  | { id: string; kind: "accessory"; name: string; description: string; price: number; minLevel?: number; slot: AccessorySlot }
  | { id: string; kind: "theme"; name: string; description: string; price: number; minLevel?: number; colors: ThemeColors }
  | { id: string; kind: "shield"; name: string; description: string; price: number; minLevel?: number };

export const SHOP: ShopItem[] = [
  // Accesorios (se dibujan como capas encima de Antola)
  { id: "gafas", kind: "accessory", slot: "face", name: "Gafas redondas", description: "Para leer la lista de tareas con estilo.", price: 30 },
  { id: "gafas-sol", kind: "accessory", slot: "face", name: "Gafas de sol", description: "Cuando la racha está que arde.", price: 50 },
  { id: "gorro", kind: "accessory", slot: "head", name: "Gorro de lana", description: "Calentito para las mañanas de invierno.", price: 40 },
  { id: "gorra", kind: "accessory", slot: "head", name: "Gorra", description: "Lista para salir a explorar.", price: 45 },
  { id: "lazo", kind: "accessory", slot: "head", name: "Lazo", description: "Un toque coqueto.", price: 30 },
  { id: "flor", kind: "accessory", slot: "head", name: "Flor", description: "Recién cogida del jardín.", price: 25 },
  { id: "auriculares", kind: "accessory", slot: "head", name: "Auriculares", description: "Música para concentrarse.", price: 60 },
  { id: "corona-flores", kind: "accessory", slot: "head", name: "Corona de flores", description: "Primavera todo el año.", price: 70, minLevel: 8 },
  { id: "chistera", kind: "accessory", slot: "head", name: "Sombrero de copa", description: "Muy elegante.", price: 90, minLevel: 10 },
  { id: "bufanda", kind: "accessory", slot: "neck", name: "Bufanda", description: "Para los días de frío.", price: 35 },
  { id: "pajarita", kind: "accessory", slot: "neck", name: "Pajarita", description: "Para las ocasiones especiales.", price: 25 },
  { id: "capa", kind: "accessory", slot: "back", name: "Capa de heroína", description: "Para los días imparables.", price: 80, minLevel: 5 },
  // Temas de color de la app (cambian el color de acento)
  {
    id: "tema-coral",
    kind: "theme",
    name: "Tema coral",
    description: "Cálido como una tarde de verano.",
    price: 60,
    colors: { light: { accent: "#c2410c", soft: "#ffedd5" }, dark: { accent: "#ff8a65", soft: "#3a1d12", fg: "#000000" } },
  },
  {
    id: "tema-menta",
    kind: "theme",
    name: "Tema menta",
    description: "Fresco y tranquilo.",
    price: 60,
    colors: { light: { accent: "#0f766e", soft: "#ccfbf1" }, dark: { accent: "#2dd4bf", soft: "#0f2e2b", fg: "#000000" } },
  },
  {
    id: "tema-oceano",
    kind: "theme",
    name: "Tema océano",
    description: "Azul profundo.",
    price: 60,
    colors: { light: { accent: "#1d4ed8", soft: "#dbeafe" }, dark: { accent: "#60a5fa", soft: "#13233f", fg: "#000000" } },
  },
  {
    id: "tema-rosa",
    kind: "theme",
    name: "Tema chicle",
    description: "Rosa con energía.",
    price: 80,
    colors: { light: { accent: "#be185d", soft: "#fce7f3" }, dark: { accent: "#f472b6", soft: "#3b1228", fg: "#000000" } },
  },
  {
    id: "tema-uva",
    kind: "theme",
    name: "Tema uva",
    description: "Morado intenso.",
    price: 80,
    colors: { light: { accent: "#7e22ce", soft: "#f3e8ff" }, dark: { accent: "#c084fc", soft: "#2a1640", fg: "#000000" } },
  },
  {
    id: "tema-miel",
    kind: "theme",
    name: "Tema miel",
    description: "Dorado, como la reina.",
    price: 100,
    minLevel: 10,
    colors: { light: { accent: "#a16207", soft: "#fef3c7" }, dark: { accent: "#fbbf24", soft: "#3a2a06", fg: "#000000" } },
  },
  // Protector de racha (se gasta solo; máximo 2 guardados)
  { id: "protector", kind: "shield", name: "Protector de racha", description: "Si un día no llegas, tu racha no se pierde.", price: 50 },
];

export const SHOP_BY_ID = new Map(SHOP.map((i) => [i.id, i]));

export const ACCESSORY_IDS = SHOP.filter((i) => i.kind === "accessory").map((i) => i.id);

/** Colores del tema equipado (o null = el de siempre). */
export function themeColors(itemId: string | null | undefined): ThemeColors | null {
  if (!itemId) return null;
  const item = SHOP_BY_ID.get(itemId);
  return item?.kind === "theme" ? item.colors : null;
}
