import { Share, SquarePlus } from "lucide-react";

export function InstallInstructions() {
  return (
    <ol className="space-y-3">
      <li className="card flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">1</span>
        <span>
          Abre esta web en <b>Safari</b> y pulsa el botón <b>Compartir</b>{" "}
          <Share size={18} className="inline -translate-y-0.5 text-accent" aria-label="Compartir" />
        </span>
      </li>
      <li className="card flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">2</span>
        <span>
          Elige <b>«Añadir a pantalla de inicio»</b>{" "}
          <SquarePlus size={18} className="inline -translate-y-0.5 text-accent" aria-hidden />
        </span>
      </li>
      <li className="card flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">3</span>
        <span>
          Abre <b>Antola</b> desde el icono de tu pantalla de inicio y activa las notificaciones en <b>Ajustes</b>.
        </span>
      </li>
    </ol>
  );
}
