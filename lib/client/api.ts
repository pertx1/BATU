import { purgeClientCache } from "@/lib/actions/cache";

// Cliente fetch para nuestros endpoints. Lanza Error con el mensaje del servidor.
export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const method = options.method ?? (options.body !== undefined ? "POST" : "GET");
  const res = await fetch(path, {
    method,
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });
  return handle<T>(res, path, method);
}

/** Igual que api(), pero enviando un formulario (p. ej. con una foto). */
export async function apiForm<T = unknown>(path: string, form: FormData): Promise<T> {
  const res = await fetch(path, { method: "POST", body: form, credentials: "same-origin" });
  return handle<T>(res, path, "POST");
}

async function handle<T>(res: Response, path: string, method: string): Promise<T> {
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
        : res.status === 413
          ? "La foto es demasiado grande."
          : "Algo ha fallado. Inténtalo de nuevo.";
    throw new Error(message);
  }
  // Tras cualquier cambio, ninguna pantalla en caché puede quedarse vieja.
  if (method !== "GET" && !path.startsWith("/api/auth/")) void purgeClientCache().catch(() => {});
  // Lo ganado con Antola (XP, logros…) lo celebra GamificationProvider.
  if (typeof window !== "undefined" && data && typeof data === "object" && "gamification" in data && data.gamification) {
    window.dispatchEvent(new CustomEvent("antola:reward", { detail: data.gamification }));
  }
  return data as T;
}
