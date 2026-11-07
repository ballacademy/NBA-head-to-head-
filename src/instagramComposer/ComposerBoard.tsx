import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import { ComposerStampMark } from "./ComposerStampToggle";
import { composerShowsStamp } from "./composerStamp";
import { readComposerMode } from "./composerMode";
import {
  leftoverContainFit,
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
 * Fit leftover-contains under the HUD (width-contain on a tiny leftover
 * well so the 4:5 is never a postage stamp). 100% stays
 * PREVIEW_ZOOM_NATURAL_SCALE (600×750). Page may still scroll at 75/100.
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
  const factor = previewZoomFactor(fit, previewZoom);

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) {
      return;
    }
    const frame = node.closest(".sc-stage__frame");
    const root = node.closest(".sc-root");
    const tabs = root?.querySelector(".sc-tabs");
    const toolbar = root?.querySelector(".sc-toolbar");
    const sync = () => {
      const next = node.clientWidth;
      if (next > 0) {
        setScale(next / width);
      }
      const frameW =
        frame instanceof HTMLElement && frame.clientWidth > 0
          ? frame.clientWidth
          : 0;
      const viewW = window.visualViewport?.width ?? window.innerWidth;
      const viewH = window.visualViewport?.height ?? window.innerHeight;
      const hudH =
        (tabs instanceof HTMLElement ? tabs.getBoundingClientRect().height : 0) +
        (toolbar instanceof HTMLElement
          ? toolbar.getBoundingClientRect().height
          : 0);
      if ((frameW > 0 || viewW > 0) && viewH > 0) {
        const nextFit = leftoverContainFit({
          frameW,
          viewW,
          viewH,
          hudH,
          width,
          height,
        });
        if (nextFit > 0) {
          setFit(nextFit);
        }
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
    if (frame instanceof Element) {
      observer.observe(frame);
    }
    if (tabs instanceof Element) {
      observer.observe(tabs);
    }
    if (toolbar instanceof Element) {
      observer.observe(toolbar);
    }
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, [width, height, previewZoom]);

  return (
    <div
      ref={wrapRef}
      className="sc-stage__board is-zoomed"
      data-preview-zoom={previewZoom}
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
