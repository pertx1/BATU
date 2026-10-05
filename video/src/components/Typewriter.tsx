import { useCurrentFrame } from "remotion";

type Props = {
  text: string;
  delay: number;
  /** Frames por letra (1-2). */
  framesPerChar?: number;
  style?: React.CSSProperties;
  /** Cursor fino mientras se escribe. */
  caret?: boolean;
  caretColor?: string;
};

/**
 * Efecto máquina de escribir: una letra cada `framesPerChar` frames. El texto
 * pendiente se reserva invisible para que el bloque no cambie de tamaño ni se
 * recoloque mientras se escribe.
 */
export const Typewriter: React.FC<Props> = ({
  text,
  delay,
  framesPerChar = 1,
  style,
  caret = false,
  caretColor = "currentColor",
}) => {
  const frame = useCurrentFrame();
  const chars = Array.from(text);
  const shown = Math.max(
    0,
    Math.min(chars.length, Math.floor((frame - delay) / framesPerChar) + 1),
  );
  const typing = shown > 0 && shown < chars.length;
  return (
    <span style={style}>
      {chars.slice(0, shown).join("")}
      {caret && typing ? (
        <span
          style={{
            display: "inline-block",
            width: "0.06em",
            height: "0.9em",
            marginLeft: "0.04em",
            marginRight: "-0.1em",
            background: caretColor,
            verticalAlign: "-0.08em",
          }}
        />
      ) : null}
      <span style={{ opacity: 0 }}>{chars.slice(shown).join("")}</span>
    </span>
  );
};

/** Frame en el que termina de escribirse un texto. */
export const typewriterEnd = (text: string, delay: number, framesPerChar = 1) =>
  delay + Array.from(text).length * framesPerChar;
