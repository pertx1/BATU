import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CardShell } from "../components/CardShell";
import { DashedRing } from "../components/DashedRing";
import { DropShadowCopy } from "../components/DropShadowCopy";
import { MediaObject } from "../components/MediaObject";
import { PopIn } from "../components/PopIn";
import { PencilLines, Seal, SolidCircle } from "../components/Shapes";
import { Typewriter } from "../components/Typewriter";
import { WipeBar } from "../components/WipeBar";
import { fitFontSize } from "../lib/fit";
import { at } from "../lib/timing";
import type { Fx, ObjectCard } from "../schema";
import { FONTS, GRAYS, INK } from "../theme";

const CENTER_Y = 870;
const CIRCLE = 560;
const RING = 720;
const OBJECT = 560;

/**
 * Plantilla A: objeto recortado en B/N sobre un círculo negro con anillo
 * discontinuo. Título + barra negra con serif arriba; palabra clave y párrafo
 * de 3 líneas abajo.
 */
export const ObjectCentered: React.FC<{ card: ObjectCard; fx: Fx }> = ({
  card,
  fx,
}) => {
  const frame = useCurrentFrame();
  const s = fx.stagger;
  const lines = card.paragraph.split("\n").slice(0, 3);

  // Después de la entrada el objeto flota y gira despacio.
  const float = Math.sin(frame / 20) * 12;
  const spin = Math.sin(frame / 34) * 18;
  const tilt = Math.sin(frame / 47) * 4;

  return (
    <CardShell card={card} fx={fx}>
      {/* 4. Formas */}
      <PencilLines delay={at("shapes", s)} corners={["topLeft", "bottomRight"]} />
      <AbsoluteFill style={{ alignItems: "center", top: CENTER_Y - CIRCLE / 2 }}>
        <SolidCircle size={CIRCLE} delay={at("shapes", s)} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", top: CENTER_Y - RING / 2 }}>
        <DashedRing size={RING} delay={at("shapes", s) + 2} color={INK} strokeWidth={3} />
      </AbsoluteFill>
      {card.sealText ? (
        <Seal
          delay={at("shapes", s) + 6}
          text={card.sealText}
          size={180}
          color={card.accent}
          style={{ left: 790, top: CENTER_Y - RING / 2 - 30 }}
        />
      ) : null}

      {/* 5. Elemento central con sombra proyectada */}
      <AbsoluteFill style={{ alignItems: "center", top: CENTER_Y - OBJECT / 2 }}>
        <PopIn delay={at("central", s)}>
          <div
            style={{
              transform: `translateY(${float}px) perspective(1200px) rotateY(${spin}deg) rotate(${tilt}deg)`,
            }}
          >
            <DropShadowCopy offsetX={28} offsetY={36} blur={18} opacity={0.4}>
              <MediaObject
                src={card.objectSrc}
                size={OBJECT}
                style={{ filter: "grayscale(1) contrast(1.45) brightness(1.05)" }}
              />
            </DropShadowCopy>
          </div>
        </PopIn>
      </AbsoluteFill>

      {/* 6. Texto */}
      <AbsoluteFill style={{ alignItems: "center", top: 215 }}>
        <Typewriter
          text={card.title}
          delay={at("title", s)}
          caret
          style={{
            fontFamily: FONTS.sans,
            fontWeight: 800,
            fontSize: fitFontSize(card.title, 940, 96, 0.66),
            letterSpacing: "-0.02em",
            color: INK,
            lineHeight: 1.05,
            textTransform: "uppercase",
          }}
        />
        <WipeBar delay={at("bar", s)} style={{ marginTop: 18 }}>
          <div style={{ padding: "4px 30px 10px" }}>
            <Typewriter
              text={card.barText}
              delay={at("bar", s) + 4}
              style={{
                fontFamily: FONTS.serif,
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: 58,
                color: "#fff",
                lineHeight: 1.1,
              }}
            />
          </div>
        </WipeBar>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", top: 1250 }}>
        <Typewriter
          text={card.keyword}
          delay={at("keyword", s)}
          style={{
            fontFamily: FONTS.sans,
            fontWeight: 800,
            fontSize: fitFontSize(card.keyword, 940, 168, 0.7),
            letterSpacing: "-0.03em",
            lineHeight: 1,
            color: card.accent,
          }}
        />
        <div
          style={{
            marginTop: 26,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          {lines.map((line, i) => (
            <Typewriter
              key={i}
              text={line}
              delay={at("paragraph", s) + i}
              style={{
                fontFamily: FONTS.sans,
                fontWeight: 500,
                fontSize: 36,
                lineHeight: 1.35,
                color: GRAYS.g700,
              }}
            />
          ))}
        </div>
      </AbsoluteFill>
    </CardShell>
  );
};
