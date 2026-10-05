import "./index.css";
import { Composition, Folder, type CalculateMetadataFunction } from "remotion";
import { calculateReelMetadata, Reel, warnMissing } from "./Reel";
import { characterCard, clips, defaultFx, objectCard, textCard } from "./scenes";
import {
  characterCompSchema,
  objectCompSchema,
  reelSchema,
  textCompSchema,
  type Card,
  type CharacterCard,
  type Fx,
  type ObjectCard,
  type TextCard,
} from "./schema";
import { CharacterBased } from "./templates/CharacterBased";
import { ObjectCentered } from "./templates/ObjectCentered";
import { TextCentered } from "./templates/TextCentered";
import { FPS, HEIGHT, WIDTH } from "./theme";

// Las composiciones de plantilla duran lo que diga su tarjeta.
const cardMetadata =
  <C extends Card>(): CalculateMetadataFunction<{ card: C; fx: Fx }> =>
  ({ props }) => {
    warnMissing([props.card]);
    return { durationInFrames: props.card.durationInFrames };
  };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Clips">
        {clips.map((clip) => (
          <Composition
            key={clip.id}
            id={clip.id}
            component={Reel}
            schema={reelSchema}
            defaultProps={clip.props}
            calculateMetadata={calculateReelMetadata}
            durationInFrames={510}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        ))}
      </Folder>
      <Folder name="Plantillas">
        <Composition
          id="ObjectCentered"
          component={ObjectCentered}
          schema={objectCompSchema}
          defaultProps={{ card: objectCard, fx: defaultFx }}
          calculateMetadata={cardMetadata<ObjectCard>()}
          durationInFrames={135}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="CharacterBased"
          component={CharacterBased}
          schema={characterCompSchema}
          defaultProps={{ card: characterCard, fx: defaultFx }}
          calculateMetadata={cardMetadata<CharacterCard>()}
          durationInFrames={135}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="TextCentered"
          component={TextCentered}
          schema={textCompSchema}
          defaultProps={{ card: textCard, fx: defaultFx }}
          calculateMetadata={cardMetadata<TextCard>()}
          durationInFrames={135}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      </Folder>
    </>
  );
};
