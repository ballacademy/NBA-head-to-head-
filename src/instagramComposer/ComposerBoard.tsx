import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import { ComposerStampMark } from "./ComposerStampToggle";
import { composerShowsStamp } from "./composerStamp";
import { readComposerMode } from "./composerMode";
import {
  fitComposerBoardScale,
  previewZoomFactor,
  readComposerStageBox,
  useComposerPreviewZoom,
} from "./composerPreviewZoom";

/**
 * Design-px board, scaled as a unit so type/overlays match the PNG.
 * Use CSS `zoom` rather than `transform: scale()` — Chromium paints the
 * caret in untransformed coordinates, so a scaled parent leaves the
 * insertion point floating above the glyphs.
 *
 * Fit sizes this wrap from the preview-column width so the 4:5/9:16
 * poster is fully painted — never leftover-HUD leftover height, never a
 * 1200×1500 inner scroll crop.
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
    const sync = () => {
      const box = readComposerStageBox(node);
      setScale(fitComposerBoardScale(box.width, box.height, width, height));
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
    const stage = node.closest(".sc-stage");
    if (stage) {
      observer.observe(stage);
    }
    return () => {
      observer.disconnect();
      viewport?.removeEventListener("resize", sync);
      window.removeEventListener("resize", sync);
    };
  }, [width, height]);

  const fitScale = scale > 0 ? scale : 1;
  const innerZoom =
    previewZoom === "fit" ? fitScale : previewZoomFactor(fitScale, previewZoom);
  const fitted = scale > 0;

  return (
    <div
      ref={wrapRef}
      className={`sc-stage__board${previewZoom === "fit" ? "" : " is-zoomed"}`}
      data-fit-scale={fitted ? String(fitScale) : undefined}
      style={
        fitted
          ? {
              width: width * fitScale,
              height: height * fitScale,
              aspectRatio: `${width} / ${height}`,
            }
          : { width: "100%", aspectRatio: `${width} / ${height}` }
      }
    >
      <div
        className="sc-stage__board-inner"
        style={{
          width,
          height,
          // zoom: scale keeps the caret on glyphs; 75/100 override Fit.
          zoom: innerZoom,
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
