import type { Expression } from "@/lib/antola/messages";
import type { Stage } from "@/lib/antola/levels";

/**
 * Antola, la hormiga. SVG puro (sin estado): sirve en el servidor y en el
 * cliente. Los colores son fijos y se ven bien en modo claro y oscuro. Las
 * animaciones están en globals.css (clases antola-*) y se apagan con
 * «reducir movimiento».
 */

const C = {
  body: "#F2894E",
  bodyDark: "#D9663A",
  line: "#5B2A14",
  belly: "#FBC49A",
  cheek: "#FF7A8A",
  eye: "#2B160C",
};

const RAISED: Expression[] = ["celebrando", "saludando", "pensativa"];

function Eyes({ expression }: { expression: Expression }) {
  const L = 76;
  const R = 118;
  const Y = 86;
  const stroke = { stroke: C.line, strokeLinecap: "round" as const, fill: "none" };
  const open = (dx = 0, dy = 0) => (
    <g className="antola-eyes">
      <ellipse cx={L} cy={Y} rx="11" ry="13" fill="#fff" stroke={C.line} strokeWidth="2.5" />
      <ellipse cx={R} cy={Y} rx="11" ry="13" fill="#fff" stroke={C.line} strokeWidth="2.5" />
      <circle cx={L + 2 + dx} cy={Y + 2 + dy} r="6.5" fill={C.eye} />
      <circle cx={R + 2 + dx} cy={Y + 2 + dy} r="6.5" fill={C.eye} />
      <circle cx={L + 4.5 + dx} cy={Y - 1 + dy} r="2.2" fill="#fff" />
      <circle cx={R + 4.5 + dx} cy={Y - 1 + dy} r="2.2" fill="#fff" />
    </g>
  );
  switch (expression) {
    case "celebrando":
      return (
        <g {...stroke} strokeWidth="4">
          <path d={`M${L - 10} ${Y + 4} Q${L} ${Y - 9} ${L + 10} ${Y + 4}`} />
          <path d={`M${R - 10} ${Y + 4} Q${R} ${Y - 9} ${R + 10} ${Y + 4}`} />
        </g>
      );
    case "orgullosa":
      return (
        <g {...stroke} strokeWidth="4">
          <path d={`M${L - 10} ${Y} Q${L} ${Y + 9} ${L + 10} ${Y}`} />
          <path d={`M${R - 10} ${Y} Q${R} ${Y + 9} ${R + 10} ${Y}`} />
          <path d={`M${L - 11} ${Y - 14} l14 3 M${R + 11} ${Y - 14} l-14 3`} strokeWidth="3.5" />
        </g>
      );
    case "pensativa":
      return open(-3, -5);
    case "preocupada":
      return (
        <>
          {open(0, 2)}
          <path d={`M${L - 11} ${Y - 16} l14 -5 M${R + 11} ${Y - 16} l-14 -5`} {...stroke} strokeWidth="3.5" />
        </>
      );
    case "dormida":
      return (
        <g {...stroke} strokeWidth="3.5">
          <path d={`M${L - 10} ${Y + 2} Q${L} ${Y + 8} ${L + 10} ${Y + 2}`} />
          <path d={`M${R - 10} ${Y + 2} Q${R} ${Y + 8} ${R + 10} ${Y + 2}`} />
        </g>
      );
    default:
      return open();
  }
}

function Mouth({ expression }: { expression: Expression }) {
  const s = { stroke: C.line, strokeWidth: 3.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (expression) {
    case "celebrando":
    case "saludando":
      return (
        <>
          <path d="M84 108 Q97 128 110 108 Z" fill="#8E2C2C" {...s} />
          <path d="M90 116 Q97 121 104 116" fill="#FF8C8C" />
        </>
      );
    case "orgullosa":
      return <path d="M86 109 Q100 118 110 106" fill="none" {...s} />;
    case "pensativa":
      return <path d="M92 112 L104 110" fill="none" {...s} />;
    case "preocupada":
      return <path d="M86 114 q4 -5 8 0 q4 5 8 0 q4 -5 8 0" fill="none" {...s} />;
    case "dormida":
      return <ellipse cx="97" cy="112" rx="4" ry="3" fill="#8E2C2C" {...s} />;
    default:
      return <path d="M86 107 Q97 120 108 107" fill="none" {...s} />;
  }
}

function Extras({ expression }: { expression: Expression }) {
  switch (expression) {
    case "preocupada":
      return <path d="M146 66 q6 9 0 13 q-6 -4 0 -13Z" fill="#7EC8F5" stroke="#3A87B8" strokeWidth="2" />;
    case "dormida":
      return (
        <g className="antola-zzz" fill="#8A8AE8" fontFamily="system-ui, sans-serif" fontWeight="800">
          <text x="140" y="44" fontSize="20">z</text>
          <text x="156" y="28" fontSize="14">z</text>
        </g>
      );
    case "pensativa":
      return (
        <g fill="#C7C7D9">
          <circle cx="150" cy="50" r="4" />
          <circle cx="160" cy="38" r="6" />
          <circle cx="174" cy="24" r="9" />
        </g>
      );
    case "celebrando":
      return (
        <g className="antola-sparkles">
          <path d="M30 40 l4 8 l8 -2 l-6 6 l4 8 l-8 -4 l-6 6 l1 -8 l-8 -4 l9 -1Z" fill="#FFD23F" />
          <path d="M166 30 l3 6 l6 -1 l-4 4 l3 6 l-6 -3 l-4 4 l1 -6 l-6 -3 l7 -1Z" fill="#7D7AFF" />
          <circle cx="178" cy="70" r="4" fill="#34C759" />
          <circle cx="20" cy="90" r="3.5" fill="#FF6B8B" />
        </g>
      );
    default:
      return null;
  }
}

function Arm({ d, hand }: { d: string; hand: [number, number] }) {
  return (
    <>
      <path d={d} fill="none" stroke={C.line} strokeWidth="9" strokeLinecap="round" />
      <path d={d} fill="none" stroke={C.body} strokeWidth="5" strokeLinecap="round" />
      <circle cx={hand[0]} cy={hand[1]} r="6" fill={C.body} stroke={C.line} strokeWidth="2.5" />
    </>
  );
}

function Arms({ expression }: { expression: Expression }) {
  switch (expression) {
    case "saludando":
      return (
        <>
          <Arm d="M82 146 Q70 156 66 168" hand={[66, 168]} />
          <g className="antola-wave">
            <Arm d="M118 140 Q150 134 160 104" hand={[160, 104]} />
          </g>
        </>
      );
    case "celebrando":
      return (
        <>
          <Arm d="M76 140 Q44 134 34 104" hand={[34, 104]} />
          <Arm d="M118 140 Q150 134 160 104" hand={[160, 104]} />
        </>
      );
    case "orgullosa":
      return (
        <>
          <Arm d="M82 146 Q66 152 76 164" hand={[76, 164]} />
          <Arm d="M114 146 Q130 152 120 164" hand={[120, 164]} />
        </>
      );
    case "pensativa":
      return (
        <>
          <Arm d="M82 146 Q70 156 66 168" hand={[66, 168]} />
          <Arm d="M114 148 Q136 150 122 134" hand={[120, 134]} />
        </>
      );
    default:
      return (
        <>
          <Arm d="M82 146 Q70 156 66 168" hand={[66, 168]} />
          <Arm d="M114 146 Q126 156 130 168" hand={[130, 168]} />
        </>
      );
  }
}

// ─── Fases ──────────────────────────────────────────────────────────────────

const Backpack = () => (
  <g>
    <rect x="118" y="124" width="34" height="40" rx="10" fill="#34A853" stroke={C.line} strokeWidth="3" />
    <rect x="124" y="140" width="22" height="14" rx="5" fill="#2A8A43" stroke={C.line} strokeWidth="2" />
    <path d="M118 132 Q104 146 110 166" fill="none" stroke="#2A8A43" strokeWidth="5" strokeLinecap="round" />
  </g>
);

const Helmet = () => (
  <g>
    <path d="M44 66 Q48 18 98 16 Q148 18 152 66 Z" fill="#FFC531" stroke={C.line} strokeWidth="3.5" strokeLinejoin="round" />
    <rect x="36" y="60" width="124" height="12" rx="6" fill="#FFB000" stroke={C.line} strokeWidth="3.5" />
    <path d="M98 18 V60" stroke="#E8A400" strokeWidth="5" />
    <circle cx="98" cy="38" r="9" fill="#FFF6C9" stroke={C.line} strokeWidth="3" />
  </g>
);

const Crown = () => (
  <g>
    <path d="M60 46 L66 14 L82 32 L98 6 L114 32 L130 14 L136 46 Z" fill="#FFD23F" stroke={C.line} strokeWidth="3.5" strokeLinejoin="round" />
    <rect x="58" y="42" width="80" height="10" rx="5" fill="#F5B700" stroke={C.line} strokeWidth="3" />
    <circle cx="98" cy="28" r="5" fill="#FF4D6D" stroke={C.line} strokeWidth="2" />
    <circle cx="72" cy="34" r="3.5" fill="#5856D6" />
    <circle cx="124" cy="34" r="3.5" fill="#34C759" />
  </g>
);

// ─── Accesorios de la tienda (capas) ────────────────────────────────────────

const ACCESSORIES: Record<string, { layer: "back" | "front"; el: React.ReactNode }> = {
  capa: {
    layer: "back",
    el: <path d="M72 128 Q50 170 58 206 L140 206 Q148 170 122 128 Z" fill="#E53950" stroke={C.line} strokeWidth="3" strokeLinejoin="round" />,
  },
  gafas: {
    layer: "front",
    el: (
      <g fill="none" stroke="#1C1C1E" strokeWidth="4">
        <circle cx="76" cy="86" r="16" />
        <circle cx="118" cy="86" r="16" />
        <path d="M92 84 Q97 80 102 84" />
      </g>
    ),
  },
  "gafas-sol": {
    layer: "front",
    el: (
      <g stroke="#1C1C1E" strokeWidth="3.5">
        <path d="M58 78 h36 v8 q0 14 -18 14 q-18 0 -18 -14Z" fill="#1C1C1E" />
        <path d="M100 78 h36 v8 q0 14 -18 14 q-18 0 -18 -14Z" fill="#1C1C1E" />
        <path d="M94 82 h6" fill="none" />
        <path d="M64 84 l10 -4" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" />
      </g>
    ),
  },
  gorro: {
    layer: "front",
    el: (
      <g>
        <path d="M48 62 Q52 20 97 20 Q142 20 146 62 Z" fill="#FF6B6B" stroke={C.line} strokeWidth="3.5" />
        <rect x="44" y="56" width="106" height="14" rx="7" fill="#fff" stroke={C.line} strokeWidth="3" />
        <circle cx="97" cy="16" r="10" fill="#fff" stroke={C.line} strokeWidth="3" />
      </g>
    ),
  },
  gorra: {
    layer: "front",
    el: (
      <g>
        <path d="M50 60 Q52 22 97 22 Q142 22 146 60 Z" fill="#2F80ED" stroke={C.line} strokeWidth="3.5" />
        <path d="M110 58 Q150 52 172 64 Q150 70 110 66Z" fill="#1F5FB8" stroke={C.line} strokeWidth="3" strokeLinejoin="round" />
        <circle cx="97" cy="24" r="4" fill="#1F5FB8" stroke={C.line} strokeWidth="2" />
      </g>
    ),
  },
  lazo: {
    layer: "front",
    el: (
      <g stroke={C.line} strokeWidth="3" strokeLinejoin="round">
        <path d="M120 42 L100 28 L102 54 Z" fill="#FF5FA2" />
        <path d="M120 42 L140 28 L138 54 Z" fill="#FF5FA2" />
        <circle cx="120" cy="42" r="6" fill="#E0428A" />
      </g>
    ),
  },
  flor: {
    layer: "front",
    el: (
      <g stroke={C.line} strokeWidth="2">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="124" cy="36" rx="7" ry="11" fill="#FFF" transform={`rotate(${a} 124 46)`} />
        ))}
        <circle cx="124" cy="46" r="6" fill="#FFD23F" />
      </g>
    ),
  },
  auriculares: {
    layer: "front",
    el: (
      <g stroke={C.line} strokeWidth="3">
        <path d="M40 92 Q40 26 97 26 Q154 26 154 92" fill="none" stroke="#333" strokeWidth="8" strokeLinecap="round" />
        <rect x="30" y="80" width="18" height="30" rx="8" fill="#7D7AFF" />
        <rect x="146" y="80" width="18" height="30" rx="8" fill="#7D7AFF" />
      </g>
    ),
  },
  "corona-flores": {
    layer: "front",
    el: (
      <g stroke={C.line} strokeWidth="2">
        <path d="M46 56 Q97 30 148 56" fill="none" stroke="#4CAF50" strokeWidth="5" />
        {[
          [52, 52, "#FF6B8B"],
          [70, 43, "#FFD23F"],
          [88, 38, "#7D7AFF"],
          [106, 38, "#FF6B8B"],
          [124, 43, "#FFD23F"],
          [142, 52, "#7D7AFF"],
        ].map(([x, y, c]) => (
          <circle key={`${x}`} cx={x as number} cy={y as number} r="7" fill={c as string} />
        ))}
      </g>
    ),
  },
  chistera: {
    layer: "front",
    el: (
      <g stroke={C.line} strokeWidth="3.5" strokeLinejoin="round">
        <rect x="64" y="-6" width="66" height="54" rx="4" fill="#2C2C2E" />
        <rect x="64" y="32" width="66" height="10" fill="#E53950" strokeWidth="0" />
        <rect x="46" y="44" width="102" height="12" rx="6" fill="#2C2C2E" />
      </g>
    ),
  },
  bufanda: {
    layer: "front",
    el: (
      <g stroke={C.line} strokeWidth="3">
        <path d="M70 126 Q98 140 126 126 L128 138 Q98 152 68 138 Z" fill="#5856D6" />
        <path d="M108 140 l6 30 l12 -4 l-6 -28Z" fill="#7D7AFF" />
      </g>
    ),
  },
  pajarita: {
    layer: "front",
    el: (
      <g stroke={C.line} strokeWidth="3" strokeLinejoin="round">
        <path d="M97 134 L78 124 L78 144 Z" fill="#E53950" />
        <path d="M97 134 L116 124 L116 144 Z" fill="#E53950" />
        <circle cx="97" cy="134" r="5" fill="#B71C33" />
      </g>
    ),
  },
};

const HEAD_ITEMS = new Set(["gorro", "gorra", "lazo", "flor", "auriculares", "corona-flores", "chistera"]);

export function Antola({
  expression = "feliz",
  stage = "pequena",
  accessories = [],
  size = 120,
  animated = true,
  className = "",
  title = "Antola",
}: {
  expression?: Expression;
  stage?: Stage;
  accessories?: string[];
  size?: number;
  animated?: boolean;
  className?: string;
  title?: string;
}) {
  const scale = stage === "pequena" ? 0.86 : 1;
  const raised = RAISED.includes(expression);
  const back = accessories.filter((a) => ACCESSORIES[a]?.layer === "back");
  const front = accessories.filter((a) => ACCESSORIES[a]?.layer === "front");
  // Un sombrero de la tienda sustituye al casco o la corona de la fase.
  const headCovered = accessories.some((a) => HEAD_ITEMS.has(a));
  const motion =
    animated && (expression === "celebrando" ? "antola-hop" : expression === "dormida" ? "antola-breathe" : expression === "preocupada" ? "" : "antola-bounce");

  return (
    <svg
      viewBox="0 -10 200 230"
      width={size}
      height={size * 1.15}
      role="img"
      aria-label={title}
      className={`antola ${animated ? "antola-animated" : ""} ${className}`}
    >
      <g className={motion || undefined}>
        <g transform={`translate(${100 - 100 * scale} ${220 - 220 * scale}) scale(${scale})`}>
          <ellipse cx="102" cy="208" rx="62" ry="8" fill="#000" opacity=".12" />
          {back.map((a) => (
            <g key={a}>{ACCESSORIES[a].el}</g>
          ))}
          {stage === "exploradora" ? <Backpack /> : null}
          {/* abdomen */}
          <g transform="rotate(-18 146 176)">
            <ellipse cx="146" cy="176" rx="36" ry="27" fill={C.body} stroke={C.line} strokeWidth="3.5" />
            <path d="M132 152 Q124 176 132 200 M150 150 Q142 176 150 202" fill="none" stroke={C.bodyDark} strokeWidth="5" strokeLinecap="round" />
          </g>
          {/* patas */}
          <g stroke={C.line} strokeWidth="3" fill={C.body}>
            {[
              ["M140 196 L146 208", C.bodyDark, 8, 4],
              ["M162 188 L172 202", C.bodyDark, 8, 4],
              ["M86 176 L80 200", C.body, 9, 5],
              ["M108 176 L114 200", C.body, 9, 5],
            ].map(([d, color, outer, inner]) => (
              <g key={d as string}>
                <path d={d as string} strokeWidth={outer as number} strokeLinecap="round" />
                <path d={d as string} stroke={color as string} strokeWidth={inner as number} strokeLinecap="round" />
              </g>
            ))}
            <ellipse cx="76" cy="202" rx="11" ry="6" />
            <ellipse cx="118" cy="202" rx="11" ry="6" />
          </g>
          {/* tórax */}
          <ellipse cx="97" cy="152" rx="27" ry="28" fill={C.body} stroke={C.line} strokeWidth="3.5" />
          <ellipse cx="97" cy="158" rx="15" ry="16" fill={C.belly} />
          {raised ? null : <Arms expression={expression} />}
          {/* cabeza */}
          <g className="antola-head">
            {[
              ["M78 40 Q52 22 44 8", 44],
              ["M116 40 Q142 22 150 8", 150],
            ].map(([d, x]) => (
              <g key={x as number} className="antola-antenna">
                <path d={d as string} fill="none" stroke={C.line} strokeWidth="4" strokeLinecap="round" />
                <circle cx={x as number} cy="8" r="7" fill={C.bodyDark} stroke={C.line} strokeWidth="3" />
              </g>
            ))}
            <ellipse cx="97" cy="88" rx="58" ry="52" fill={C.body} stroke={C.line} strokeWidth="3.5" />
            <ellipse cx="80" cy="56" rx="16" ry="8" fill="#fff" opacity=".35" transform="rotate(-20 80 56)" />
            <ellipse cx="62" cy="106" rx="9" ry="6" fill={C.cheek} opacity=".55" />
            <ellipse cx="132" cy="106" rx="9" ry="6" fill={C.cheek} opacity=".55" />
            <Eyes expression={expression} />
            <Mouth expression={expression} />
            {!headCovered && stage === "experta" ? <Helmet /> : null}
            {!headCovered && stage === "reina" ? <Crown /> : null}
            {front.map((a) => (
              <g key={a}>{ACCESSORIES[a].el}</g>
            ))}
          </g>
          {raised ? <Arms expression={expression} /> : null}
          <Extras expression={expression} />
        </g>
      </g>
    </svg>
  );
}
