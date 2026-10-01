"use client";

import { useRef } from "react";
import { Mic, Square } from "lucide-react";
import { joinDictation, useDictation, type DictationError } from "@/lib/client/dictation";
import { useToast } from "@/components/ui/toast";

const MESSAGES: Record<DictationError, string> = {
  unsupported: "Aquí no se puede dictar desde la app. Usa el micrófono del teclado 🎙️",
  denied: "Sin permiso para el micrófono. Actívalo en Ajustes del iPhone o usa el micrófono del teclado.",
  failed: "No se pudo dictar. Prueba con el micrófono del teclado.",
};

/**
 * Botón de micrófono: lo que dices se va escribiendo en el campo. Si el
 * navegador no deja dictar, enfoca el campo para usar el dictado del teclado.
 */
export function MicButton({
  value,
  onChange,
  field,
  className = "",
}: {
  value: string;
  onChange: (text: string) => void;
  field?: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  className?: string;
}) {
  const toast = useToast();
  const base = useRef("");
  const { listening, start, stop } = useDictation(
    (spoken) => onChange(joinDictation(base.current, spoken)),
    (err) => {
      toast.error(MESSAGES[err]);
      field?.current?.focus();
    },
  );

  return (
    <button
      type="button"
      onClick={() => {
        if (listening) return stop();
        base.current = value;
        start();
      }}
      aria-label={listening ? "Dejar de dictar" : "Dictar con la voz"}
      aria-pressed={listening}
      className={`btn shrink-0 px-4 ${listening ? "btn-danger animate-pulse" : "btn-secondary"} ${className}`}
    >
      {listening ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
    </button>
  );
}
