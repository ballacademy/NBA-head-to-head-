interface PlayerHeadshotProps {
  src: string;
  label: string;
  className?: string;
}

export function PlayerHeadshot({ src, label, className }: PlayerHeadshotProps) {
  return (
    <img
      className={["tl-headshot", className].filter(Boolean).join(" ")}
      src={src}
      alt=""
      data-player={label}
      loading="lazy"
      referrerPolicy="no-referrer"
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
) => {
  const nw = image.naturalWidth || image.width || 1;
  const nh = image.naturalHeight || image.height || 1;
  const sourceSize = Math.min(nw, nh);
  const sx = (nw - sourceSize) / 2;
  const sy = Math.max(0, (nh - sourceSize) * 0.18);
  context.drawImage(image, sx, sy, sourceSize, sourceSize, x, y, w, h);
};
