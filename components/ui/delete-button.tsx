"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";

/** Botón de borrar con confirmación en dos toques. */
export function DeleteButton({
  path,
  label,
  confirmLabel,
  done,
  redirectTo,
}: {
  path: string;
  label: string;
  confirmLabel: string;
  done: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      type="button"
      className={`btn w-full ${confirm ? "btn-danger" : "btn-secondary text-danger"}`}
      onClick={async () => {
        if (!confirm) {
          setConfirm(true);
          setTimeout(() => setConfirm(false), 4000);
          return;
        }
        try {
          await api(path, { method: "DELETE" });
          toast.show({ message: done });
          router.push(redirectTo);
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        }
      }}
    >
      <Trash2 size={20} /> {confirm ? confirmLabel : label}
    </button>
  );
}
