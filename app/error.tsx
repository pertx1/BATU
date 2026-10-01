"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <TriangleAlert size={44} className="text-warning" />
      <h1 className="mt-4 text-2xl font-bold">Algo ha fallado</h1>
      <p className="mt-2 text-muted">
        {typeof navigator !== "undefined" && !navigator.onLine
          ? "Parece que no tienes conexión. Vuelve a intentarlo cuando la recuperes."
          : "No se ha podido cargar esta pantalla. Vuelve a intentarlo en unos segundos."}
      </p>
      {error.digest ? <p className="mt-2 text-xs text-muted">Código: {error.digest}</p> : null}
      <button type="button" className="btn btn-primary mt-6 w-full" onClick={() => retry()}>
        <RotateCcw size={20} /> Reintentar
      </button>
      <a href="/" className="btn btn-ghost mt-2 w-full">
        Ir a Hoy
      </a>
    </main>
  );
}
