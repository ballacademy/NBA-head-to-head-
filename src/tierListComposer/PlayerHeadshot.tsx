import { useEffect, useState } from "react";
import { headshotGlowPx } from "../instagramComposer/composerLook";

interface PlayerHeadshotProps {
  src: string;
  label: string;
  className?: string;
}

const collegeHeadshotUrl = (src: string) => {
  if (!src.includes("/i/headshots/nba/players/full/")) {
    return null;
  }
  return src.replace(
    "/i/headshots/nba/players/full/",
    "/i/headshots/mens-college-basketball/players/full/",
  );
};

export function PlayerHeadshot({ src, label, className }: PlayerHeadshotProps) {
  const [url, setUrl] = useState(src);

  useEffect(() => {
    setUrl(src);
  }, [src]);

  return (
    <img
      className={["tl-headshot", className].filter(Boolean).join(" ")}
      src={url}
      alt=""
      data-player={label}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        const fallback = collegeHeadshotUrl(src);
        if (fallback && url !== fallback) {
          setUrl(fallback);
        }
      }}
    />
  );
}

export const drawCoverHeadshot = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { glow?: boolean },
) => {
  const nw = image.naturalWidth || image.width || 1;
  const nh = image.naturalHeight || image.height || 1;
  const sourceSize = Math.min(nw, nh);
  const sx = (nw - sourceSize) / 2;
  const sy = Math.max(0, (nh - sourceSize) * 0.18);
  const paint = () => {
    context.drawImage(image, sx, sy, sourceSize, sourceSize, x, y, w, h);
  };
  if (options?.glow) {
    context.save();
    context.shadowColor = "rgba(210, 235, 255, 0.92)";
    context.shadowBlur = headshotGlowPx(Math.min(w, h));
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    paint();
    context.restore();
    context.save();
    context.shadowColor = "rgba(255, 255, 255, 0.7)";
    context.shadowBlur = Math.max(4, Math.round(headshotGlowPx(Math.min(w, h)) * 0.4));
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    paint();
    context.restore();
  }
  paint();
};
