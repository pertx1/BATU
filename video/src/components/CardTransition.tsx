import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from "@remotion/transitions";
import { AbsoluteFill, interpolate } from "remotion";

type CardTransitionProps = {
  /** Color del destello (el acento de la tarjeta que entra). */
  color: string;
};

/**
 * Corte rápido (~6 frames) entre tarjetas: la saliente se desenfoca y se
 * acerca, a mitad de la transición se corta a la entrante (que llega
 * desenfocada) y por encima hay un destello del color de acento.
 */
export const CardTransition: React.FC<
  TransitionPresentationComponentProps<CardTransitionProps>
> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const p = presentationProgress;

  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill
        style={{
          opacity: p < 0.5 ? 1 : 0,
          filter: `blur(${interpolate(p, [0, 0.5], [0, 26], { extrapolateRight: "clamp" })}px)`,
          transform: `scale(${1 + p * 0.12})`,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  const flash = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: p >= 0.5 ? 1 : 0,
          filter: `blur(${interpolate(p, [0.5, 1], [22, 0], { extrapolateLeft: "clamp" })}px)`,
        }}
      >
        {children}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundColor: passedProps.color,
          opacity: flash * 0.85,
          mixBlendMode: "normal",
        }}
      />
    </AbsoluteFill>
  );
};

export const cardTransition = (
  props: CardTransitionProps,
): TransitionPresentation<CardTransitionProps> => {
  return { component: CardTransition, props };
};
