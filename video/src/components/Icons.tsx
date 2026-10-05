import { useId } from "react";
import { INK } from "../theme";

// Objetos SVG integrados. Se usan poniendo `objectSrc: "icon:<nombre>"` en una
// tarjeta, para tener un objeto con sentido sin necesidad de un PNG.

type IconProps = { size: number };

const useGradId = () => `ic-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

/** Teléfono con un código QR en la pantalla (pagos con WeChat/Alipay). */
const Telefono: React.FC<IconProps> = ({ size }) => {
  const g = useGradId();
  const cells = [
    [0, 0], [1, 0], [2, 0], [4, 0], [6, 0], [7, 0], [8, 0],
    [0, 1], [2, 1], [4, 1], [5, 1], [6, 1], [8, 1],
    [0, 2], [1, 2], [2, 2], [5, 2], [6, 2], [7, 2], [8, 2],
    [3, 3], [5, 3], [7, 3],
    [0, 4], [2, 4], [3, 4], [4, 4], [6, 4], [8, 4],
    [1, 5], [4, 5], [5, 5], [7, 5],
    [0, 6], [1, 6], [2, 6], [4, 6], [6, 6], [8, 6],
    [0, 7], [2, 7], [3, 7], [5, 7], [7, 7], [8, 7],
    [0, 8], [1, 8], [2, 8], [4, 8], [6, 8], [8, 8],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <linearGradient id={g} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#5a5a5a" />
          <stop offset="0.5" stopColor="#1a1a1a" />
          <stop offset="1" stopColor="#3a3a3a" />
        </linearGradient>
      </defs>
      <rect x="52" y="10" width="96" height="180" rx="18" fill={`url(#${g})`} />
      <rect x="59" y="24" width="82" height="150" rx="8" fill="#f4f4f4" />
      <rect x="86" y="15" width="28" height="4" rx="2" fill="#777" />
      <g transform="translate(73 62)">
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x * 6} y={y * 6} width={6} height={6} fill={INK} />
        ))}
      </g>
      <rect x="72" y="128" width="56" height="12" rx="6" fill={INK} />
      <rect x="82" y="148" width="36" height="6" rx="3" fill="#bbb" />
    </svg>
  );
};

/** Tarjeta de crédito ligeramente inclinada. */
const Tarjeta: React.FC<IconProps> = ({ size }) => {
  const g = useGradId();
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <linearGradient id={g} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e9e9e9" />
          <stop offset="0.55" stopColor="#9a9a9a" />
          <stop offset="1" stopColor="#d5d5d5" />
        </linearGradient>
      </defs>
      <g transform="rotate(-12 100 100)">
        <rect x="18" y="52" width="164" height="104" rx="12" fill={`url(#${g})`} stroke={INK} strokeWidth="3" />
        <rect x="18" y="72" width="164" height="20" fill={INK} />
        <rect x="34" y="104" width="30" height="22" rx="4" fill="#cfcfcf" stroke={INK} strokeWidth="2" />
        <path d="M 34 115 H 64 M 49 104 V 126" stroke={INK} strokeWidth="1.5" />
        <rect x="34" y="136" width="90" height="7" rx="3.5" fill={INK} opacity="0.7" />
        <circle cx="146" cy="128" r="12" fill={INK} opacity="0.85" />
        <circle cx="160" cy="128" r="12" fill="#777" opacity="0.85" />
      </g>
    </svg>
  );
};

/** Fajo de billetes. */
const Billetes: React.FC<IconProps> = ({ size }) => {
  const g = useGradId();
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <linearGradient id={g} x1="0" x2="1">
          <stop offset="0" stopColor="#f2f2f2" />
          <stop offset="1" stopColor="#bdbdbd" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${i * 6} ${-i * 12}) rotate(${-8 + i * 6} 100 110)`}>
          <rect x="22" y="70" width="156" height="84" rx="6" fill={`url(#${g})`} stroke={INK} strokeWidth="3" />
          <rect x="32" y="80" width="136" height="64" rx="4" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.6" />
          <circle cx="100" cy="112" r="20" fill="none" stroke={INK} strokeWidth="3" />
          <text x="100" y="121" textAnchor="middle" fontSize="26" fontWeight="800" fontFamily="sans-serif" fill={INK}>¥</text>
        </g>
      ))}
      <rect x="86" y="58" width="32" height="104" fill={INK} opacity="0.85" />
    </svg>
  );
};

/** Torres conectadas a distintos niveles (ciudad multinivel). */
const Edificio: React.FC<IconProps> = ({ size }) => {
  const g = useGradId();
  const windows = (x: number, y: number, cols: number, rows: number) =>
    Array.from({ length: cols * rows }, (_, i) => (
      <rect key={`${x}-${i}`} x={x + (i % cols) * 10} y={y + Math.floor(i / cols) * 12} width="5" height="7" fill="#f2f2f2" opacity="0.8" />
    ));
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <linearGradient id={g} x1="0" x2="1">
          <stop offset="0" stopColor="#2a2a2a" />
          <stop offset="1" stopColor="#5c5c5c" />
        </linearGradient>
      </defs>
      <rect x="30" y="60" width="44" height="130" fill={`url(#${g})`} />
      <rect x="84" y="20" width="42" height="170" fill={`url(#${g})`} />
      <rect x="136" y="80" width="38" height="110" fill={`url(#${g})`} />
      {windows(36, 70, 4, 9)}
      {windows(90, 30, 4, 12)}
      {windows(142, 90, 3, 7)}
      <path d="M 74 120 H 84 M 126 140 H 136" stroke={INK} strokeWidth="6" />
      <path d="M 10 160 C 60 150, 120 175, 196 150" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <rect x="10" y="188" width="180" height="6" rx="3" fill={INK} />
    </svg>
  );
};

/** Señal de wifi (internet). */
const Wifi: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 200 200">
    {[78, 56, 34].map((r, i) => (
      <path
        key={r}
        d={`M ${100 - r} ${150 - r * 0.62} A ${r} ${r} 0 0 1 ${100 + r} ${150 - r * 0.62}`}
        fill="none"
        stroke={INK}
        strokeWidth={16}
        strokeLinecap="round"
        opacity={1 - i * 0.12}
      />
    ))}
    <circle cx="100" cy="152" r="12" fill={INK} />
    <line x1="40" y1="40" x2="160" y2="170" stroke="#8a8a8a" strokeWidth="10" strokeLinecap="round" />
  </svg>
);

/** Código QR para pagar. */
const Qr: React.FC<IconProps> = ({ size }) => {
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="44" height="44" rx="6" fill={INK} />
      <rect x={x + 8} y={y + 8} width="28" height="28" rx="3" fill="#fff" />
      <rect x={x + 15} y={y + 15} width="14" height="14" rx="2" fill={INK} />
    </g>
  );
  const bits = [
    [80, 30], [92, 30], [104, 42], [80, 54], [116, 54], [92, 66], [30, 84], [54, 84], [78, 84],
    [102, 84], [138, 84], [162, 84], [42, 96], [90, 96], [126, 96], [150, 96], [66, 108],
    [114, 108], [138, 108], [80, 126], [104, 126], [128, 126], [152, 126], [92, 138],
    [140, 138], [80, 150], [116, 150], [164, 150], [104, 162], [128, 162], [92, 174], [152, 174],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <rect x="14" y="14" width="172" height="172" rx="18" fill="#fff" stroke={INK} strokeWidth="6" />
      {finder(26, 26)}
      {finder(130, 26)}
      {finder(26, 130)}
      {bits.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="11" height="11" fill={INK} />
      ))}
    </svg>
  );
};

/** Mango con su hoja. */
const Mango: React.FC<IconProps> = ({ size }) => {
  const g = useGradId();
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <radialGradient id={g} cx="0.38" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#f0f0f0" />
          <stop offset="0.55" stopColor="#9c9c9c" />
          <stop offset="1" stopColor="#3c3c3c" />
        </radialGradient>
      </defs>
      <path
        d="M 100 46 C 152 40, 182 92, 168 136 C 156 176, 96 192, 58 166 C 22 142, 30 90, 62 66 C 74 56, 86 48, 100 46 Z"
        fill={`url(#${g})`}
        stroke={INK}
        strokeWidth="4"
      />
      <path d="M 100 46 C 102 34, 108 24, 116 18" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M 112 26 C 132 6, 166 10, 178 22 C 160 40, 130 42, 112 26 Z" fill="#4a4a4a" stroke={INK} strokeWidth="3" />
    </svg>
  );
};

/** Cajero automático. */
const Cajero: React.FC<IconProps> = ({ size }) => {
  const g = useGradId();
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <linearGradient id={g} x1="0" x2="1">
          <stop offset="0" stopColor="#d9d9d9" />
          <stop offset="1" stopColor="#8f8f8f" />
        </linearGradient>
      </defs>
      <rect x="40" y="12" width="120" height="180" rx="12" fill={`url(#${g})`} stroke={INK} strokeWidth="4" />
      <rect x="54" y="28" width="92" height="58" rx="6" fill={INK} />
      <path d="M 82 46 L 118 70 M 118 46 L 82 70" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={62 + c * 18} y={100 + r * 14} width="12" height="9" rx="2" fill={INK} opacity="0.8" />
        )),
      )}
      <rect x="122" y="100" width="18" height="36" rx="3" fill={INK} />
      <rect x="62" y="152" width="76" height="8" rx="4" fill={INK} />
      <rect x="70" y="170" width="60" height="6" rx="3" fill={INK} opacity="0.6" />
    </svg>
  );
};

export const ICONS: Record<string, React.FC<IconProps>> = {
  telefono: Telefono,
  tarjeta: Tarjeta,
  billetes: Billetes,
  edificio: Edificio,
  wifi: Wifi,
  qr: Qr,
  mango: Mango,
  cajero: Cajero,
};

export const iconName = (src: string) =>
  src.startsWith("icon:") ? src.slice("icon:".length) : null;
