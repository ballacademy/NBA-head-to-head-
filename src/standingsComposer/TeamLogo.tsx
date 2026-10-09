import { useEffect, useRef } from "react";
import { drawCenteredLogo } from "./logoDraw";

interface TeamLogoProps {
  src: string;
  label: string;
}

export function TeamLogo({ src, label }: TeamLogoProps) {
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
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      context.clearRect(0, 0, width, height);
      drawCenteredLogo(context, loaded, 0, 0, width, height, {
        cacheKey: src,
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
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className="ig-slot__logo"
      aria-hidden="true"
      data-team={label}
    />
  );
}
