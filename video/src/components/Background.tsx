import { AbsoluteFill } from "remotion";
import { GRAYS, PAPER } from "../theme";

/** Capa 1: blanco con un degradado muy suave a gris claro arriba y abajo. */
export const Background: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(to bottom, ${GRAYS.g200} 0%, ${PAPER} 22%, ${PAPER} 78%, ${GRAYS.g200} 100%)`,
      }}
    />
  );
};
