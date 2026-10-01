"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useToast } from "@/components/ui/toast";

export function DeleteHabitButton({ habitId }: { habitId: string }) {
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
          await api(`/api/habits/${habitId}`, { method: "DELETE" });
          toast.show({ message: "Hábito eliminado" });
          router.push("/habitos");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        }
      }}
    >
      <Trash2 size={20} /> {confirm ? "Pulsa otra vez: se borra todo su historial" : "Eliminar hábito"}
    </button>
  );
}
