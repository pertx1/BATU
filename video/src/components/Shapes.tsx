import { makeStar } from "@remotion/shapes";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FONTS, GRAYS, HEIGHT, INK, POP_SPRING, SOFT_SPRING, WIDTH } from "../theme";
import { DrawPath } from "./DrawPath";

/** Círculo sólido que crece desde 0. */
export const SolidCircle: React.FC<{
  size: number;
  delay: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ size, delay, color = INK, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay, config: SOFT_SPRING });
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        transform: `scale(${s})`,
        ...style,
      }}
    />
  );
};

/** Banda diagonal gris que atraviesa la tarjeta (entra con un barrido). */
export const DiagonalBand: React.FC<{
  delay: number;
  top: number;
  thickness?: number;
  angle?: number;
  color?: string;
}> = ({ delay, top, thickness = 280, angle = -16, color = GRAYS.g100 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: -WIDTH * 0.4,
          top,
          width: WIDTH * 1.8,
          height: thickness,
          background: color,
          transform: `rotate(${angle}deg)`,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Cinta curva gris gruesa que se dibuja de un lado a otro. */
export const CurvedRibbon: React.FC<{
  delay: number;
  d?: string;
  thickness?: number;
  color?: string;
}> = ({
  delay,
  d = `M -120 520 C 220 180, 620 620, 1200 230`,
  thickness = 110,
  color = GRAYS.g100,
}) => {
  return (
    <AbsoluteFill>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        <DrawPath
          d={d}
          delay={delay}
          durationInFrames={20}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="butt"
        />
      </svg>
    </AbsoluteFill>
  );
};

/** Sello dentado con un texto pequeño; aparece con pop y gira despacio. */
export const Seal: React.FC<{
  delay: number;
  text: string;
  size?: number;
  color?: string;
  textColor?: string;
  style?: React.CSSProperties;
}> = ({ delay, text, size = 190, color = INK, textColor = "#fff", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, delay, config: POP_SPRING });
  const rotation = -12 + Math.max(0, frame - delay) * 0.18;
  const { path } = makeStar({
    points: 22,
    outerRadius: size / 2,
    innerRadius: size / 2 - 11,
    edgeRoundness: 0.4,
  });
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        transform: `scale(${s}) rotate(${rotation}deg)`,
        ...style,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute" }}>
        <path d={path} fill={color} />
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 24} fill="none" stroke={textColor} strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="3 5" />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: textColor,
          fontFamily: FONTS.serif,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: size * 0.17,
          lineHeight: 1,
          padding: size * 0.22,
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Curvas "a lápiz" para las esquinas (coordenadas de la tarjeta 1080x1920).
const CORNER_PATHS = {
  topLeft: [
    "M 40 330 C 70 210, 150 120, 300 70",
    "M 60 360 C 95 235, 175 150, 330 95",
  ],
  topRight: [
    "M 760 50 C 900 80, 1000 160, 1050 300",
    "M 780 80 C 905 110, 990 190, 1035 320",
  ],
  bottomLeft: [
    "M 30 1560 C 60 1700, 150 1810, 320 1870",
    "M 55 1540 C 90 1680, 175 1785, 340 1845",
  ],
  bottomRight: [
    "M 1050 1580 C 1010 1720, 920 1820, 760 1880",
    "M 1025 1560 C 990 1700, 900 1795, 740 1855",
  ],
};

export type Corner = keyof typeof CORNER_PATHS;

/**
 * Líneas curvas muy finas tipo lápiz en las esquinas: cada una son dos trazos
 * casi paralelos (como un boceto) que se dibujan de principio a fin.
 */
export const PencilLines: React.FC<{
  delay: number;
  corners: Corner[];
  color?: string;
}> = ({ delay, corners, color = INK }) => {
  return (
    <AbsoluteFill>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
        {corners.map((corner, ci) =>
          CORNER_PATHS[corner].map((d, i) => (
            <DrawPath
              key={`${corner}-${i}`}
              d={d}
              delay={delay + ci * 3 + i * 4}
              durationInFrames={20}
              stroke={color}
              strokeWidth={i === 0 ? 2 : 1.2}
              opacity={i === 0 ? 0.55 : 0.3}
            />
          )),
        )}
      </svg>
    </AbsoluteFill>
  );
};
