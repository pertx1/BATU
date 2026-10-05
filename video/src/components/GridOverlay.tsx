import { useId } from "react";
import { AbsoluteFill } from "remotion";

type Props = { type: "grid" | "dots" | "none" };

/** Capa 3: cuadrícula fina o trama de puntos casi invisible. */
export const GridOverlay: React.FC<Props> = ({ type }) => {
  const id = `pattern-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (type === "none") {
    return null;
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <defs>
          {type === "grid" ? (
            <pattern id={id} width={60} height={60} patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#000" strokeOpacity={0.055} strokeWidth={1.2} />
            </pattern>
          ) : (
            <pattern id={id} width={34} height={34} patternUnits="userSpaceOnUse">
              <circle cx={17} cy={17} r={1.9} fill="#000" fillOpacity={0.08} />
            </pattern>
          )}
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};
