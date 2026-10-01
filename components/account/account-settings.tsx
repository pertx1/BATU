"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Download, KeyRound, Laptop, Mail, Trash2, UserRound } from "lucide-react";
import { api } from "@/lib/client/api";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";

type Panel = "name" | "email" | "password" | "delete" | null;

export function AccountSettings({
  name,
  email,
  otherSessions,
}: {
  name: string | null;
  email: string;
  otherSessions: number;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);

  return (
    <>
      <ul className="card divide-y divide-line overflow-hidden">
        <Row icon={<UserRound size={20} />} label="Nombre" value={name ?? "—"} onClick={() => setPanel("name")} />
        <Row icon={<Mail size={20} />} label="Email" value={email} onClick={() => setPanel("email")} />
        <Row icon={<KeyRound size={20} />} label="Contraseña" value="••••••••" onClick={() => setPanel("password")} />
      </ul>

      <OtherSessions count={otherSessions} />

      <h2 className="mb-2 mt-7 px-1 text-sm font-semibold uppercase tracking-wide text-muted">Tus datos</h2>
      <div className="card space-y-3 p-4">
        <p className="text-sm text-muted">
          Descarga todo lo que has guardado en Antola (tareas, hábitos, eventos, objetivos, revisiones y ajustes) en un archivo JSON.
        </p>
        <a href="/api/account/export" download className="btn btn-secondary w-full">
          <Download size={20} /> Exportar mis datos
        </a>
      </div>

      <button type="button" className="btn btn-ghost mt-7 w-full text-danger" onClick={() => setPanel("delete")}>
        <Trash2 size={20} /> Eliminar mi cuenta
      </button>

      <Sheet open={panel === "name"} onClose={close} title="Tu nombre">
        <NameForm initial={name ?? ""} onDone={close} />
      </Sheet>
      <Sheet open={panel === "email"} onClose={close} title="Cambiar email">
        <EmailForm current={email} onDone={close} />
      </Sheet>
      <Sheet open={panel === "password"} onClose={close} title="Cambiar contraseña">
        <PasswordForm onDone={close} />
      </Sheet>
      <Sheet open={panel === "delete"} onClose={close} title="Eliminar cuenta">
        <DeleteForm />
      </Sheet>
    </>
  );
}

function Row({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-surface-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] text-muted">{label}</span>
          <span className="block truncate font-medium">{value}</span>
        </span>
        <ChevronRight size={20} className="text-muted" />
      </button>
    </li>
  );
}

function useSubmit(onDone?: () => void) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(fn: () => Promise<string | void>) {
    setBusy(true);
    setError(null);
    try {
      const message = await fn();
      if (message) toast.show({ message });
      router.refresh();
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { submit, busy, error };
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
      {error}
    </p>
  ) : null;
}

function NameForm({ initial, onDone }: { initial: string; onDone: () => void }) {
  const [name, setName] = useState(initial);
  const { submit, busy, error } = useSubmit(onDone);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(async () => {
          await api("/api/account", { method: "PATCH", body: { name } });
          return "Nombre guardado";
        });
      }}
    >
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoFocus aria-label="Nombre" autoComplete="given-name" />
      <ErrorText error={error} />
      <button type="submit" className="btn btn-primary w-full" disabled={busy || !name.trim()}>
        Guardar
      </button>
    </form>
  );
}

function EmailForm({ current, onDone }: { current: string; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { submit, busy, error } = useSubmit(onDone);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(async () => {
          await api("/api/account/email", { body: { email, password } });
          return "Email actualizado";
        });
      }}
    >
      <p className="text-sm text-muted">
        Ahora es <b className="break-all text-fg">{current}</b>. Lo usarás para entrar y para recuperar la contraseña.
      </p>
      <label className="block">
        <span className="label">Nuevo email</span>
        <input className="input" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Contraseña actual</span>
        <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <ErrorText error={error} />
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Guardando…" : "Cambiar email"}
      </button>
    </form>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const { submit, busy, error } = useSubmit(onDone);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(async () => {
          if (next !== repeat) throw new Error("Las contraseñas nuevas no coinciden.");
          const res = await api<{ closedSessions: number }>("/api/account/password", {
            body: { currentPassword: current, newPassword: next },
          });
          return res.closedSessions
            ? `Contraseña cambiada. Se cerró la sesión en ${res.closedSessions} ${res.closedSessions === 1 ? "dispositivo" : "dispositivos"}.`
            : "Contraseña cambiada";
        });
      }}
    >
      <label className="block">
        <span className="label">Contraseña actual</span>
        <input className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Nueva contraseña</span>
        <input className="input" type="password" autoComplete="new-password" minLength={8} required value={next} onChange={(e) => setNext(e.target.value)} />
        <span className="mt-1.5 block text-xs text-muted">Al menos 8 caracteres. Se cerrará la sesión en tus otros dispositivos.</span>
      </label>
      <label className="block">
        <span className="label">Repite la nueva contraseña</span>
        <input className="input" type="password" autoComplete="new-password" minLength={8} required value={repeat} onChange={(e) => setRepeat(e.target.value)} />
      </label>
      <ErrorText error={error} />
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

function OtherSessions({ count }: { count: number }) {
  const { submit, busy } = useSubmit();
  if (count === 0) return null;
  return (
    <div className="card mt-3 flex items-center gap-3 p-4">
      <Laptop size={20} className="shrink-0 text-muted" />
      <p className="min-w-0 flex-1 text-sm">
        También tienes la sesión abierta en {count} {count === 1 ? "dispositivo más" : "dispositivos más"}.
      </p>
      <button
        type="button"
        className="shrink-0 text-sm font-semibold text-danger"
        disabled={busy}
        onClick={() =>
          submit(async () => {
            await api("/api/account/sessions", { method: "DELETE" });
            return "Sesiones cerradas en los demás dispositivos";
          })
        }
      >
        Cerrarlas
      </button>
    </div>
  );
}

function DeleteForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = confirm.trim().toUpperCase() === "ELIMINAR" && password.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/account", { method: "DELETE", body: { password, confirm } });
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        await (await reg?.pushManager.getSubscription())?.unsubscribe();
        await (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.();
      } catch {
        // la cuenta ya está borrada; lo del navegador es secundario
      }
      window.location.href = "/login";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
        Se borrarán <b>para siempre</b> tu cuenta y todos tus datos: tareas, hábitos, eventos, objetivos, revisiones y ajustes. No se puede deshacer.
      </p>
      <p className="text-sm text-muted">Si quieres conservar una copia, exporta antes tus datos.</p>
      <label className="block">
        <span className="label">Contraseña</span>
        <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">
          Escribe <b>ELIMINAR</b> para confirmar
        </span>
        <input className="input" autoCapitalize="characters" autoComplete="off" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      <ErrorText error={error} />
      <button type="submit" className="btn btn-danger w-full" disabled={busy || !ready}>
        <Trash2 size={20} /> {busy ? "Eliminando…" : "Eliminar mi cuenta para siempre"}
      </button>
    </form>
  );
}
