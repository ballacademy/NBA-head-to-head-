import { describe, expect, it } from "vitest";
import {
  panFromPinch,
  panFromPointerDrag,
  photoPointDistance,
  zoomFromPinch,
  zoomFromWheelDelta,
} from "./photoGestures";
import { DEFAULT_CUSTOM_PAN, MAX_PHOTO_ZOOM, MIN_PHOTO_ZOOM } from "./playerOfTheDayState";

describe("photo gestures", () => {
  it("pinch-zooms from the distance ratio and clamps", () => {
    expect(zoomFromPinch(2, 100, 200)).toBe(4);
    expect(zoomFromPinch(2, 100, 50)).toBe(1);
    expect(zoomFromPinch(2, 0, 100)).toBe(2);
    expect(panFromPinch(DEFAULT_CUSTOM_PAN, 80, 480, { x: 0, y: 0 }, { x: 0, y: 0 }, 200, 200).zoom).toBe(
      MAX_PHOTO_ZOOM,
    );
    expect(
      panFromPinch(
        { ...DEFAULT_CUSTOM_PAN, zoom: 2 },
        200,
        40,
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        200,
        200,
      ).zoom,
    ).toBe(MIN_PHOTO_ZOOM);
  });

  it("drags pan opposite the pointer and keeps zoom/rotate", () => {
    const start = { x: 0.5, y: 0.5, zoom: 2, rotate: 90 };
    const next = panFromPointerDrag(start, 40, -20, 200, 100);
    expect(next.x).toBeLessThan(start.x);
    expect(next.y).toBeGreaterThan(start.y);
    expect(next.zoom).toBe(2);
    expect(next.rotate).toBe(90);
    expect(photoPointDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("zooms in when the wheel or trackpad pinch reports a negative delta", () => {
    expect(zoomFromWheelDelta(2, -100)).toBeGreaterThan(2);
    expect(zoomFromWheelDelta(2, 100)).toBeLessThan(2);
    expect(zoomFromWheelDelta(2, 0)).toBe(2);
  });
});
