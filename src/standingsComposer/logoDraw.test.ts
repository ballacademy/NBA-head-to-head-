import { describe, expect, it } from "vitest";
import {
  fittedLogoRect,
  getOpaqueBoundsFromImageData,
  logoShadowPx,
} from "./logoDraw";
import {
  BANNER_SHAPE,
  BANNER_VIEW,
  SUB_BAND,
  TITLE_BAND,
  bandCenterY,
  notchFromMeasuredWidth,
  trackedTextWidth,
} from "./bannerLayout";

describe("getOpaqueBoundsFromImageData", () => {
  it("trims transparent padding so the opaque mark can be centered", () => {
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);
    const paint = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      data[i] = 255;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    };
    paint(2, 3);
    paint(6, 3);
    paint(2, 7);
    paint(6, 7);
    expect(getOpaqueBoundsFromImageData(data, width, height)).toEqual({
      x: 2,
      y: 3,
      w: 5,
      h: 5,
    });
  });
});

describe("fittedLogoRect", () => {
  it("puts the trimmed artwork center on the cell center", () => {
    const cell = { x: 10, y: 20, w: 400, h: 246 };
    const dest = fittedLogoRect({ x: 40, y: 80, w: 200, h: 120 }, cell.x, cell.y, cell.w, cell.h);
    expect(dest.x + dest.w / 2).toBeCloseTo(cell.x + cell.w / 2, 6);
    expect(dest.y + dest.h / 2).toBeCloseTo(cell.y + cell.h / 2, 6);
  });

  it("ignores extra PNG padding in the bottom-right of the file", () => {
    const cell = { x: 0, y: 0, w: 300, h: 200 };
    const padded = fittedLogoRect({ x: 80, y: 90, w: 100, h: 80 }, 0, 0, 300, 200);
    const tight = fittedLogoRect({ x: 0, y: 0, w: 100, h: 80 }, 0, 0, 300, 200);
    expect(padded).toEqual(tight);
    expect(padded.x + padded.w / 2).toBeCloseTo(cell.w / 2, 6);
    expect(padded.y + padded.h / 2).toBeCloseTo(cell.h / 2, 6);
  });

  it("lets a wide wordmark use cell width instead of a square cap", () => {
    const wide = fittedLogoRect({ x: 0, y: 0, w: 460, h: 200 }, 0, 0, 400, 246);
    const round = fittedLogoRect({ x: 0, y: 0, w: 460, h: 460 }, 0, 0, 400, 246);
    expect(wide.w).toBeGreaterThan(round.w);
    expect(wide.x + wide.w / 2).toBeCloseTo(200, 6);
    expect(wide.y + wide.h / 2).toBeCloseTo(123, 6);
  });

  it("keeps shadow length in cell pixels without shifting the dest rect", () => {
    expect(logoShadowPx(400, 246)).toBe(Math.round(246 * 0.12));
  });
});

describe("banner notch and bands", () => {
  it("grows the lower notch with a longer conference string", () => {
    const short = notchFromMeasuredWidth(180, 1000);
    const long = notchFromMeasuredWidth(420, 1000);
    expect(long.right - long.left).toBeGreaterThan(short.right - short.left);
    expect((short.left + short.right) / 2).toBeCloseTo(BANNER_VIEW.width / 2, 5);
    expect((long.left + long.right) / 2).toBeCloseTo(BANNER_VIEW.width / 2, 5);
  });

  it("centers title and subtitle in their banner segments", () => {
    expect(TITLE_BAND.topFrac).toBeCloseTo(BANNER_SHAPE.top / BANNER_VIEW.height);
    expect(TITLE_BAND.topFrac + TITLE_BAND.heightFrac).toBeCloseTo(
      BANNER_SHAPE.waist / BANNER_VIEW.height,
    );
    expect(SUB_BAND.topFrac).toBeCloseTo(BANNER_SHAPE.waist / BANNER_VIEW.height);
    const titleY = bandCenterY(0, 200, TITLE_BAND.topFrac, TITLE_BAND.heightFrac);
    const subY = bandCenterY(0, 200, SUB_BAND.topFrac, SUB_BAND.heightFrac);
    expect(titleY).toBeCloseTo((BANNER_SHAPE.top + BANNER_SHAPE.waist) / 2);
    expect(subY).toBeCloseTo((BANNER_SHAPE.waist + BANNER_SHAPE.bottom) / 2);
  });

  it("includes letter-spacing when measuring subtitle width", () => {
    expect(trackedTextWidth([10, 10, 10], 4)).toBe(38);
    expect(trackedTextWidth([], 4)).toBe(0);
  });
});
