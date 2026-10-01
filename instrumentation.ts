// Se ejecuta una vez al arrancar cada instancia del servidor.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureMigrated } = await import("@/lib/migrate");
    await ensureMigrated();
  } catch (err) {
    // No impedimos que arranque: se reintenta en la primera petición.
    console.error("[antola] No se pudieron comprobar las migraciones:", (err as Error).message);
  }
}
