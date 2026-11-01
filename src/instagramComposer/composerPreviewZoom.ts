import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export const COMPOSER_PREVIEW_ZOOM_KEY = "ddgm:composer-preview-zoom";
export const COMPOSER_PREVIEW_ZOOM_EVENT = "ddgm:composer-preview-zoom";

export type ComposerPreviewZoom = "fit" | "75" | "100";

export const parseComposerPreviewZoom = (
  value: unknown,
): ComposerPreviewZoom => {
  if (value === "75" || value === "100") {
    return value;
  }
  return "fit";
};

export const previewZoomFactor = (
  fit: number,
  zoom: ComposerPreviewZoom,
) => {
  if (zoom === "75") {
    return 0.75;
  }
  if (zoom === "100") {
    return 1;
  }
  return fit;
};

/** Largest zoom that keeps the design board inside the preview pane. */
export const fitComposerBoardScale = (
  clientWidth: number,
  clientHeight: number,
  width: number,
  height: number,
) => {
  if (width <= 0 || height <= 0) {
    return 0;
  }
  const byWidth = clientWidth > 0 ? clientWidth / width : 0;
  const byHeight = clientHeight > 0 ? clientHeight / height : 0;
  if (!byWidth && !byHeight) {
    return 0;
  }
  const next = Math.min(
    byWidth || Number.POSITIVE_INFINITY,
    byHeight || Number.POSITIVE_INFINITY,
  );
  return Number.isFinite(next) && next > 0 ? Math.min(1, next) : 0;
};

const paddingBox = (node: HTMLElement) => {
  const style = getComputedStyle(node);
  return {
    x:
      (Number.parseFloat(style.paddingLeft) || 0) +
      (Number.parseFloat(style.paddingRight) || 0),
    y:
      (Number.parseFloat(style.paddingTop) || 0) +
      (Number.parseFloat(style.paddingBottom) || 0),
  };
};

/**
 * Pane box for contain-fit. Prefer the stage frame (the preview pane),
 * never the unzoomed 1200×1500 wrap min-content.
 */
export const readComposerStageBox = (board: HTMLElement) => {
  const frame = board.closest(".sc-stage__frame");
  const stage = board.closest(".sc-stage");
  const box =
    frame instanceof HTMLElement
      ? frame
      : stage instanceof HTMLElement
        ? stage
        : board;
  const pad = paddingBox(box);
  return {
    width: Math.max(0, box.clientWidth - pad.x),
    height: Math.max(0, box.clientHeight - pad.y),
  };
};

export const readComposerPreviewZoom = () =>
  parseComposerPreviewZoom(readJson(COMPOSER_PREVIEW_ZOOM_KEY));

export const writeComposerPreviewZoom = (zoom: ComposerPreviewZoom) => {
  writeJson(COMPOSER_PREVIEW_ZOOM_KEY, zoom);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COMPOSER_PREVIEW_ZOOM_EVENT, { detail: zoom }),
    );
  }
};

export const useComposerPreviewZoom = () => {
  const [zoom, setZoom] = useState<ComposerPreviewZoom>("fit");

  useEffect(() => {
    setZoom(readComposerPreviewZoom());
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<ComposerPreviewZoom>).detail;
      setZoom(parseComposerPreviewZoom(detail ?? readComposerPreviewZoom()));
    };
    window.addEventListener(COMPOSER_PREVIEW_ZOOM_EVENT, sync);
    return () => window.removeEventListener(COMPOSER_PREVIEW_ZOOM_EVENT, sync);
  }, []);

  return [zoom, writeComposerPreviewZoom] as const;
};
