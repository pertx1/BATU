import { CameraMotionBlur } from "@remotion/motion-blur";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CAMERA_FRAMES } from "../theme";

type Props = {
  children: React.ReactNode;
  motionBlur: boolean;
};

/**
 * Entrada de cámara: el contenedor entero empieza a escala 1.5, rotado ~8° y
 * desenfocado, y se asienta en 1 / 0° / nítido en CAMERA_FRAMES con ease-out.
 * Después sigue un zoom continuo de 1 a 1.04 hasta el final de la tarjeta.
 */
export const CameraIntro: React.FC<Props> = ({ children, motionBlur }) => {
  const frame = useCurrentFrame();
  const rig = <CameraRig>{children}</CameraRig>;
  if (!motionBlur) {
    return rig;
  }
  // Motion blur real solo durante la entrada. Fuera de ella, 1 muestra con
  // obturador de 360° = exactamente el frame actual (el árbol no se remonta).
  const inIntro = frame < CAMERA_FRAMES + 2;
  return (
    <CameraMotionBlur samples={inIntro ? 7 : 1} shutterAngle={inIntro ? 200 : 360}>
      {rig}
    </CameraMotionBlur>
  );
};

// Este componente lee el frame DENTRO de <CameraMotionBlur> (que congela cada
// muestra en un instante distinto); así cada muestra tiene su propia transformación.
const CameraRig: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const t = interpolate(frame, [0, CAMERA_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const introScale = interpolate(t, [0, 1], [1.5, 1]);
  const rotate = interpolate(t, [0, 1], [8, 0]);
  const blur = interpolate(t, [0, 1], [14, 0]);
  const drift = interpolate(frame, [CAMERA_FRAMES, durationInFrames], [1, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${introScale * drift}) rotate(${rotate}deg)`,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
