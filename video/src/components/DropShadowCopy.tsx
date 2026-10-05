type Props = {
  children: React.ReactNode;
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  opacity?: number;
  style?: React.CSSProperties;
};

/**
 * Sombra proyectada "de copia": duplica el contenido en negro, lo desenfoca y
 * lo desplaza hacia abajo a la derecha, por detrás del original.
 */
export const DropShadowCopy: React.FC<Props> = ({
  children,
  offsetX = 26,
  offsetY = 34,
  blur = 16,
  opacity = 0.32,
  style,
}) => {
  return (
    <div style={{ position: "relative", ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${offsetX}px, ${offsetY}px)`,
          filter: `brightness(0) blur(${blur}px)`,
          opacity,
        }}
      >
        {children}
      </div>
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
};
