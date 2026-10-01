"use client";

/**
 * Sonidos cortos generados con Web Audio (sin archivos). Solo suenan si el
 * usuario los activa en Ajustes; por defecto, apagados.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, volume = 0.12, type: OscillatorType = "sine") {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export type SoundName = "pop" | "chime" | "fanfare" | "tap";

export function playSound(name: SoundName) {
  switch (name) {
    case "pop":
      tone(660, 0, 0.12, 0.1, "triangle");
      tone(990, 0.06, 0.14, 0.08, "triangle");
      break;
    case "tap":
      tone(520, 0, 0.08, 0.06, "sine");
      break;
    case "chime":
      [784, 988, 1175].forEach((f, i) => tone(f, i * 0.09, 0.35, 0.09));
      break;
    case "fanfare":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, i === 3 ? 0.6 : 0.2, 0.1, "triangle"));
      break;
  }
}
