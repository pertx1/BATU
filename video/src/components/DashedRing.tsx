import { evolvePath } from "@remotion/paths";
import { useId } from "react";
import { useCurrentFrame } from "remotion";
import { drawProgress } from "./DrawPath";

type Props = {
  size: number;
  delay: number;
  color: string;
  strokeWidth?: number;
  dash?: number;
  gap?: number;
  drawDuration?: number;
  /** Grados por frame una vez dibujado. */
  rotateSpeed?: number;
  style?: React.CSSProperties;
};

/**
 * Anillo de trazo discontinuo que se dibuja progresivamente (una máscara con
 * evolvePath revela los guiones) y después rota muy lento.
 */
export const DashedRing: React.FC<Props> = ({
  size,
  delay,
  color,
  strokeWidth = 3,
  dash = 14,
  gap = 12,
  drawDuration = 22,
  rotateSpeed = 0.25,
  style,
}) => {
  const frame = useCurrentFrame();
  const id = `ring-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const r = size / 2 - strokeWidth * 2;
  const c = size / 2;
  // Círculo como path (empieza arriba y gira en sentido horario).
  const d = `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r} Z`;
  const progress = drawProgress(frame, delay, drawDuration);
  const evo = evolvePath(progress, d);
  const rotation = Math.max(0, frame - delay - drawDuration) * rotateSpeed;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ ...style, transform: `${style?.transform ?? ""} rotate(${rotation}deg)`, overflow: "visible" }}
    >
      <defs>
        <mask id={id}>
          <path
            d={d}
            fill="none"
            stroke="#fff"
            strokeWidth={strokeWidth * 3}
            strokeDasharray={evo.strokeDasharray}
            strokeDashoffset={evo.strokeDashoffset}
          />
        </mask>
      </defs>
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        mask={`url(#${id})`}
      />
    </svg>
  );
};
