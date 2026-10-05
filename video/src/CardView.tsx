import type { Card, Fx } from "./schema";
import { CharacterBased } from "./templates/CharacterBased";
import { ObjectCentered } from "./templates/ObjectCentered";
import { TextCentered } from "./templates/TextCentered";

/** Pinta una tarjeta con la plantilla que indique `card.template`. */
export const CardView: React.FC<{ card: Card; fx: Fx }> = ({ card, fx }) => {
  switch (card.template) {
    case "ObjectCentered":
      return <ObjectCentered card={card} fx={fx} />;
    case "CharacterBased":
      return <CharacterBased card={card} fx={fx} />;
    case "TextCentered":
      return <TextCentered card={card} fx={fx} />;
  }
};
