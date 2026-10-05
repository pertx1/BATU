import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { resolveAsset } from "../lib/assets";

type Props = {
  src: string;
  /** 0.15-0.25 recomendado. */
  opacity: number;
};

const SHADOW_W = 1600;
const SHADOW_H = 2600;

/**
 * Capa 2: sombra de ventana/persiana/hojas en B/N con mix-blend-mode multiply,
 * deslizándose muy despacio durante toda la tarjeta.
 */
export const WindowShadow: React.FC<Props> = ({ src, opacity }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const url = resolveAsset(src);

  const x = interpolate(frame, [0, durationInFrames], [-300, -180]);
  const y = interpolate(frame, [0, durationInFrames], [-380, -300]);
  const rotate = interpolate(frame, [0, durationInFrames], [-4, -2.5]);

  const style: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: SHADOW_W,
    height: SHADOW_H,
    transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)`,
    filter: "grayscale(1)",
  };

  return (
    <AbsoluteFill style={{ mixBlendMode: "multiply", opacity }}>
      {url ? (
        <Img src={url} style={{ ...style, objectFit: "cover" }} />
      ) : (
        <BlindsPlaceholder style={style} />
      )}
    </AbsoluteFill>
  );
};

/** Placeholder si falta la imagen: lamas de persiana desenfocadas en SVG. */
const BlindsPlaceholder: React.FC<{ style: React.CSSProperties }> = ({
  style,
}) => {
  const slats = new Array(36).fill(true);
  return (
    <svg
      viewBox={`0 0 ${SHADOW_W} ${SHADOW_H}`}
      style={{ ...style, filter: "blur(10px)" }}
    >
      <rect width={SHADOW_W} height={SHADOW_H} fill="#777" />
      <polygon points="160,260 1500,60 1560,2050 220,2420" fill="#fff" />
      {slats.map((_, i) => (
        <rect
          key={i}
          x={0}
          y={200 + i * 62}
          width={SHADOW_W}
          height={28}
          fill="#777"
          transform={`skewY(-8)`}
        />
      ))}
    </svg>
  );
};
