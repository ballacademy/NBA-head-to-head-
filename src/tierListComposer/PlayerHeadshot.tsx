import { useEffect, useState } from "react";
import {
  headshotGlowPx,
  paintHeadshotSilhouette,
} from "../instagramComposer/composerLook";

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

/** Source crop with the destination aspect so drawImage never squashes. */
export const coverSourceRect = (
  nw: number,
  nh: number,
  destW: number,
  destH: number,
  focusY = 0.18,
) => {
  const width = Math.max(1, nw);
  const height = Math.max(1, nh);
  const destAspect = Math.max(1, destW) / Math.max(1, destH);
  const srcAspect = width / height;
  if (srcAspect > destAspect) {
    const sw = height * destAspect;
    return { sx: (width - sw) / 2, sy: 0, sw, sh: height };
  }
  const sh = width / destAspect;
  const slack = Math.max(0, height - sh);
  return { sx: 0, sy: slack * focusY, sw: width, sh };
};

export const drawCoverHeadshot = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: { glow?: boolean; silhouette?: boolean },
) => {
  const nw = image.naturalWidth || image.width || 1;
  const nh = image.naturalHeight || image.height || 1;
  const { sx, sy, sw, sh } = coverSourceRect(nw, nh, w, h);
  const size = Math.min(w, h);
  const paint = () => {
    context.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  };
  if (options?.glow) {
    context.save();
    context.shadowColor = "rgba(210, 235, 255, 0.92)";
    context.shadowBlur = headshotGlowPx(size);
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    paint();
    context.restore();
    context.save();
    context.shadowColor = "rgba(255, 255, 255, 0.7)";
    context.shadowBlur = Math.max(4, Math.round(headshotGlowPx(size) * 0.4));
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    paint();
    context.restore();
  }
  if (options?.silhouette !== false) {
    paintHeadshotSilhouette(context, paint, size);
  }
  paint();
};
