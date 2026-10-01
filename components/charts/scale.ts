/** Marcas "redondas" del eje Y desde 0 hasta cubrir `max` (3–5 marcas). */
export function niceTicks(max: number, min = 0, integer = true): number[] {
  const span = Math.max(max - min, integer ? 1 : 1e-9);
  const rough = span / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  let step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= 4) ?? 10 * mag;
  if (integer) step = Math.max(1, Math.round(step));
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v < max + step * 0.999; v += step) ticks.push(Number(v.toFixed(6)));
  if (ticks.length < 2) ticks.push(start + step);
  return ticks;
}
