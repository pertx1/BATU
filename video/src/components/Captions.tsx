import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Caption } from "../schema";
import { FONTS, INK } from "../theme";

type Props = {
  captions: Caption[];
  /** Color de resaltado de la palabra actual en cada instante (segundos). */
  accentAt: (seconds: number) => string;
};

/**
 * Subtítulos sincronizados con el audio. Cada frase entra con un pequeño pop y
 * la palabra que se está diciendo se resalta en el color de acento. Los tiempos
 * por palabra se reparten según la longitud de cada palabra dentro de la frase.
 */
export const Captions: React.FC<Props> = ({ captions, accentAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const current = captions.find((c) => t >= c.start && t < c.end);
  if (!current) {
    return null;
  }

  const words = current.text.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  const span = current.end - current.start;
  let acc = current.start;
  const windows = weights.map((w) => {
    const from = acc;
    acc += (w / total) * span;
    return [from, acc] as const;
  });

  const local = frame - current.start * fps;
  const appear = interpolate(local, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const accent = accentAt(t);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 170 }}>
      <div
        style={{
          maxWidth: 900,
          padding: "14px 30px 18px",
          borderRadius: 26,
          background: "rgba(255,255,255,0.88)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          textAlign: "center",
          fontFamily: FONTS.sans,
          fontWeight: 700,
          fontSize: 44,
          whiteSpace: "nowrap",
          lineHeight: 1.22,
          color: INK,
          opacity: appear,
          transform: `translateY(${(1 - appear) * 16}px) scale(${0.96 + appear * 0.04})`,
        }}
      >
        {words.map((w, i) => {
          const [from, to] = windows[i];
          const active = t >= from && t < to;
          const said = t >= to;
          return (
            <span
              key={i}
              style={{
                color: active ? accent : INK,
                opacity: said || active ? 1 : 0.55,
              }}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
