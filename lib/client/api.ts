import { purgeClientCache } from "@/lib/actions/cache";

// Cliente fetch para nuestros endpoints. Lanza Error con el mensaje del servidor.
export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // respuesta sin cuerpo
  }
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth/")) {
      window.location.href = "/login";
    }
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "Algo ha fallado. Inténtalo de nuevo.";
    throw new Error(message);
  }
  // Tras cualquier cambio, ninguna pantalla en caché puede quedarse vieja.
  const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
  if (method !== "GET" && !path.startsWith("/api/auth/")) void purgeClientCache().catch(() => {});
  return data as T;
}
