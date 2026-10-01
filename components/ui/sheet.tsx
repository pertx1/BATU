"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** Hoja inferior modal, estilo iOS. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="pb-safe max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-surface animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-surface px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
          {title ? (
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{title}</h2>
              <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-muted" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
          ) : null}
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
