import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import { ComposerStampMark } from "./ComposerStampToggle";
import { composerShowsStamp } from "./composerStamp";
import { readComposerMode } from "./composerMode";
import {
  previewZoomFactor,
  useComposerPreviewZoom,
} from "./composerPreviewZoom";

/**
 * Design-px board, scaled as a unit so type/overlays match the PNG.
 * Use CSS `zoom` rather than `transform: scale()` — Chromium paints the
 * caret in untransformed coordinates, so a scaled parent leaves the
 * insertion point floating above the glyphs.
 *
 * Fit is object-fit: contain inside the preview pane (CSS sizes the wrap).
 * Inner zoom follows the wrap width so the whole 4:5 / 9:16 / 1:1 graphic
 * paints with overflow:hidden. 75 / 100 pan inside that same pane.
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
  const [scale, setScale] = useState(0);
  const [previewZoom] = useComposerPreviewZoom();

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) {
      return;
    }
    const frame = node.closest(".sc-stage__frame");
    const sync = () => {
      const pane = node.clientWidth;
      if (pane <= 1) {
        return;
      }
      setScale(pane / width);
    };
    sync();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", sync);
    window.addEventListener("resize", sync);
    if (typeof ResizeObserver === "undefined") {
      return () => {
        viewport?.removeEventListener("resize", sync);
        window.removeEventListener("resize", sync);
      };
    }
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    if (frame) {
      observer.observe(frame);
    }
    return () => {
      observer.disconnect();
      viewport?.removeEventListener("resize", sync);
      window.removeEventListener("resize", sync);
    };
  }, [width, height]);

  const fitted = scale > 0;
  const fitScale = fitted ? scale : 0;
  const innerZoom =
    previewZoom === "fit"
      ? fitScale
      : previewZoomFactor(fitScale || 1, previewZoom);

  return (
    <div
      ref={wrapRef}
      className={`sc-stage__board${previewZoom === "fit" ? "" : " is-zoomed"}`}
      data-fit-scale={fitted ? String(fitScale) : undefined}
      style={{
        ["--board-w" as string]: String(width),
        ["--board-h" as string]: String(height),
        aspectRatio: `${width} / ${height}`,
      }}
    >
      <div
        className="sc-stage__board-inner"
        style={{
          width,
          height,
          // zoom: scale keeps the caret on glyphs; 75/100 override Fit.
          ...(innerZoom > 0 ? { zoom: innerZoom } : {}),
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
