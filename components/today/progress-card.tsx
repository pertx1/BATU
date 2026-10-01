export function ProgressCard({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const finished = total > 0 && done === total;
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">
          {total === 0 ? "Día despejado" : finished ? "¡Día completado! 🎉" : `${done} de ${total} completado`}
        </p>
        <p className="text-2xl font-bold tabular-nums text-accent">{pct}%</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${finished ? "bg-success" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
