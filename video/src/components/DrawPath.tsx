import { evolvePath } from "@remotion/paths";
import { Easing, interpolate, useCurrentFrame } from "remotion";

type Props = {
  d: string;
  delay: number;
  durationInFrames: number;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
  strokeLinecap?: "round" | "butt" | "square";
};

/** Progreso 0→1 con ease-in-out entre `delay` y `delay + duration`. */
export const drawProgress = (frame: number, delay: number, duration: number) =>
  interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

/**
 * Trazo SVG que se dibuja de principio a fin (usa evolvePath()). Debe ir dentro
 * de un <svg> con el viewBox adecuado.
 */
export const DrawPath: React.FC<Props> = ({
  d,
  delay,
  durationInFrames,
  stroke,
  strokeWidth,
  opacity = 1,
  strokeLinecap = "round",
}) => {
  const frame = useCurrentFrame();
  const progress = drawProgress(frame, delay, durationInFrames);
  if (progress <= 0) {
    return null;
  }
  const { strokeDasharray, strokeDashoffset } = evolvePath(progress, d);
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeLinejoin="round"
      opacity={opacity}
      strokeDasharray={strokeDasharray}
      strokeDashoffset={strokeDashoffset}
    />
  );
};
