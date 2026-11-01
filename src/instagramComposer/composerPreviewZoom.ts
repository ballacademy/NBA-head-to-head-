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

/** Largest zoom that keeps the design board inside the wrap. */
export const fitComposerBoardScale = (
  clientWidth: number,
  clientHeight: number,
  width: number,
  height: number,
) => {
  if (width <= 0 || height <= 0) {
    return 1;
  }
  const byWidth = clientWidth > 0 ? clientWidth / width : 0;
  const byHeight = clientHeight > 0 ? clientHeight / height : 0;
  const next = Math.min(byWidth || Number.POSITIVE_INFINITY, byHeight || Number.POSITIVE_INFINITY);
  return Number.isFinite(next) && next > 0 ? Math.min(1, next) : 1;
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
 * Desktop Fit uses the visible stage leftover, not the board wrap — wrap
 * min-content can be the unzoomed 1200×1500 design and then scale stays 1.
 * Mobile uses width only so the 4:5 can page-scroll under pinned Export.
 */
export const readComposerStageBox = (board: HTMLElement) => {
  const stage = board.closest(".sc-stage");
  const desktop =
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 901px)").matches;
  if (stage instanceof HTMLElement && desktop) {
    const pad = paddingBox(stage);
    const hint = 52;
    const width = Math.max(0, stage.clientWidth - pad.x);
    const rect = stage.getBoundingClientRect();
    const leftover = window.innerHeight - rect.top - pad.y - hint;
    const bounded = Math.max(0, stage.clientHeight - pad.y - hint);
    const height = Math.max(
      0,
      leftover > 0 ? Math.min(bounded || leftover, leftover) : bounded,
    );
    return { width, height };
  }
  const frame = board.closest(".sc-stage__frame");
  const box = frame instanceof HTMLElement ? frame : board;
  return { width: Math.max(0, box.clientWidth), height: 0 };
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
