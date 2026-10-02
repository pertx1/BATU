/** Esqueleto del Diario (la cabecera y las pestañas se quedan). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-xl px-5 pt-4" aria-busy="true" aria-label="Cargando">
      <div className="mb-4 h-8 w-32 animate-pulse rounded-xl bg-surface-2" />
      <div className="space-y-3">
        <div className="card h-[150px] animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          <div className="card h-[170px] animate-pulse [animation-delay:60ms]" />
          <div className="card h-[170px] animate-pulse [animation-delay:120ms]" />
          <div className="card h-[170px] animate-pulse [animation-delay:180ms]" />
        </div>
        <div className="card h-[130px] animate-pulse [animation-delay:240ms]" />
      </div>
    </div>
  );
}
