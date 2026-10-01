"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, CheckCircle2, Send, Smartphone } from "lucide-react";
import { api } from "@/lib/client/api";
import { currentSubscription, pushSupported, saveSubscription, subscribe, unsubscribe } from "@/lib/client/push";
import { isStandalone } from "@/lib/client/standalone";
import { InstallInstructions } from "@/components/onboarding/install-instructions";
import { useToast } from "@/components/ui/toast";

type State =
  | "loading"
  | "not-installed"
  | "unsupported"
  | "no-server-key"
  | "denied"
  | "off"
  | "on";

export function NotificationsPanel({ publicKey }: { publicKey: string | null }) {
  const toast = useToast();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (!isStandalone()) next = "not-installed";
      else if (!pushSupported()) next = "unsupported";
      else if (!publicKey) next = "no-server-key";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const sub = Notification.permission === "granted" ? await currentSubscription() : null;
        next = sub ? "on" : "off";
        // Re-sincroniza por si el servidor la borró o el dispositivo cambió de cuenta.
        if (sub) saveSubscription(sub).catch(() => {});
      }
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function activate() {
    // iOS exige que requestPermission se llame directamente en el gesto del usuario,
    // sin ningún await antes.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "off");
      return;
    }
    setBusy(true);
    try {
      await subscribe(publicKey!);
      setState("on");
      toast.show({ message: "Notificaciones activadas" });
    } catch (err) {
      toast.error((err as Error).message || "No se pudieron activar las notificaciones.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    try {
      await unsubscribe();
      setState("off");
      toast.show({ message: "Notificaciones desactivadas en este dispositivo" });
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const res = await api<{ devices: number }>("/api/push/test", { method: "POST" });
      toast.show({
        message: res.devices > 1 ? `Prueba enviada a ${res.devices} dispositivos` : "Prueba enviada",
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return <div className="card h-28 animate-pulse" aria-busy="true" />;
  }

  if (state === "not-installed") {
    return (
      <div className="space-y-3">
        <div className="card flex gap-3 p-4">
          <Smartphone className="mt-0.5 shrink-0 text-accent" size={22} />
          <p>
            Para recibir avisos, <b>instala Antola en tu pantalla de inicio</b> y ábrela desde allí. En el iPhone
            las notificaciones solo funcionan con la app instalada.
          </p>
        </div>
        <InstallInstructions />
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <Notice icon={<BellOff size={22} />}>
        Este dispositivo no admite notificaciones web. En el iPhone necesitas iOS 16.4 o posterior.
      </Notice>
    );
  }

  if (state === "no-server-key") {
    return (
      <Notice icon={<BellOff size={22} />}>
        El servidor aún no tiene configuradas las claves de notificaciones (VAPID). Quien administre Antola debe
        añadirlas.
      </Notice>
    );
  }

  if (state === "denied") {
    return (
      <Notice icon={<BellOff size={22} />}>
        Has bloqueado las notificaciones. Para activarlas ve a <b>Ajustes del iPhone → Notificaciones → Antola</b>{" "}
        y permite las notificaciones. Después vuelve aquí.
      </Notice>
    );
  }

  if (state === "off") {
    return (
      <div className="card space-y-3 p-4">
        <p className="text-muted">Recibe tus recordatorios aunque no tengas la app abierta.</p>
        <button type="button" className="btn btn-primary w-full" onClick={activate} disabled={busy}>
          <BellRing size={20} /> {busy ? "Activando…" : "Activar notificaciones"}
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <p className="flex items-center gap-2 font-medium text-success">
        <CheckCircle2 size={20} /> Activadas en este dispositivo
      </p>
      <button type="button" className="btn btn-secondary w-full" onClick={sendTest} disabled={busy}>
        <Send size={20} /> Enviar notificación de prueba
      </button>
      <button type="button" className="btn btn-ghost w-full text-danger" onClick={deactivate} disabled={busy}>
        <BellOff size={20} /> Desactivar en este dispositivo
      </button>
    </div>
  );
}

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card flex gap-3 p-4">
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <p>{children}</p>
    </div>
  );
}
