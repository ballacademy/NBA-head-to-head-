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
  useComposerPreviewZoomBump,
} from "./composerPreviewZoom";

/**
 * Design-px board, scaled as a unit so type/overlays match the PNG.
 * Use CSS `zoom` rather than `transform: scale()` — Chromium paints the
 * caret in untransformed coordinates, so a scaled parent leaves the
 * insertion point floating above the glyphs.
 *
 * Fit is a fixed 560-wide post on every composer (4:5 = 560×700,
 * 9:16 = 560-wide). 75% is 450-wide. 100% stays PREVIEW_ZOOM_NATURAL_SCALE
 * (600×750). Wheel on a filled photo slot crops that image; wheel on the
 * 4:5 post (not a photo) scales the whole post; HUD / leftover chrome /
 * empty page scroll (see ComposerHub).
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
  const [previewZoom] = useComposerPreviewZoom();
  const [bump] = useComposerPreviewZoomBump();
  const factor = previewZoomFactor(previewZoom, bump);

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) {
      return;
    }
    const sync = () => {
      const next = node.clientWidth;
      if (next > 0) {
        setScale(next / width);
      }
    };
    sync();
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.removeEventListener("resize", sync);
        window.visualViewport?.removeEventListener("resize", sync);
      };
    }
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, [width, height, previewZoom, bump]);

  return (
    <div
      ref={wrapRef}
      className="sc-stage__board is-zoomed"
      data-preview-zoom={previewZoom}
      data-preview-zoom-bump={bump}
      style={{
        aspectRatio: `${width} / ${height}`,
        ["--board-w" as string]: String(width),
        ["--board-h" as string]: String(height),
        width: width * factor,
        height: height * factor,
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
