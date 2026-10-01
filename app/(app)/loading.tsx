/**
 * Esqueleto mientras llega una pantalla: la respuesta al toque es inmediata.
 * Imita la cabecera de iOS (botones arriba, título grande) y unas secciones.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="pt-safe">
        <div className="mx-auto h-14 max-w-xl" />
      </div>
      <div className="mx-auto max-w-xl px-5">
        <div className="mb-5 h-[41px] w-44 animate-pulse rounded-xl bg-surface-2" />
        <div className="space-y-3">
          <div className="card h-[76px] animate-pulse" />
          <div className="card h-[140px] animate-pulse [animation-delay:80ms]" />
          <div className="card h-[100px] animate-pulse [animation-delay:160ms]" />
        </div>
      </div>
    </div>
  );
}
