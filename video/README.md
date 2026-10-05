# Reels "minimal reel edit" (Remotion)

Reels verticales 1080×1920 a 30 fps. Cada tarjeta dura 4-5 s y el reel las
encadena con un corte rápido (destello del color de acento + desenfoque).

El reel de ejemplo usa el fragmento **1:36.8–2:29** del podcast con Luisito
Comunica (lo difícil que es pagar en China): lleva el audio original,
subtítulos sincronizados y 11 tarjetas que cambian con lo que se va diciendo.

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

### Audio y subtítulos

- `reelDefaults.audio` (en `scenes.ts`): archivo de `public/`, segundo del audio
  original en el que empieza el reel (`startSeconds`) y volumen. El reel dura
  lo que sumen las tarjetas (menos 6 frames por transición), así que para
  cambiar de fragmento ajusta `startSeconds` y las duraciones.
- `src/data/captions.ts`: frases con `start`/`end` en segundos desde el inicio
  del reel. La palabra que se está diciendo se resalta con el acento de la
  tarjeta visible. `showCaptions: false` los oculta.
- `objectSrc: "icon:<nombre>"` usa un objeto SVG integrado: `telefono`,
  `tarjeta`, `billetes`, `edificio`, `wifi`, `qr`, `mango`, `cajero`.

## Assets (`public/`)

| Archivo | Uso | Estado |
| --- | --- | --- |
| `persona.png`, `persona-cash.png`, `persona-apestoso.png` | Plantilla B: persona recortada (PNG con alfa) | Incluidos (fotogramas del podcast, 4:36, 2:14 y 2:25) |
| `podcast-audio.m4a` | Audio completo del podcast | Incluido |
| `sombra-ventana.jpg` | Sombra de persiana y hojas en B/N | Incluido (generado) |
| objetos (`objectSrc`) | Plantillas A y C | El ejemplo usa objetos SVG `icon:`; puedes poner un PNG/WebM con alfa |

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
