# Reels "minimal reel edit" (Remotion)

Reels verticales 1080×1920 a 30 fps. Cada tarjeta dura 4-5 s y el reel las
encadena con un corte rápido (destello del color de acento + desenfoque).

## Uso

```bash
npm install
npm run dev                                   # abre Remotion Studio
npx remotion render Reel out/reel.mp4         # renderiza el reel (o: npm run render)
npx remotion render TextCentered out/c.mp4    # una plantilla suelta
npx remotion still CharacterBased out/b.png --frame=30
```

## Editar el contenido

Todo está en **`src/scenes.ts`**: textos, color de acento (`ACCENTS.azul`,
`verde`, `rojo`, `violeta` o cualquier hex), imágenes, duración, trama
(`grid` / `dots` / `none`) y opacidad de la sombra. El orden del array
`scenes` es el orden del reel. `defaultFx` controla el desfase de la cascada
(3-5 frames), el motion blur de la entrada y la aberración cromática.

También se puede editar todo desde el panel de props del Studio (schemas zod en
`src/schema.ts`).

## Assets (`public/`)

| Archivo | Uso | Estado |
| --- | --- | --- |
| `persona.png` | Plantilla B: persona recortada (PNG con alfa) | Incluido (fotograma del vídeo del podcast) |
| `sombra-ventana.jpg` | Sombra de persiana y hojas en B/N | Incluido (generado) |
| `objeto.png` | Plantilla A: objeto recortado (PNG con alfa o `.webm` con alfa) | **Falta** → placeholder SVG |
| `objeto-pequeno.png` | Plantilla C: objeto pequeño que entra girando | **Falta** → placeholder SVG |

Si un archivo no existe se dibuja un placeholder SVG y en la consola del render
aparece `[reel] Faltan estos archivos en public/ ...`. Los objetos funcionan
mejor con un PNG cuadrado (~1000 px) con fondo transparente; se muestran en
blanco y negro con contraste alto. Para un objeto girando de verdad, usa un
`.webm` con canal alfa (VP8/VP9) y ponlo en `objectSrc`.

## Estructura

- `src/components/`: `Background`, `WindowShadow`, `GridOverlay`,
  `CameraIntro`, `PopIn`, `Typewriter`, `DrawPath`, `DashedRing`, `WipeBar`,
  `DropShadowCopy`, `CardTransition`, `ChromaticAberration`, `Shapes`
  (círculo, banda diagonal, cinta curva, sello dentado, líneas a lápiz),
  `MediaObject`, `Placeholders` y `CardShell` (capas 1-3 + cámara).
- `src/templates/`: `ObjectCentered` (A), `CharacterBased` (B), `TextCentered` (C).
- `src/Reel.tsx`: encadena las tarjetas con `<TransitionSeries>`.
- `src/theme.ts`: fuentes (Poppins, Cormorant Garamond, Anton), paleta y tiempos.

Las animaciones usan solo `useCurrentFrame`, `interpolate` y `spring`: no hay
animaciones CSS ni `Math.random`.
