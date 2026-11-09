import { useEffect, useState } from "react";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { readJson, writeJson } from "../lib/browserStorage";

export const COMPOSER_PREVIEW_ZOOM_KEY = "ddgm:composer-preview-zoom";
export const COMPOSER_PREVIEW_ZOOM_EVENT = "ddgm:composer-preview-zoom";
export const COMPOSER_PREVIEW_ZOOM_BUMP_KEY = "ddgm:composer-preview-zoom-bump";
export const COMPOSER_PREVIEW_ZOOM_BUMP_EVENT =
  "ddgm:composer-preview-zoom-bump";

export type ComposerPreviewZoom = "fit" | "75" | "100";

/** Native 1200-wide board. 100% is half that (600×750 on 4:5). */
export const PREVIEW_ZOOM_NATIVE_WIDTH = GRAPHIC_WIDTH;
export const PREVIEW_ZOOM_NATURAL_SCALE = 0.5;
export const PREVIEW_ZOOM_HUNDRED_WIDTH =
  PREVIEW_ZOOM_NATIVE_WIDTH * PREVIEW_ZOOM_NATURAL_SCALE;

/** Fit is a fixed 560-wide post on every composer, not leftover-contain. */
export const PREVIEW_ZOOM_FIT_WIDTH = 560;
export const PREVIEW_ZOOM_FIT_SCALE =
  PREVIEW_ZOOM_FIT_WIDTH / PREVIEW_ZOOM_NATIVE_WIDTH;

/** 75% of 100% = 450-wide, not leftover-based. */
export const PREVIEW_ZOOM_SEVENTY_FIVE_WIDTH = 450;
export const PREVIEW_ZOOM_SEVENTY_FIVE =
  PREVIEW_ZOOM_SEVENTY_FIVE_WIDTH / PREVIEW_ZOOM_NATIVE_WIDTH;

/** Extra +/−/wheel steps on top of Fit/75/100. Integer count; 0 is none. */
export const PREVIEW_ZOOM_BUMP_DEFAULT = 0;
export const PREVIEW_ZOOM_BUMP_MIN = -24;
export const PREVIEW_ZOOM_BUMP_MAX = 24;
/** 5% of 100% width — always 30px of display width, even on 9:16. */
export const PREVIEW_ZOOM_STEP_PX = 30;
export const PREVIEW_ZOOM_STEP_SCALE =
  PREVIEW_ZOOM_STEP_PX / PREVIEW_ZOOM_NATIVE_WIDTH;
export const PREVIEW_ZOOM_SCALE_MIN = 0.08;
export const PREVIEW_ZOOM_SCALE_MAX = 1;

export const FILLED_PHOTO_SLOT_SELECTOR = ".pod-photo:not(.is-empty)";
export const POST_ZOOM_BOARD_SELECTOR = ".sc-stage__board";
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
  if (!Number.isFinite(n)) {
    return PREVIEW_ZOOM_BUMP_DEFAULT;
  }
  return Math.min(
    PREVIEW_ZOOM_BUMP_MAX,
    Math.max(PREVIEW_ZOOM_BUMP_MIN, Math.round(n)),
  );
};

export const previewZoomBaseScale = (zoom: ComposerPreviewZoom) => {
  if (zoom === "100") {
    return PREVIEW_ZOOM_NATURAL_SCALE;
  }
  if (zoom === "75") {
    return PREVIEW_ZOOM_SEVENTY_FIVE;
  }
  return PREVIEW_ZOOM_FIT_SCALE;
};

export const previewZoomFactor = (
  zoom: ComposerPreviewZoom,
  bump = PREVIEW_ZOOM_BUMP_DEFAULT,
) => {
  const scale =
    previewZoomBaseScale(zoom) +
    parseComposerPreviewZoomBump(bump) * PREVIEW_ZOOM_STEP_SCALE;
  return Math.min(
    PREVIEW_ZOOM_SCALE_MAX,
    Math.max(PREVIEW_ZOOM_SCALE_MIN, scale),
  );
};

export const previewZoomDisplaySize = (
  boardW: number,
  boardH: number,
  zoom: ComposerPreviewZoom,
  bump = PREVIEW_ZOOM_BUMP_DEFAULT,
) => {
  const factor = previewZoomFactor(zoom, bump);
  return { width: boardW * factor, height: boardH * factor };
};

/** Page may always scroll so the full post is reachable under a tall HUD. */
export const composerPreviewAllowsPageScroll = (
  _zoom?: ComposerPreviewZoom,
  _bump = PREVIEW_ZOOM_BUMP_DEFAULT,
) => true;

const asClosestHost = (node: unknown) => {
  if (!node || typeof node !== "object") {
    return null;
  }
  const closest = (node as { closest?: unknown }).closest;
  if (typeof closest !== "function") {
    return null;
  }
  return node as Element;
};

export const isFilledPhotoSlot = (node: unknown) => {
  const el = asClosestHost(node);
  return Boolean(el?.closest(FILLED_PHOTO_SLOT_SELECTOR));
};

export type PreviewWheelPoint = {
  target?: unknown;
  clientX?: number;
  clientY?: number;
};

const hitAtPoint = (x: number, y: number) => {
  if (typeof document === "undefined" || typeof document.elementFromPoint !== "function") {
    return null;
  }
  const hit = document.elementFromPoint(x, y);
  return hit instanceof Element ? hit : null;
};

export const filledPhotoSlotAtPoint = (x: number, y: number) =>
  hitAtPoint(x, y)?.closest(FILLED_PHOTO_SLOT_SELECTOR) ?? null;

export const postBoardAtPoint = (x: number, y: number) =>
  hitAtPoint(x, y)?.closest(POST_ZOOM_BOARD_SELECTOR) ?? null;

/** Hover/focus on a filled player image: wheel/pinch crop that photo, not the post. */
export const wheelScalesPhoto = (event: PreviewWheelPoint) => {
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

/**
 * Wheel over the 4:5 post (not a croppable photo) scales the whole post.
 * HUD, leftover chrome, and empty page scroll instead.
 */
export const wheelScalesPost = (event: PreviewWheelPoint) => {
  if (wheelScalesPhoto(event)) {
    return false;
  }
  const target = asClosestHost(event.target);
  if (target?.closest(POST_ZOOM_SKIP_SELECTOR)) {
    return false;
  }
  if (target?.closest(POST_ZOOM_BOARD_SELECTOR)) {
    return true;
  }
  if (
    typeof event.clientX !== "number" ||
    typeof event.clientY !== "number"
  ) {
    return false;
  }
  const hit = hitAtPoint(event.clientX, event.clientY);
  if (hit?.closest(POST_ZOOM_SKIP_SELECTOR)) {
    return false;
  }
  return Boolean(hit?.closest(POST_ZOOM_BOARD_SELECTOR));
};

export const stepPreviewZoomBump = (bump: number, direction: 1 | -1) =>
  parseComposerPreviewZoomBump(parseComposerPreviewZoomBump(bump) + direction);

export const bumpFromWheelDelta = (bump: number, deltaY: number) => {
  const current = parseComposerPreviewZoomBump(bump);
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return current;
  }
  return stepPreviewZoomBump(current, deltaY < 0 ? 1 : -1);
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
