import { linearTiming, TransitionSeries } from "@remotion/transitions";
import type { CalculateMetadataFunction } from "remotion";
import { CardView } from "./CardView";
import { cardTransition } from "./components/CardTransition";
import { missingAssets } from "./lib/assets";
import type { Card, ReelProps } from "./schema";
import { TRANSITION_FRAMES } from "./theme";

/** Encadena las tarjetas con cortes rápidos (destello del acento + desenfoque). */
export const Reel: React.FC<ReelProps> = ({ cards, fx }) => {
  return (
    <TransitionSeries>
      {cards.flatMap((card, i) => {
        const sequence = (
          <TransitionSeries.Sequence
            key={`card-${i}`}
            name={`${i + 1}. ${card.template}`}
            durationInFrames={card.durationInFrames}
          >
            <CardView card={card} fx={fx} />
          </TransitionSeries.Sequence>
        );
        if (i === 0) {
          return [sequence];
        }
        return [
          <TransitionSeries.Transition
            key={`cut-${i}`}
            presentation={cardTransition({ color: card.accent })}
            timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
          />,
          sequence,
        ];
      })}
    </TransitionSeries>
  );
};

const assetsOf = (card: Card): string[] => {
  switch (card.template) {
    case "ObjectCentered":
      return [card.shadowImage, card.objectSrc];
    case "CharacterBased":
      return [card.shadowImage, card.personSrc];
    case "TextCentered":
      return [card.shadowImage, card.objectSrc];
  }
};

export const warnMissing = (cards: Card[]) => {
  const missing = missingAssets(cards.flatMap(assetsOf));
  if (missing.length > 0) {
    console.warn(
      `[reel] Faltan estos archivos en public/ (se usa un placeholder SVG): ${missing.join(", ")}`,
    );
  }
};

/** Duración total = suma de tarjetas − solapes de las transiciones. */
export const calculateReelMetadata: CalculateMetadataFunction<ReelProps> = ({
  props,
}) => {
  warnMissing(props.cards);
  const total = props.cards.reduce((sum, c) => sum + c.durationInFrames, 0);
  return {
    durationInFrames: total - TRANSITION_FRAMES * (props.cards.length - 1),
  };
};
