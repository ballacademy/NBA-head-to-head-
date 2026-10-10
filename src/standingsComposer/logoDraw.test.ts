import { describe, expect, it } from "vitest";
import {
  LOGO_LIFT,
  fittedLogoRect,
  getOpaqueBoundsFromImageData,
  logoShadowPx,
  opticalShiftX,
} from "./logoDraw";
import {
  BANNER_SHAPE,
  BANNER_VIEW,
  BRAND_CAP_MID_EM,
  BRAND_FONT,
  BANNER_MARGIN_TOP,
  BRAND_SLOT,
  SUB_FONT,
  SUB_OPTICAL_LIFT,
  TITLE_BAND,
  bandCenterY,
  bannerBoardRect,
  bannerStrokeOuterTop,
  brandBaselineY,
  brandEmTop,
  notchFromMeasuredWidth,
  notchInnerY,
  subBaselineY,
  subEmTop,
  trackedTextWidth,
} from "./bannerLayout";
import {
  BANNER_FILL_SHIFT,
  bannerFillImageRect,
  coverRect,
} from "./headerTexture";

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
      cx: 4,
      cy: 5,
    });
  });

  it("reports a right-weighted centroid for a Magic-like mark", () => {
    const width = 20;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);
    const paint = (x: number, y: number, a = 255) => {
      const i = (y * width + x) * 4;
      data[i] = 255;
      data[i + 3] = a;
    };
    for (let x = 2; x <= 8; x += 1) {
      paint(x, 4, 80);
    }
    for (let x = 12; x <= 18; x += 1) {
      paint(x, 5, 255);
      paint(x, 6, 255);
    }
    const bounds = getOpaqueBoundsFromImageData(data, width, height);
    expect(bounds.x).toBe(2);
    expect(bounds.w).toBe(17);
    expect(bounds.cx).toBeGreaterThan(bounds.x + bounds.w / 2);
  });
});

describe("fittedLogoRect", () => {
  it("lifts the trimmed artwork ~3% of cell height", () => {
    const cell = { x: 10, y: 20, w: 400, h: 246 };
    const dest = fittedLogoRect(
      { x: 40, y: 80, w: 200, h: 120 },
      cell.x,
      cell.y,
      cell.w,
      cell.h,
    );
    expect(dest.x + dest.w / 2).toBeCloseTo(cell.x + cell.w / 2, 6);
    expect(dest.y + dest.h / 2).toBeCloseTo(
      cell.y + cell.h / 2 - cell.h * LOGO_LIFT,
      6,
    );
  });

  it("ignores extra PNG padding in the bottom-right of the file", () => {
    const cell = { x: 0, y: 0, w: 300, h: 200 };
    const padded = fittedLogoRect({ x: 80, y: 90, w: 100, h: 80 }, 0, 0, 300, 200);
    const tight = fittedLogoRect({ x: 0, y: 0, w: 100, h: 80 }, 0, 0, 300, 200);
    expect(padded).toEqual(tight);
    expect(padded.x + padded.w / 2).toBeCloseTo(cell.w / 2, 6);
    expect(padded.y + padded.h / 2).toBeCloseTo(cell.h / 2 - cell.h * LOGO_LIFT, 6);
  });

  it("lets a wide wordmark use cell width instead of a square cap", () => {
    const wide = fittedLogoRect({ x: 0, y: 0, w: 460, h: 200 }, 0, 0, 400, 246);
    const round = fittedLogoRect({ x: 0, y: 0, w: 460, h: 460 }, 0, 0, 400, 246);
    expect(wide.w).toBeGreaterThan(round.w);
    expect(wide.x + wide.w / 2).toBeCloseTo(200, 6);
    expect(wide.y + wide.h / 2).toBeCloseTo(123 - 246 * LOGO_LIFT, 6);
  });

  it("shifts a right-heavy mark like Magic slightly left", () => {
    const cellW = 400;
    const cellH = 246;
    const balanced = fittedLogoRect(
      { x: 0, y: 0, w: 460, h: 330, cx: 230, cy: 165 },
      0,
      0,
      cellW,
      cellH,
    );
    const magic = fittedLogoRect(
      { x: 0, y: 0, w: 460, h: 330, cx: 272, cy: 178 },
      0,
      0,
      cellW,
      cellH,
    );
    expect(magic.x).toBeLessThan(balanced.x);
    expect(balanced.x - magic.x).toBeGreaterThan(cellW * 0.02);
    expect(balanced.x - magic.x).toBeLessThan(cellW * 0.06);
    expect(opticalShiftX({ x: 0, y: 0, w: 460, h: 330, cx: 230 }, 200, cellW)).toBe(0);
  });

  it("does not optically shift a balanced circular mark", () => {
    const dest = fittedLogoRect(
      { x: 20, y: 20, w: 460, h: 460, cx: 250, cy: 250 },
      0,
      0,
      400,
      246,
    );
    const box = fittedLogoRect({ x: 20, y: 20, w: 460, h: 460 }, 0, 0, 400, 246);
    expect(dest.x).toBeCloseTo(box.x, 6);
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
    const titleY = bandCenterY(0, 200, TITLE_BAND.topFrac, TITLE_BAND.heightFrac);
    expect(titleY).toBeCloseTo((BANNER_SHAPE.top + BANNER_SHAPE.waist) / 2);
  });

  it("raises EASTERN CONFERENCE into the inner notch pocket", () => {
    const { top, bottom } = notchInnerY(1);
    const geo = (top + bottom) / 2;
    const pocketH = bottom - top;
    const capCenter = subEmTop(1) + SUB_FONT * BRAND_CAP_MID_EM;
    expect(SUB_OPTICAL_LIFT).toBeGreaterThan(0.15);
    expect(capCenter).toBeCloseTo(geo - pocketH * SUB_OPTICAL_LIFT, 5);
    expect(geo - capCenter).toBeGreaterThan(pocketH * 0.15);
    expect(subBaselineY(1)).toBeLessThan(geo);
    expect(subEmTop(1)).toBeGreaterThan(top);
    expect(subEmTop(1) + SUB_FONT).toBeLessThan(bottom);
  });

  it("includes letter-spacing when measuring subtitle width", () => {
    expect(trackedTextWidth([10, 10, 10], 4)).toBe(38);
    expect(trackedTextWidth([], 4)).toBe(0);
  });

  it("keeps the title banner origin so logos and title layout do not shift", () => {
    expect(bannerBoardRect(1).y).toBe(BRAND_SLOT + BANNER_MARGIN_TOP);
    expect(bannerBoardRect(1).y).toBe(72);
  });

  it("places a larger BALLACADEMY optically in the gap above the banner stroke", () => {
    expect(BRAND_FONT).toBe(28);
    const strokeOuter = bannerStrokeOuterTop(1);
    const capCenter = brandEmTop(1) + BRAND_FONT * BRAND_CAP_MID_EM;
    expect(capCenter).toBeCloseTo(strokeOuter / 2, 5);
    expect(brandBaselineY(1)).toBeCloseTo(brandEmTop(1) + BRAND_FONT / 2, 8);
    expect(brandEmTop(1)).toBeGreaterThan(0);
    expect(brandEmTop(1) + BRAND_FONT).toBeLessThan(strokeOuter);
    expect(strokeOuter).toBeLessThan(bannerBoardRect(1).y + 8);
  });
});

describe("header texture cover", () => {
  it("covers a wide header without letterboxing", () => {
    const placed = coverRect(679, 350, 0, 0, 1200, 268);
    expect(placed.dw).toBeGreaterThanOrEqual(1200);
    expect(placed.dh).toBeGreaterThanOrEqual(268);
    expect(placed.dx + placed.dw).toBeGreaterThanOrEqual(1200);
    expect(placed.dy + placed.dh).toBeGreaterThanOrEqual(268);
  });

  it("shifts the title-box grain so it does not match the header field", () => {
    const dest = bannerFillImageRect(10, 20, 100, 50);
    expect(dest.x).toBeCloseTo(10 - 100 * BANNER_FILL_SHIFT.x);
    expect(dest.y).toBeCloseTo(20 - 50 * BANNER_FILL_SHIFT.y);
    expect(dest.w).toBeCloseTo(100 + 200 * BANNER_FILL_SHIFT.x);
    expect(dest.h).toBeCloseTo(50 + 100 * BANNER_FILL_SHIFT.y);
  });
});
