import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CardShell } from "../components/CardShell";
import { DropShadowCopy } from "../components/DropShadowCopy";
import { MediaObject } from "../components/MediaObject";
import { CurvedRibbon, PencilLines } from "../components/Shapes";
import { Typewriter } from "../components/Typewriter";
import { fitFontSize } from "../lib/fit";
import { at } from "../lib/timing";
import type { Fx, TextCard } from "../schema";
import { FONTS, GRAYS, INK, SOFT_SPRING, WIDTH } from "../theme";

const WORD_Y = 960;
const OBJECT = 300;

/**
 * Plantilla C: el texto es el protagonista. Línea pequeña, palabra gigante
 * condensada en el acento y otra línea pequeña. Detrás, la misma palabra
 * enorme en contorno gris tenue recortada por los bordes. Un objeto pequeño
 * entra girando desde abajo y se queda cruzando la palabra. Cinta curva arriba.
 */
export const TextCentered: React.FC<{ card: TextCard; fx: Fx }> = ({ card, fx }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = fx.stagger;

  const giant = fitFontSize(card.bigWord, 980, 360, 0.47);
  const ghostIn = spring({ frame, fps, delay: at("shapes", s), config: SOFT_SPRING });
  const ghostX = interpolate(frame, [0, durationInFrames], [40, -40]);

  // Objeto: sube desde abajo girando y se queda cruzando la palabra.
  const enter = spring({
    frame,
    fps,
    delay: at("central", s),
    config: { damping: 14, stiffness: 90, mass: 0.9 },
  });
  const objY = interpolate(enter, [0, 1], [1250, 0]);
  const objRot = interpolate(enter, [0, 1], [-260, -18]) + Math.sin(frame / 30) * 5;
  const objFloat = Math.sin(frame / 22) * 10;

  return (
    <CardShell card={card} fx={fx}>
      {/* 4. Formas */}
      <CurvedRibbon delay={at("shapes", s)} color={GRAYS.g200} />
      <PencilLines delay={at("shapes", s) + 4} corners={["bottomLeft"]} />
      {/* Palabra fantasma: contorno gris tenue, más grande que la tarjeta */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: ghostIn,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.condensed,
            fontSize: giant * 2.3,
            lineHeight: 0.9,
            color: "transparent",
            WebkitTextStroke: `3px ${GRAYS.g300}`,
            whiteSpace: "nowrap",
            transform: `translateX(${ghostX}px) scale(${0.9 + ghostIn * 0.1})`,
            textTransform: "uppercase",
          }}
        >
          {card.bigWord}
        </div>
      </AbsoluteFill>

      {/* 6. Texto */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Typewriter
          text={card.lineTop}
          delay={at("title", s)}
          style={{
            fontFamily: FONTS.serif,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 70,
            lineHeight: 1,
            color: INK,
          }}
        />
        <Typewriter
          text={card.bigWord}
          delay={at("bar", s)}
          framesPerChar={2}
          style={{
            fontFamily: FONTS.condensed,
            fontSize: giant,
            lineHeight: 1.02,
            color: card.accent,
            textTransform: "uppercase",
            textShadow: "0 22px 40px rgba(0,0,0,0.18), 0 4px 10px rgba(0,0,0,0.12)",
            margin: "10px 0 6px",
          }}
        />
        <Typewriter
          text={card.lineBottom}
          delay={at("keyword", s)}
          style={{
            fontFamily: FONTS.sans,
            fontWeight: 700,
            fontSize: 42,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: INK,
          }}
        />
      </AbsoluteFill>
      {/* 5. Objeto pequeño: se queda cruzando la palabra por delante */}
      <div
        style={{
          position: "absolute",
          left: WIDTH * 0.7 - OBJECT / 2,
          top: WORD_Y - OBJECT / 2 + 40,
          transform: `translateY(${objY + objFloat}px) rotate(${objRot}deg)`,
        }}
      >
        <DropShadowCopy offsetX={20} offsetY={26} blur={14} opacity={0.35}>
          <MediaObject src={card.objectSrc} size={OBJECT} style={{ filter: "grayscale(1) contrast(1.3)" }} />
        </DropShadowCopy>
      </div>

    </CardShell>
  );
};
