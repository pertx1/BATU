import { Video } from "@remotion/media";
import { Img } from "remotion";
import { isVideo, resolveAsset } from "../lib/assets";
import { PlaceholderObject } from "./Placeholders";

type Props = {
  src: string;
  size: number;
  style?: React.CSSProperties;
};

/**
 * Objeto recortado: PNG con alfa o WebM con alfa (en bucle). Si el archivo no
 * está en public/, dibuja un placeholder SVG.
 */
export const MediaObject: React.FC<Props> = ({ src, size, style }) => {
  const url = resolveAsset(src);
  const box: React.CSSProperties = {
    width: size,
    height: size,
    objectFit: "contain",
    display: "block",
    ...style,
  };
  if (!url) {
    return (
      <div style={box}>
        <PlaceholderObject size={size} />
      </div>
    );
  }
  if (isVideo(src)) {
    return <Video src={url} loop muted style={box} />;
  }
  return <Img src={url} style={box} />;
};
