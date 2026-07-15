/**
 * Symmetric NBA tank jersey silhouette in a 32x32 coordinate space.
 * Modeled after a front-view Nike/Adidas style jersey: wide shoulder straps,
 * shallow crew neck, deep curved armholes, and a straight body to a flat hem.
 */
export const JERSEY_VIEWBOX_SIZE = 32;
export const JERSEY_CENTER_X = 16;
/** Optical chest center for numbers (between collar and hem). */
export const JERSEY_NUMBER_Y = 18.6;
/** Usable torso width for jersey numbers inside the silhouette. */
export const JERSEY_NUMBER_MAX_WIDTH = 11.2;

export const getJerseyNumberFontSize = (label: string) =>
  label.replace(/\D/g, "").length >= 2 ? 8.6 : 11.25;

export const JERSEY_BODY_PATH =
  "M6.25 8.5L10.5 7.25L12.5 8.75Q16 10.85 19.5 8.75L21.5 7.25L25.75 8.5" +
  "C26.35 10.5 25.85 13 24.35 14.75C23.6 16.35 23.35 17.75 23.35 19.25" +
  "L23.15 27L8.85 27L8.65 19.25C8.65 17.75 8.4 16.35 7.65 14.75" +
  "C6.15 13 5.65 10.5 6.25 8.5Z";

export const JERSEY_NECK_CUTOUT_PATH =
  "M12.75 8.9Q16 11.15 19.25 8.9Q16 8.35 12.75 8.9Z";

export const JERSEY_COLLAR_PATH = "M12.85 9.05Q16 11.05 19.15 9.05";

export const JERSEY_SILHOUETTE_PATH =
  `${JERSEY_BODY_PATH}${JERSEY_NECK_CUTOUT_PATH}`;

/** Nudge the artwork so the silhouette sits optically centered in the circle. */
export const JERSEY_ARTWORK_TRANSFORM = "translate(0 -0.35)";
