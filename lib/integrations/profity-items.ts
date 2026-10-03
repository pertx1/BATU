/** Lo que devuelve Profity y el texto de las tareas (puro: se puede probar). */

export type ProfityItem = { key: string; label: string; quantity: number };

/** Nota de la tarea: cuánto falta según Profity (puede ser negativo por los pedidos pendientes). */
export function profityNotes(quantity: number): string {
  const state = quantity < 0 ? `Faltan ${-quantity} para cubrir los pedidos pendientes.` : "Se ha quedado a 0.";
  return `${state}\nDesde Profity: la tarea se actualiza sola cada hora.`;
}

/** Valida lo que devuelve Profity (por si cambia o responde algo raro). */
export function parseProfityItems(json: unknown): ProfityItem[] {
  const items = (json as { items?: unknown })?.items;
  if (!Array.isArray(items)) throw new Error("respuesta sin «items»");
  return items
    .filter(
      (i): i is ProfityItem =>
        !!i && typeof i.key === "string" && typeof i.label === "string" && typeof i.quantity === "number" && i.key.length <= 150,
    )
    .slice(0, 300)
    .map((i) => ({ key: i.key, label: i.label.slice(0, 150), quantity: Math.round(i.quantity) }));
}
