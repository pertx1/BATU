import { useId } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CAMERA_FRAMES } from "../theme";

type Props = {
  enabled: boolean;
  children: React.ReactNode;
};

/**
 * Aberración cromática muy sutil: separa los canales rojo y azul unos píxeles
 * (algo más durante la entrada de cámara). Desactivable con `enabled`.
 */
export const ChromaticAberration: React.FC<Props> = ({ enabled, children }) => {
  const frame = useCurrentFrame();
  const id = `ca-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (!enabled) {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }
  const shift = interpolate(frame, [0, CAMERA_FRAMES], [5, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter
            id={id}
            x="0"
            y="0"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={-shift} dy={0} result="r2" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feOffset in="b" dx={shift} dy={0} result="b2" />
            <feBlend in="r2" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b2" mode="screen" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
