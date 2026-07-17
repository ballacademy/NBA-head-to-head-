import { describe, expect, it } from "vitest";
import {
  JERSEY_BODY_PATH,
  JERSEY_CENTER_X,
  JERSEY_COLLAR_PATH,
  JERSEY_NECK_CUTOUT_PATH,
  JERSEY_NUMBER_ZONE,
  JERSEY_SYMMETRY_SAMPLES,
  JERSEY_VIEWBOX_SIZE,
  getJerseyNumberFontSize,
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

  it("keeps the number plate centered with padding inside the torso", () => {
    expect(JERSEY_NUMBER_ZONE.centerX).toBe(JERSEY_CENTER_X);
    expect(JERSEY_NUMBER_ZONE.x + JERSEY_NUMBER_ZONE.width / 2).toBeCloseTo(
      JERSEY_CENTER_X,
      5,
    );
    expect(JERSEY_NUMBER_ZONE.width).toBeLessThanOrEqual(12);
    expect(JERSEY_NUMBER_ZONE.x).toBeGreaterThanOrEqual(9.5);
    expect(
      JERSEY_NUMBER_ZONE.x + JERSEY_NUMBER_ZONE.width,
    ).toBeLessThanOrEqual(22.5);
    expect(getJerseyNumberFontSize("7")).toBeGreaterThan(
      getJerseyNumberFontSize("23"),
    );
    expect(getJerseyNumberFontSize("23")).toBeGreaterThanOrEqual(8);
  });
});
