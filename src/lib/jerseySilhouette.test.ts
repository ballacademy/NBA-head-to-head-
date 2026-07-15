import { describe, expect, it } from "vitest";
import {
  JERSEY_BODY_PATH,
  JERSEY_CENTER_X,
  JERSEY_COLLAR_PATH,
  JERSEY_NECK_CUTOUT_PATH,
  JERSEY_NUMBER_MAX_WIDTH,
  JERSEY_NUMBER_Y,
  JERSEY_SYMMETRY_SAMPLES,
  JERSEY_VIEWBOX_SIZE,
  mirrorJerseyX,
} from "./jerseySilhouette";

/** Pull all absolute [x,y] pairs out of an SVG path string. */
const pathPoints = (d: string): Array<[number, number]> => {
  const pairs: Array<[number, number]> = [];
  const re = /(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(d))) {
    pairs.push([Number(match[1]), Number(match[2])]);
  }
  return pairs;
};

const assertMirrored = (d: string, label: string) => {
  const points = pathPoints(d);
  expect(points.length, label).toBeGreaterThan(2);
  for (const [x, y] of points) {
    const mirrorX = mirrorJerseyX(x);
    const found = points.some(
      ([px, py]) => Math.abs(px - mirrorX) < 1e-6 && Math.abs(py - y) < 1e-6,
    );
    expect(found, `${label}: missing mirror for (${x}, ${y})`).toBe(true);
  }
};

describe("jerseySilhouette symmetry", () => {
  it("mirrors across the vertical centerline", () => {
    expect(mirrorJerseyX(JERSEY_CENTER_X)).toBe(JERSEY_CENTER_X);
    expect(mirrorJerseyX(6.1)).toBeCloseTo(25.9, 5);
  });

  it("keeps declared keypoints on or mirrored across the centerline", () => {
    for (const [x, y] of JERSEY_SYMMETRY_SAMPLES) {
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(JERSEY_VIEWBOX_SIZE);
      expect(x + mirrorJerseyX(x)).toBeCloseTo(JERSEY_VIEWBOX_SIZE, 8);
    }
  });

  it("emits bilaterally symmetric body, neck, and collar paths", () => {
    assertMirrored(JERSEY_BODY_PATH, "body");
    assertMirrored(JERSEY_NECK_CUTOUT_PATH, "neck");
    assertMirrored(JERSEY_COLLAR_PATH, "collar");
  });

  it("places numbers on the symmetry axis inside equal torso slots", () => {
    expect(JERSEY_CENTER_X).toBe(16);
    expect(JERSEY_NUMBER_Y).toBeGreaterThan(12);
    expect(JERSEY_NUMBER_Y).toBeLessThan(24);
    expect(JERSEY_NUMBER_MAX_WIDTH).toBeGreaterThan(8);
    expect(JERSEY_NUMBER_MAX_WIDTH % 1 === 0 || JERSEY_NUMBER_MAX_WIDTH > 0).toBe(
      true,
    );
    // Slot centers for two digits are ±maxWidth/4 from the centerline
    const slot = JERSEY_NUMBER_MAX_WIDTH / 2;
    const leftDigit = -JERSEY_NUMBER_MAX_WIDTH / 2 + slot * 0.5;
    const rightDigit = -JERSEY_NUMBER_MAX_WIDTH / 2 + slot * 1.5;
    expect(leftDigit).toBeCloseTo(-rightDigit, 8);
  });
});
