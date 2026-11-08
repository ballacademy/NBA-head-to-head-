import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export const COMPOSER_PREVIEW_ZOOM_KEY = "ddgm:composer-preview-zoom";
export const COMPOSER_PREVIEW_ZOOM_EVENT = "ddgm:composer-preview-zoom";
export const COMPOSER_PREVIEW_ZOOM_BUMP_KEY = "ddgm:composer-preview-zoom-bump";
export const COMPOSER_PREVIEW_ZOOM_BUMP_EVENT =
  "ddgm:composer-preview-zoom-bump";

export type ComposerPreviewZoom = "fit" | "75" | "100";

/** Native 1200×1500 at 1 is oversized; 100% is half that (today’s 50%). */
export const PREVIEW_ZOOM_NATURAL_SCALE = 0.5;

/** 75% sits between leftover-contain Fit and 100% (82% of natural as a fallback span). */
export const PREVIEW_ZOOM_SEVENTY_FIVE = 0.82 * PREVIEW_ZOOM_NATURAL_SCALE;

export const PREVIEW_ZOOM_BUMP_DEFAULT = 1;
export const PREVIEW_ZOOM_BUMP_MIN = 0.5;
export const PREVIEW_ZOOM_BUMP_MAX = 2.5;
export const PREVIEW_ZOOM_BUMP_STEP = 1.12;
export const PREVIEW_ZOOM_SCALE_MIN = 0.08;
export const PREVIEW_ZOOM_SCALE_MAX = 1;

/** Fit landing is leftover-contain × this. 100% stays PREVIEW_ZOOM_NATURAL_SCALE. */
export const PREVIEW_ZOOM_FIT_BUMP = 1.5;

export const FILLED_PHOTO_SLOT_SELECTOR = ".pod-photo:not(.is-empty)";
const POST_ZOOM_SKIP_SELECTOR = [
  FILLED_PHOTO_SLOT_SELECTOR,
  ".sc-picker",
  "dialog",
  ".sc-modal",
  ".sc-hud-select__menu",
  "input",
  "textarea",
  "select",
  ".sc-range",
].join(", ");

/**
 * Leftover-contain scale for the 4:5 under the HUD. Do not leftover-HUD shrink.
 * Fit landing multiplies this by PREVIEW_ZOOM_FIT_BUMP (page may scroll).
 * 100% stays PREVIEW_ZOOM_NATURAL_SCALE (600×750).
 */
export const leftoverContainFit = ({
  frameW,
  viewW,
  viewH,
  hudH,
  width,
  height,
  padY = 0,
}: {
  frameW: number;
  viewW: number;
  viewH: number;
  hudH: number;
  width: number;
  height: number;
  padY?: number;
}) => {
  if (!(width > 0) || !(height > 0)) {
    return PREVIEW_ZOOM_NATURAL_SCALE;
  }
  const boxW = Math.min(
    frameW > 0 ? frameW : viewW,
    viewW > 0 ? viewW : frameW || width,
  );
  const widthFit = boxW > 0 ? boxW / width : PREVIEW_ZOOM_NATURAL_SCALE;
  const leftoverH = viewH - Math.max(0, hudH) - Math.max(0, padY);
  if (leftoverH > 0) {
    const heightFit = leftoverH / height;
    return widthFit > 0 ? Math.min(widthFit, heightFit) : heightFit;
  }
  return widthFit > 0 ? widthFit : PREVIEW_ZOOM_NATURAL_SCALE;
};

export const parseComposerPreviewZoom = (
  value: unknown,
): ComposerPreviewZoom => {
  if (value === "75" || value === "100") {
    return value;
  }
  return "fit";
};

export const parseComposerPreviewZoomBump = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return PREVIEW_ZOOM_BUMP_DEFAULT;
  }
  return Math.min(PREVIEW_ZOOM_BUMP_MAX, Math.max(PREVIEW_ZOOM_BUMP_MIN, n));
};

export const previewZoomFactor = (
  fit: number,
  zoom: ComposerPreviewZoom,
  bump = PREVIEW_ZOOM_BUMP_DEFAULT,
) => {
  const leftover =
    Number.isFinite(fit) && fit > 0 ? fit : PREVIEW_ZOOM_NATURAL_SCALE;
  let base = leftover * PREVIEW_ZOOM_FIT_BUMP;
  if (zoom === "100") {
    base = PREVIEW_ZOOM_NATURAL_SCALE;
  } else if (zoom === "75") {
    base = leftover + (PREVIEW_ZOOM_NATURAL_SCALE - leftover) * 0.5;
  }
  const scale = base * parseComposerPreviewZoomBump(bump);
  return Math.min(
    PREVIEW_ZOOM_SCALE_MAX,
    Math.max(PREVIEW_ZOOM_SCALE_MIN, scale),
  );
};

/** Fit is 1.5× leftover-contain, so the page may scroll at the default landing. */
export const composerPreviewAllowsPageScroll = (
  _zoom?: ComposerPreviewZoom,
  _bump = PREVIEW_ZOOM_BUMP_DEFAULT,
) => true;

const asClosestHost = (node: EventTarget | null) => {
  if (!node || typeof node !== "object") {
    return null;
  }
  const closest = (node as { closest?: unknown }).closest;
  if (typeof closest !== "function") {
    return null;
  }
  return node as Element;
};

export const isFilledPhotoSlot = (node: EventTarget | null) => {
  const el = asClosestHost(node);
  return Boolean(el?.closest(FILLED_PHOTO_SLOT_SELECTOR));
};

export const filledPhotoSlotAtPoint = (x: number, y: number) => {
  if (typeof document === "undefined" || typeof document.elementFromPoint !== "function") {
    return null;
  }
  const hit = document.elementFromPoint(x, y);
  return hit instanceof Element ? hit.closest(FILLED_PHOTO_SLOT_SELECTOR) : null;
};

/** Hover/focus on a filled player image: wheel/pinch crop that photo, not the post. */
export const wheelScalesPhoto = (
  event: Pick<WheelEvent, "target" | "clientX" | "clientY">,
) => {
  if (isFilledPhotoSlot(event.target)) {
    return true;
  }
  if (
    typeof event.clientX !== "number" ||
    typeof event.clientY !== "number"
  ) {
    return false;
  }
  return Boolean(filledPhotoSlotAtPoint(event.clientX, event.clientY));
};

/** HUD / empty stage / board chrome: wheel scales the whole post. */
export const wheelScalesPost = (
  event: Pick<WheelEvent, "target" | "clientX" | "clientY">,
) => {
  if (wheelScalesPhoto(event)) {
    return false;
  }
  const target = asClosestHost(event.target);
  if (!target) {
    return false;
  }
  if (target.closest(POST_ZOOM_SKIP_SELECTOR)) {
    return false;
  }
  return Boolean(target.closest(".sc-root"));
};

export const stepPreviewZoomBump = (bump: number, direction: 1 | -1) =>
  parseComposerPreviewZoomBump(
    parseComposerPreviewZoomBump(bump) *
      (direction > 0 ? PREVIEW_ZOOM_BUMP_STEP : 1 / PREVIEW_ZOOM_BUMP_STEP),
  );

export const bumpFromWheelDelta = (bump: number, deltaY: number) => {
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return parseComposerPreviewZoomBump(bump);
  }
  return parseComposerPreviewZoomBump(
    parseComposerPreviewZoomBump(bump) * Math.exp(-deltaY * 0.0025),
  );
};

export const readComposerPreviewZoom = () =>
  parseComposerPreviewZoom(readJson(COMPOSER_PREVIEW_ZOOM_KEY));

export const readComposerPreviewZoomBump = () =>
  parseComposerPreviewZoomBump(readJson(COMPOSER_PREVIEW_ZOOM_BUMP_KEY));

export const writeComposerPreviewZoomBump = (bump: number) => {
  const next = parseComposerPreviewZoomBump(bump);
  writeJson(COMPOSER_PREVIEW_ZOOM_BUMP_KEY, next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COMPOSER_PREVIEW_ZOOM_BUMP_EVENT, { detail: next }),
    );
  }
  return next;
};

export const writeComposerPreviewZoom = (zoom: ComposerPreviewZoom) => {
  writeJson(COMPOSER_PREVIEW_ZOOM_KEY, zoom);
  writeComposerPreviewZoomBump(PREVIEW_ZOOM_BUMP_DEFAULT);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(COMPOSER_PREVIEW_ZOOM_EVENT, { detail: zoom }),
    );
  }
};

export const useComposerPreviewZoom = () => {
  const [zoom, setZoom] = useState<ComposerPreviewZoom>("fit");

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<ComposerPreviewZoom>).detail;
      setZoom(parseComposerPreviewZoom(detail ?? readComposerPreviewZoom()));
    };
    window.addEventListener(COMPOSER_PREVIEW_ZOOM_EVENT, sync);
    return () => window.removeEventListener(COMPOSER_PREVIEW_ZOOM_EVENT, sync);
  }, []);

  return [zoom, writeComposerPreviewZoom] as const;
};

export const useComposerPreviewZoomBump = () => {
  const [bump, setBump] = useState(PREVIEW_ZOOM_BUMP_DEFAULT);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail;
      setBump(parseComposerPreviewZoomBump(detail ?? readComposerPreviewZoomBump()));
    };
    window.addEventListener(COMPOSER_PREVIEW_ZOOM_BUMP_EVENT, sync);
    return () =>
      window.removeEventListener(COMPOSER_PREVIEW_ZOOM_BUMP_EVENT, sync);
  }, []);

  return [bump, writeComposerPreviewZoomBump] as const;
};
