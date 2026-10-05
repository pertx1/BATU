import { useId } from "react";
import { GRAYS, INK } from "../theme";

// Placeholders SVG para cuando falta un asset en public/. Dibujan una forma
// simple y legible (un micrófono y una silueta) para poder previsualizar el
// estilo antes de tener las imágenes definitivas.

export const PlaceholderObject: React.FC<{ size: number }> = ({ size }) => {
  const id = `ph-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="#3a3a3a" />
          <stop offset="0.45" stopColor="#d9d9d9" />
          <stop offset="1" stopColor="#2a2a2a" />
        </linearGradient>
      </defs>
      <rect x="70" y="16" width="60" height="98" rx="30" fill={`url(#${id})`} stroke={INK} strokeWidth="4" />
      {[40, 52, 64, 76, 88].map((y) => (
        <line key={y} x1="74" x2="126" y1={y} y2={y} stroke={INK} strokeOpacity="0.45" strokeWidth="2" />
      ))}
      <path d="M 52 92 C 52 140, 148 140, 148 92" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <rect x="94" y="132" width="12" height="38" fill={INK} />
      <rect x="62" y="170" width="76" height="12" rx="6" fill={INK} />
    </svg>
  );
};

export const PlaceholderPerson: React.FC<{ width: number; height: number }> = ({
  width,
  height,
}) => {
  return (
    <svg width={width} height={height} viewBox="0 0 300 400" preserveAspectRatio="xMidYMax meet">
      <circle cx="150" cy="110" r="72" fill={GRAYS.g700} />
      <path d="M 20 400 C 20 260, 80 205, 150 205 C 220 205, 280 260, 280 400 Z" fill={GRAYS.g700} />
    </svg>
  );
};
