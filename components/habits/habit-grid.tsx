"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { formatDateStr } from "@/lib/dates";
import type { GridCell } from "@/lib/habits";
import { useToast } from "@/components/ui/toast";

const ROW_LABELS = ["L", "", "X", "", "V", "", "D"];

/** Cuadrícula estilo GitHub. Se puede tocar un día pasado para marcarlo o desmarcarlo. */
export function HabitGrid({ habitId, columns, color }: { habitId: string; columns: GridCell[][]; color: string }) {
  const router = useRouter();
  const toast = useToast();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  async function toggle(cell: GridCell) {
    if (cell.future) return;
    const current = overrides[cell.date] ?? cell.done;
    setOverrides((o) => ({ ...o, [cell.date]: !current }));
    try {
      await api(`/api/habits/${habitId}/toggle`, { body: { date: cell.date, done: !current } });
      router.refresh();
    } catch (err) {
      setOverrides((o) => ({ ...o, [cell.date]: current }));
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="flex gap-1">
      <div className="flex flex-col gap-1 pr-1">
        {ROW_LABELS.map((l, i) => (
          <span key={i} className="flex h-[var(--cell)] items-center text-[10px] text-muted" style={{ ["--cell" as string]: "16px" }}>
            {l}
          </span>
        ))}
      </div>
      <div className="flex flex-1 justify-between gap-1">
        {columns.map((col) => (
          <div key={col[0].date} className="flex flex-col gap-1">
            {col.map((cell) => {
              const done = overrides[cell.date] ?? cell.done;
              return (
                <button
                  key={cell.date}
                  type="button"
                  disabled={cell.future}
                  onClick={() => toggle(cell)}
                  title={formatDateStr(cell.date, "EEEE d MMM")}
                  aria-label={`${formatDateStr(cell.date, "EEEE d MMM")}: ${done ? "hecho" : "sin hacer"}`}
                  className="size-4 rounded-[4px] transition"
                  style={{
                    backgroundColor: cell.future ? "transparent" : done ? color : cell.scheduled ? "var(--surface-2)" : "transparent",
                    border: !done && !cell.future && !cell.scheduled ? "1px dashed var(--line)" : undefined,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
