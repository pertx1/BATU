import { AbsoluteFill } from "remotion";
import type { Card, Fx } from "../schema";
import { PAPER } from "../theme";
import { Background } from "./Background";
import { CameraIntro } from "./CameraIntro";
import { ChromaticAberration } from "./ChromaticAberration";
import { GridOverlay } from "./GridOverlay";
import { WindowShadow } from "./WindowShadow";

type Props = {
  card: Card;
  fx: Fx;
  children: React.ReactNode;
};

/**
 * Estructura común de todas las tarjetas: fondo (1), sombra de ventana (2) y
 * trama (3) dentro de la cámara, con la plantilla encima (capas 4-6).
 */
export const CardShell: React.FC<Props> = ({ card, fx, children }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, overflow: "hidden" }}>
      <ChromaticAberration enabled={fx.chromaticAberration}>
        <CameraIntro motionBlur={fx.motionBlur}>
          <Background />
          <WindowShadow src={card.shadowImage} opacity={card.shadowOpacity} />
          <GridOverlay type={card.overlay} />
          <AbsoluteFill>{children}</AbsoluteFill>
        </CameraIntro>
      </ChromaticAberration>
    </AbsoluteFill>
  );
};
