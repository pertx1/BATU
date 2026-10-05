import { Video } from "@remotion/media";
import { Img } from "remotion";
import { isVideo, resolveAsset } from "../lib/assets";
import { ICONS, iconName } from "./Icons";
import { PlaceholderObject } from "./Placeholders";

type Props = {
  src: string;
  size: number;
  style?: React.CSSProperties;
};

/**
 * Objeto recortado: PNG con alfa, WebM con alfa (en bucle) o un objeto SVG
 * integrado ("icon:telefono"…). Si el archivo no está en public/, dibuja un
 * placeholder SVG.
 */
export const MediaObject: React.FC<Props> = ({ src, size, style }) => {
  const icon = iconName(src);
  const Icon = icon ? ICONS[icon] : undefined;
  const url = icon ? null : resolveAsset(src);
  const box: React.CSSProperties = {
    width: size,
    height: size,
    objectFit: "contain",
    display: "block",
    ...style,
  };
  if (Icon) {
    return (
      <div style={box}>
        <Icon size={size} />
      </div>
    );
  }
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
