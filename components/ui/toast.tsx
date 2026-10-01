"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "error";
};

type ToastApi = {
  show: (t: Omit<Toast, "id"> & { duration?: number }) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast fuera de ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const show = useCallback<ToastApi["show"]>(({ duration = 4000, ...t }) => {
    if (timer.current) clearTimeout(timer.current);
    const id = ++seq.current;
    setToast({ ...t, id });
    timer.current = setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), duration);
  }, []);

  const error = useCallback((message: string) => show({ message, tone: "error" }), [show]);

  return (
    <ToastContext.Provider value={{ show, error }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom) + 5.5rem)" }}
        aria-live="polite"
      >
        {toast ? (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-xl animate-fade-up ${
              toast.tone === "error" ? "bg-danger text-white" : "bg-fg text-bg"
            }`}
          >
            <span className="flex-1 text-[15px] font-medium">{toast.message}</span>
            {toast.actionLabel && toast.onAction ? (
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-[15px] font-bold text-accent-soft"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
              >
                {toast.actionLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
