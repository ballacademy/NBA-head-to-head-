import { useEffect, useRef } from "react";
import { drawCenteredLogo, drawCoveredLogo } from "./logoDraw";

interface TeamLogoProps {
  src: string;
  label: string;
  className?: string;
  shadow?: number;
  fitX?: number;
  fitY?: number;
  glow?: boolean;
  balanceStamp?: boolean;
  /** Scale trimmed artwork to cover the parent box and clip overflow. */
  cover?: boolean;
  /** Team-tier cells: 2–3% left after optical center. */
  nudgeLeft?: boolean;
}

export function TeamLogo({
  src,
  label,
  className,
  shadow,
  fitX,
  fitY,
  glow = false,
  balanceStamp = false,
  cover = false,
  nudgeLeft = false,
}: TeamLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    let loaded: HTMLImageElement | null = null;

    const paint = () => {
      if (cancelled || !loaded || !canvas.parentElement) {
        return;
      }
      // clientWidth is the content box (inside the cell frame). Bounding-rect
      // includes the stroke, so the bitmap was larger than the visible hole and
      // overflow:hidden clipped the mark toward the top-left.
      const parent = canvas.parentElement;
      const cssW = Math.max(1, parent.clientWidth);
      const cssH = Math.max(1, parent.clientHeight);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(cssW * dpr));
      const height = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      context.clearRect(0, 0, width, height);
      if (cover) {
        drawCoveredLogo(context, loaded, 0, 0, width, height, {
          cacheKey: src,
        });
        return;
      }
      drawCenteredLogo(context, loaded, 0, 0, width, height, {
        cacheKey: src,
        shadow,
        fitX,
        fitY,
        glow,
        balanceStamp,
        nudgeLeft,
      });
    };

    image.onload = () => {
      if (cancelled) {
        return;
      }
      loaded = image;
      paint();
    };
    image.src = src;

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => paint());
    if (canvas.parentElement && observer) {
      observer.observe(canvas.parentElement);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [src, shadow, fitX, fitY, glow, balanceStamp, cover, nudgeLeft]);

  return (
    <canvas
      ref={canvasRef}
      className={["ig-slot__logo", className].filter(Boolean).join(" ")}
      aria-hidden="true"
      data-team={label}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
