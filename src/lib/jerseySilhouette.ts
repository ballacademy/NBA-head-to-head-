/**
 * Symmetric NBA tank jersey silhouette in a 32x32 coordinate space.
 * Right-half keypoints are the source of truth; the left half is produced by
 * mirroring across the vertical centerline (x = 16).
 */
export const JERSEY_VIEWBOX_SIZE = 32;
export const JERSEY_CENTER_X = 16;

/** Mirror an x coordinate across the vertical centerline. */
export const mirrorJerseyX = (x: number) => JERSEY_VIEWBOX_SIZE - x;

type Pt = readonly [number, number];

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);
const pt = ([x, y]: Pt) => `${fmt(x)} ${fmt(y)}`;
const leftOf = ([x, y]: Pt): Pt => [mirrorJerseyX(x), y];

/**
 * Right-half keypoints (x >= center).
 * Vertically centered in the viewBox: straps y=6.5, hem y=26.5.
 */
const RIGHT = {
  strap: [21.5, 6.5] as Pt,
  outer: [25.9, 7.9] as Pt,
  arm1Cp1: [26.55, 9.9] as Pt,
  arm1Cp2: [26.05, 12.55] as Pt,
  arm1End: [24.4, 14.55] as Pt,
  arm2Cp1: [23.7, 16.2] as Pt,
  arm2Cp2: [23.4, 17.7] as Pt,
  arm2End: [23.4, 19.25] as Pt,
  hem: [23.2, 26.5] as Pt,
} as const;

const NECK = {
  join: [19.5, 8.35] as Pt,
  /** Quadratic control for the full neck (left join → right join). */
  dipControl: [16, 10.45] as Pt,
  cutTop: [16, 8.15] as Pt,
} as const;

/**
 * Full body outline, built left→right across the neck then down the right
 * armhole and back up the mirrored left armhole. Every left point is the
 * exact mirror of its right counterpart.
 */
export const JERSEY_BODY_PATH = (() => {
  const L = {
    outer: leftOf(RIGHT.outer),
    strap: leftOf(RIGHT.strap),
    join: leftOf(NECK.join),
    arm1Cp1: leftOf(RIGHT.arm1Cp1),
    arm1Cp2: leftOf(RIGHT.arm1Cp2),
    arm1End: leftOf(RIGHT.arm1End),
    arm2Cp1: leftOf(RIGHT.arm2Cp1),
    arm2Cp2: leftOf(RIGHT.arm2Cp2),
    arm2End: leftOf(RIGHT.arm2End),
    hem: leftOf(RIGHT.hem),
  };

  return [
    `M${pt(L.outer)}`,
    `L${pt(L.strap)}`,
    `L${pt(L.join)}`,
    `Q${pt(NECK.dipControl)} ${pt(NECK.join)}`,
    `L${pt(RIGHT.strap)}`,
    `L${pt(RIGHT.outer)}`,
    `C${pt(RIGHT.arm1Cp1)} ${pt(RIGHT.arm1Cp2)} ${pt(RIGHT.arm1End)}`,
    `C${pt(RIGHT.arm2Cp1)} ${pt(RIGHT.arm2Cp2)} ${pt(RIGHT.arm2End)}`,
    `L${pt(RIGHT.hem)}`,
    `L${pt(L.hem)}`,
    `L${pt(L.arm2End)}`,
    `C${pt(L.arm2Cp2)} ${pt(L.arm2Cp1)} ${pt(L.arm1End)}`,
    `C${pt(L.arm1Cp2)} ${pt(L.arm1Cp1)} ${pt(L.outer)}`,
    "Z",
  ].join("");
})();

export const JERSEY_NECK_CUTOUT_PATH = [
  `M${pt(leftOf(NECK.join))}`,
  `Q${pt(NECK.dipControl)} ${pt(NECK.join)}`,
  `Q${pt(NECK.cutTop)} ${pt(leftOf(NECK.join))}`,
  "Z",
].join("");

export const JERSEY_COLLAR_PATH = [
  `M${pt(leftOf(NECK.join))}`,
  `Q${pt(NECK.dipControl)} ${pt(NECK.join)}`,
].join("");

export const JERSEY_SILHOUETTE_PATH =
  `${JERSEY_BODY_PATH}${JERSEY_NECK_CUTOUT_PATH}`;

/**
 * Visual center of the torso panel on the vertical symmetry axis
 * (between the neck curve and the hem).
 */
export const JERSEY_NUMBER_Y = 17.55;

/** Total width for multi-digit numbers; digits get equal slots across this span. */
export const JERSEY_NUMBER_MAX_WIDTH = 10.5;

/** Font size in viewBox units; kept modest so CSS-enlarged jerseys grow more than digits. */
export const getJerseyNumberFontSize = (label: string) =>
  label.replace(/\D/g, "").length >= 2 ? 7.6 : 9.6;

/** Right-half samples for bilateral symmetry tests. */
export const JERSEY_SYMMETRY_SAMPLES: Pt[] = [
  RIGHT.strap,
  RIGHT.outer,
  RIGHT.arm1Cp1,
  RIGHT.arm1Cp2,
  RIGHT.arm1End,
  RIGHT.arm2Cp1,
  RIGHT.arm2Cp2,
  RIGHT.arm2End,
  RIGHT.hem,
  NECK.join,
  NECK.dipControl,
  NECK.cutTop,
];
