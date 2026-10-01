"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";

export function UserToggle({ id, email, disabled }: { id: string; email: string; disabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!disabled && !confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 4000);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/admin/users/${id}`, { body: { disabled: !disabled } });
      toast.show({ message: disabled ? `${email} reactivada` : `${email} desactivada` });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={run}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${
        disabled ? "bg-success-soft text-success" : confirm ? "bg-danger text-white" : "bg-danger-soft text-danger"
      }`}
    >
      {disabled ? "Reactivar" : confirm ? "¿Seguro?" : "Desactivar"}
    </button>
  );
}
