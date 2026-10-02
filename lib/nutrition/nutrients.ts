/** Color e icono fijos de cada nutriente (iconos de lucide-react). */
export const NUTRIENT = {
  kcal: { color: "var(--fg)", label: "Calorías" },
  protein: { color: "#E5646A", label: "Proteína" },
  carbs: { color: "#E0995E", label: "Carbohidratos" },
  fat: { color: "#5B8DEF", label: "Grasa" },
  water: { color: "#4FC3F7", label: "Agua" },
  fiber: { color: "#4CB872", label: "Fibra" },
} as const;

export type Nutrient = keyof typeof NUTRIENT;
