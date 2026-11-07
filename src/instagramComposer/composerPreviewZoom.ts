import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export const COMPOSER_PREVIEW_ZOOM_KEY = "ddgm:composer-preview-zoom";
export const COMPOSER_PREVIEW_ZOOM_EVENT = "ddgm:composer-preview-zoom";

export type ComposerPreviewZoom = "fit" | "75" | "100";

/** Native 1200×1500 at 1 is oversized; 100% is half that (today’s 50%). */
export const PREVIEW_ZOOM_NATURAL_SCALE = 0.5;

/** 75% sits between leftover-contain Fit and 100% (82% of natural as a fallback span). */
export const PREVIEW_ZOOM_SEVENTY_FIVE = 0.82 * PREVIEW_ZOOM_NATURAL_SCALE;

/** Skip leftover-height contain when the HUD well is too short to hold a poster. */
export const LEFTOVER_FIT_MIN_PX = 360;
export const LEFTOVER_FIT_MIN_VIEW_RATIO = 0.36;

/** Fit leftover-contains under the HUD. Tiny leftover wells width-contain instead of postage-stamping. */
export const leftoverContainFit = ({
  frameW,
  viewW,
  viewH,
  hudH,
  width,
  height,
}: {
  frameW: number;
  viewW: number;
  viewH: number;
  hudH: number;
  width: number;
  height: number;
}) => {
  if (!(width > 0) || !(height > 0)) {
    return PREVIEW_ZOOM_NATURAL_SCALE;
  }
  const boxW = Math.min(
    frameW > 0 ? frameW : viewW,
    viewW > 0 ? viewW : frameW || width,
  );
  const widthFit = boxW > 0 ? boxW / width : PREVIEW_ZOOM_NATURAL_SCALE;
  const leftoverH = viewH - Math.max(0, hudH);
  const leftoverUsable =
    leftoverH >= LEFTOVER_FIT_MIN_PX &&
    leftoverH >= viewH * LEFTOVER_FIT_MIN_VIEW_RATIO;
  if (!leftoverUsable) {
    return widthFit > 0 ? widthFit : PREVIEW_ZOOM_NATURAL_SCALE;
  }
  return Math.min(widthFit, leftoverH / height);
};

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
  const leftover = Number.isFinite(fit) && fit > 0 ? fit : PREVIEW_ZOOM_NATURAL_SCALE;
  if (zoom === "fit") {
    return leftover;
  }
  if (zoom === "100") {
    return PREVIEW_ZOOM_NATURAL_SCALE;
  }
  return leftover + (PREVIEW_ZOOM_NATURAL_SCALE - leftover) * 0.5;
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
