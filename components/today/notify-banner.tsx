"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Smartphone, X } from "lucide-react";
import { pushSupported } from "@/lib/client/push";
import { isStandalone } from "@/lib/client/standalone";

const DISMISS_KEY = "antola:notify-banner-dismissed";

type Kind = "install" | "enable";

/** Aviso en Hoy: instalar la app o activar las notificaciones (se puede cerrar). */
export function NotifyBanner() {
  const [kind, setKind] = useState<Kind | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // almacenamiento bloqueado: lo mostramos igualmente
    }
    if (dismissed) return;
    if (!isStandalone()) setKind("install");
    else if (pushSupported() && Notification.permission === "default") setKind("enable");
  }, []);

  if (!kind) return null;

  function dismiss() {
    setKind(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // nada
    }
  }

  const Icon = kind === "install" ? Smartphone : BellRing;
  return (
    <div className="card mb-5 flex items-center gap-3 p-3 pl-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon size={20} />
      </span>
      <Link href="/ajustes#notificaciones" className="min-w-0 flex-1">
        <p className="font-medium">{kind === "install" ? "Instala Antola" : "Activa las notificaciones"}</p>
        <p className="text-sm text-muted">
          {kind === "install"
            ? "Añádela a tu pantalla de inicio para recibir avisos."
            : "Recibe tus recordatorios aunque la app esté cerrada."}
        </p>
      </Link>
      <button type="button" onClick={dismiss} className="p-2 text-muted" aria-label="Cerrar aviso">
        <X size={18} />
      </button>
    </div>
  );
}
