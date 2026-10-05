import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { POP_SPRING } from "../theme";

type Props = {
  delay: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  /** Configuración del spring; por defecto rebota hasta ~1.1. */
  config?: Partial<typeof POP_SPRING>;
};

/** Escala de 0 a 1 con spring y rebote visible (se pasa hasta ~1.1 y vuelve). */
export const PopIn: React.FC<Props> = ({ delay, children, style, config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({
    frame,
    fps,
    delay,
    config: { ...POP_SPRING, ...config },
  });
  return (
    <div style={{ ...style, transform: `${style?.transform ?? ""} scale(${scale})` }}>
      {children}
    </div>
  );
};
