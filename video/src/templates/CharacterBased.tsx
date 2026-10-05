import {
  AbsoluteFill,
  Img,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CardShell } from "../components/CardShell";
import { DropShadowCopy } from "../components/DropShadowCopy";
import { PlaceholderPerson } from "../components/Placeholders";
import { PopIn } from "../components/PopIn";
import { DiagonalBand, PencilLines } from "../components/Shapes";
import { Typewriter } from "../components/Typewriter";
import { resolveAsset } from "../lib/assets";
import { fitFontSize } from "../lib/fit";
import { at } from "../lib/timing";
import type { CharacterCard, Fx } from "../schema";
import { FONTS, GRAYS, INK, SOFT_SPRING } from "../theme";

// Rectángulo de color y persona (coordenadas de la tarjeta 1080x1920).
const RECT = { left: 150, top: 830, width: 780, height: 560, radius: 52 };
const PERSON_W = 1000;
/** Fracción de la altura de la imagen que sobresale por encima del rectángulo. */
const HEAD_FRACTION = 0.35;
/** Proporción alto/ancho de la imagen de la persona. */
const PERSON_RATIO = 996 / 924;

/**
 * Plantilla B: persona recortada sobre un rectángulo redondeado con degradado
 * del acento. La cabeza sobresale por arriba; el cuerpo queda recortado por
 * los lados y por abajo. Nombre + línea serif arriba; palabra pequeña,
 * palabra grande en bold itálica de acento y palabra pequeña abajo.
 */
export const CharacterBased: React.FC<{ card: CharacterCard; fx: Fx }> = ({
  card,
  fx,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = fx.stagger;
  const url = resolveAsset(card.personSrc);

  const personH = PERSON_W * PERSON_RATIO;
  const personTop = -personH * HEAD_FRACTION;
  const rectGrow = spring({ frame, fps, delay: at("shapes", s), config: SOFT_SPRING });
  // Respiración muy leve de la persona después de la entrada.
  const breathe = 1 + Math.sin(frame / 26) * 0.008;
  const sway = Math.sin(frame / 38) * 6;

  const person = url ? (
    <Img
      src={url}
      style={{
        width: PERSON_W,
        height: personH,
        display: "block",
        objectFit: "contain",
        objectPosition: "50% 0%",
      }}
    />
  ) : (
    <PlaceholderPerson width={PERSON_W} height={personH} />
  );

  return (
    <CardShell card={card} fx={fx}>
      {/* 4. Formas */}
      <DiagonalBand delay={at("shapes", s)} top={1040} thickness={300} angle={-15} color={GRAYS.g200} />
      <PencilLines delay={at("shapes", s) + 2} corners={["topRight", "bottomLeft"]} />
      <div
        style={{
          position: "absolute",
          left: RECT.left,
          top: RECT.top,
          width: RECT.width,
          height: RECT.height,
          borderRadius: RECT.radius,
          background: `linear-gradient(160deg, ${card.accent} 0%, color-mix(in srgb, ${card.accent} 50%, #ffffff) 100%)`,
          transform: `scaleY(${rectGrow})`,
          transformOrigin: "50% 100%",
        }}
      />

      {/* 5. Persona: recortada a los lados y abajo, libre por arriba */}
      <div
        style={{
          position: "absolute",
          left: RECT.left,
          top: RECT.top,
          width: RECT.width,
          height: RECT.height,
          clipPath: `inset(-${Math.ceil(-personTop) + 40}px 0 0 0 round 0 0 ${RECT.radius}px ${RECT.radius}px)`,
        }}
      >
        <PopIn
          delay={at("central", s)}
          style={{
            position: "absolute",
            left: (RECT.width - PERSON_W) / 2 + sway,
            top: personTop,
            transformOrigin: "50% 100%",
          }}
        >
          <div style={{ transform: `scale(${breathe})`, transformOrigin: "50% 100%" }}>
            <DropShadowCopy offsetX={24} offsetY={30} blur={18} opacity={0.38}>
              {person}
            </DropShadowCopy>
          </div>
        </PopIn>
      </div>

      {/* 6. Texto */}
      <AbsoluteFill style={{ alignItems: "center", top: 190 }}>
        <Typewriter
          text={card.name}
          delay={at("title", s)}
          caret
          style={{
            fontFamily: FONTS.sans,
            fontWeight: 800,
            fontSize: fitFontSize(card.name, 960, 92, 0.62),
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: INK,
          }}
        />
        <Typewriter
          text={card.tagline}
          delay={at("bar", s)}
          style={{
            marginTop: 6,
            fontFamily: FONTS.serif,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 50,
            lineHeight: 1.1,
            color: GRAYS.g700,
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ top: 1420, alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 22,
            width: 1000,
          }}
        >
          <Typewriter
            text={card.wordBefore}
            delay={at("keyword", s)}
            style={{ fontFamily: FONTS.serif, fontStyle: "italic", fontSize: 64, color: INK }}
          />
          <Typewriter
            text={card.bigWord}
            delay={at("keyword", s) + 2}
            style={{
              fontFamily: FONTS.sans,
              fontWeight: 800,
              fontStyle: "italic",
              fontSize: fitFontSize(card.bigWord, 620, 176, 0.72),
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: card.accent,
            }}
          />
          <Typewriter
            text={card.wordAfter}
            delay={at("paragraph", s)}
            style={{ fontFamily: FONTS.serif, fontStyle: "italic", fontSize: 64, color: INK }}
          />
        </div>
      </AbsoluteFill>
    </CardShell>
  );
};
