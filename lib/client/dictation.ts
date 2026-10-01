"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Lo mínimo de la Web Speech API que usamos (no está en los tipos de TS). */
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type DictationError = "unsupported" | "denied" | "failed";

/**
 * Dictado por voz. `onText` recibe todo lo dicho desde que se pulsó el
 * micrófono (se va completando mientras hablas); `onError` cuando no se puede.
 */
export function useDictation(onText: (text: string) => void, onError: (e: DictationError) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const handlers = useRef({ onText, onError });
  handlers.current = { onText, onError };

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return handlers.current.onError("unsupported");
    rec.current?.abort();
    const r = new Ctor();
    r.lang = "es-ES";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0]?.transcript ?? "";
      handlers.current.onText(text.trim());
    };
    r.onerror = (e) => {
      // "no-speech" y "aborted" no son fallos: simplemente no se dijo nada.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") handlers.current.onError("denied");
      else if (e.error !== "no-speech" && e.error !== "aborted") handlers.current.onError("failed");
    };
    r.onend = () => {
      if (rec.current === r) rec.current = null;
      setListening(false);
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      rec.current = null;
      handlers.current.onError("failed");
    }
  }, []);

  // Al cerrar la pantalla u hoja se deja de escuchar.
  useEffect(() => () => rec.current?.abort(), []);

  return { listening, start, stop, toggle: listening ? stop : start };
}

/** Une el texto que ya había con lo dictado. */
export function joinDictation(base: string, spoken: string): string {
  if (!spoken) return base;
  if (!base.trim()) return spoken.charAt(0).toUpperCase() + spoken.slice(1);
  return `${base.replace(/\s+$/, "")} ${spoken}`;
}
