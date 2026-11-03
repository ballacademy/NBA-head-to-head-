import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import { ComposerStampMark } from "./ComposerStampToggle";
import { composerShowsStamp } from "./composerStamp";
import { readComposerMode } from "./composerMode";
import {
  PREVIEW_ZOOM_NATURAL_SCALE,
  previewZoomFactor,
  useComposerPreviewZoom,
} from "./composerPreviewZoom";

/**
 * Design-px board, scaled as a unit so type/overlays match the PNG.
 * Use CSS `zoom` rather than `transform: scale()` — Chromium paints the
 * caret in untransformed coordinates, so a scaled parent leaves the
 * insertion point floating above the glyphs.
 *
 * Fit: wrap is contain-sized by CSS so the whole 4:5 / 9:16 / 1:1
 * shows in the leftover stage. 75 / 100: wrap is the zoomed graphic at
 * PREVIEW_ZOOM_NATURAL_SCALE (100% = half the 1200×1500 design). If that
 * is taller than the stage, the canvas pans vertically — not the HUD.
 */
export function ComposerBoard({
  children,
  width = GRAPHIC_WIDTH,
  height = GRAPHIC_HEIGHT,
}: {
  children: ReactNode;
  width?: number;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState(PREVIEW_ZOOM_NATURAL_SCALE);
  const [previewZoom] = useComposerPreviewZoom();
  const zoomed = previewZoom !== "fit";
  const factor = previewZoomFactor(fit, previewZoom);

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) {
      return;
    }
    const frame = node.closest(".sc-stage__frame");
    const sync = () => {
      const next = node.clientWidth;
      if (next > 0) {
        setScale(next / width);
      }
      if (frame instanceof HTMLElement) {
        const frameW = frame.clientWidth;
        const frameH = frame.clientHeight;
        if (frameW > 0 && frameH > 0) {
          const nextFit = Math.min(frameW / width, frameH / height);
          if (nextFit > 0) {
            setFit(nextFit);
          }
        }
      }
    };
    sync();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    if (frame instanceof Element) {
      observer.observe(frame);
    }
    return () => observer.disconnect();
  }, [width, height, previewZoom]);

  return (
    <div
      ref={wrapRef}
      className={`sc-stage__board${zoomed ? " is-zoomed" : ""}`}
      data-preview-zoom={previewZoom}
      style={{
        aspectRatio: `${width} / ${height}`,
        ["--board-w" as string]: String(width),
        ["--board-h" as string]: String(height),
        ...(zoomed
          ? {
              width: width * factor,
              height: height * factor,
            }
          : {}),
      }}
    >
      <div
        className="sc-stage__board-inner"
        style={{
          width,
          height,
          zoom: scale,
        }}
      >
        {children}
        <ComposerStampMark modeOn={composerShowsStamp(readComposerMode())} />
      </div>
    </div>
  );
}

export const boardUnitFromNode = (node: HTMLElement) => {
  const width = node.offsetWidth;
  return width > 0 ? width / GRAPHIC_WIDTH : 1;
};
