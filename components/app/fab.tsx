"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";

/** Botón "+" flotante de captura rápida (la captura se conecta en la fase 2). */
export function Fab() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Captura rápida"
        className="fixed right-5 z-40 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg shadow-accent/30 transition active:scale-90"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom) + 1rem)" }}
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="pb-safe w-full rounded-t-3xl bg-surface p-5 animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
            <input ref={inputRef} className="input" placeholder="¿Qué tienes en mente?" disabled />
            <p className="mt-3 text-center text-sm text-muted">La captura rápida llega en la siguiente fase.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
