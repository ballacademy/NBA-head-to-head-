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
  useComposerPreviewZoomBump,
} from "./composerPreviewZoom";

/**
 * Design-px board, scaled as a unit so type/overlays match the PNG.
 * Use CSS `zoom` rather than `transform: scale()` — Chromium paints the
 * caret in untransformed coordinates, so a scaled parent leaves the
 * insertion point floating above the glyphs.
 *
 * Fit landing is leftover-contain × PREVIEW_ZOOM_FIT_BUMP (page may scroll).
 * 100% stays PREVIEW_ZOOM_NATURAL_SCALE (600×750). Wheel on a filled photo
 * slot crops that image; wheel on board chrome / empty stage / HUD scales
 * the whole post (see ComposerHub).
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
  const [bump] = useComposerPreviewZoomBump();
  const factor = previewZoomFactor(fit, previewZoom, bump);

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) {
      return;
    }
    const frame = node.closest(".sc-stage__frame");
    const root = node.closest(".sc-root");
    const tabs = root?.querySelector(".sc-tabs");
    const toolbar = root?.querySelector(".sc-toolbar");
    const stage = root?.querySelector(".sc-stage");
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
      let padY = 0;
      if (stage instanceof HTMLElement) {
        const style = getComputedStyle(stage);
        padY =
          (Number.parseFloat(style.paddingTop) || 0) +
          (Number.parseFloat(style.paddingBottom) || 0);
      }
      if ((frameW > 0 || viewW > 0) && viewH > 0) {
        const nextFit = leftoverContainFit({
          frameW,
          viewW,
          viewH,
          hudH,
          width,
          height,
          padY,
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
    if (stage instanceof Element) {
      observer.observe(stage);
    }
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
