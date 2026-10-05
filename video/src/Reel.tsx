import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from "remotion";
import { CardView } from "./CardView";
import { Captions } from "./components/Captions";
import { cardTransition } from "./components/CardTransition";
import { missingAssets, resolveAsset } from "./lib/assets";
import type { AudioTrack, Card, ReelProps } from "./schema";
import { FPS, TRANSITION_FRAMES } from "./theme";

/** Frame en el que empieza cada tarjeta dentro del reel (con solapes). */
export const cardStarts = (cards: Card[]) => {
  let at = 0;
  return cards.map((c) => {
    const start = at;
    at += c.durationInFrames - TRANSITION_FRAMES;
    return start;
  });
};

/**
 * Encadena las tarjetas con cortes rápidos (destello del acento + desenfoque),
 * con el audio del fragmento y subtítulos sincronizados por encima.
 */
export const Reel: React.FC<ReelProps> = ({
  cards,
  fx,
  audio,
  showCaptions,
  captions,
}) => {
  const starts = cardStarts(cards);
  // Acento de la tarjeta visible en cada instante (para resaltar subtítulos).
  const accentAt = (seconds: number) => {
    const f = seconds * FPS;
    let i = 0;
    while (i + 1 < cards.length && starts[i + 1] + TRANSITION_FRAMES / 2 <= f) {
      i++;
    }
    return cards[i].accent;
  };
  return (
    <AbsoluteFill>
      <Cards cards={cards} fx={fx} />
      {showCaptions ? <Captions captions={captions} offsetSeconds={audio.startSeconds} accentAt={accentAt} /> : null}
      <ReelAudio audio={audio} />
    </AbsoluteFill>
  );
};

/**
 * Audio del clip (un archivo ya cortado a su tramo, que suena desde el
 * segundo 0) con fundido de entrada y salida muy corto.
 */
const ReelAudio: React.FC<{ audio: AudioTrack }> = ({ audio }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const url = resolveAsset(audio.src);
  if (!url) {
    return null;
  }
  const fade = interpolate(
    frame,
    [0, 6, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <Audio src={url} volume={audio.volume * fade} />
  );
};

const Cards: React.FC<Pick<ReelProps, "cards" | "fx">> = ({ cards, fx }) => {
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

export const warnMissing = (cards: Card[], extra: string[] = []) => {
  const missing = missingAssets([...cards.flatMap(assetsOf), ...extra]);
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
  warnMissing(props.cards, [props.audio.src]);
  const total = props.cards.reduce((sum, c) => sum + c.durationInFrames, 0);
  return {
    durationInFrames: total - TRANSITION_FRAMES * (props.cards.length - 1),
  };
};
