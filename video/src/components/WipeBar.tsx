import { Easing, interpolate, useCurrentFrame } from "remotion";
import { INK } from "../theme";

type Props = {
  delay: number;
  children: React.ReactNode;
  color?: string;
  durationInFrames?: number;
  /** "left" = barre de izquierda a derecha. */
  from?: "left" | "right";
  style?: React.CSSProperties;
};

/** Barra sólida detrás de un texto que entra con un barrido lateral. */
export const WipeBar: React.FC<Props> = ({
  delay,
  children,
  color = INK,
  durationInFrames = 10,
  from = "left",
  style,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const hidden = (1 - p) * 100;
  return (
    <div style={{ position: "relative", display: "inline-block", ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: color,
          clipPath:
            from === "left"
              ? `inset(0 ${hidden}% 0 0)`
              : `inset(0 0 0 ${hidden}%)`,
        }}
      />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
};
