import { describe, expect, it } from "vitest";
import { STC_PANEL } from "../statCardComposer/statCardLayout";
import {
  DEFAULT_PHOTO_GRADE_MIX,
  PHOTO_GRADE_FILTER,
  PHOTO_GRADE_PANEL,
  PHOTO_GRADE_WATERMARK,
  composerGradeClass,
  gradeChannel,
  gradeImageData,
  gradePanelFill,
  gradedWatermarkOpacity,
  parsePhotoGrade,
  photoGradeFilter,
  photoGradeRamp,
} from "./photoGrade";
import { composerWatermarkOpacity } from "./composerWatermark";

describe("composer photo grade", () => {
  it("stays off by default and tags the board when on", () => {
    expect(parsePhotoGrade(undefined)).toBe(false);
    expect(parsePhotoGrade(false)).toBe(false);
    expect(parsePhotoGrade(true)).toBe(true);
    expect(composerGradeClass(false)).toBe("");
    expect(composerGradeClass(true)).toBe("is-grade");
  });

  it("ramps the main bar so low is a slight lift and high is strong", () => {
    expect(photoGradeRamp(0)).toBe(0);
    expect(photoGradeRamp(4)).toBeGreaterThan(0.12);
    expect(photoGradeRamp(4)).toBeLessThan(photoGradeRamp(25));
    expect(photoGradeRamp(25)).toBeLessThan(photoGradeRamp(80));
    expect(photoGradeFilter(4)).not.toBe(photoGradeFilter(80));
    expect(photoGradeFilter(1)).not.toBe(photoGradeFilter(4));
    expect(Math.abs(gradeChannel(96, 4) - 96)).toBeGreaterThan(0);
    expect(Math.abs(gradeChannel(96, 4) - 96)).toBeLessThan(
      Math.abs(gradeChannel(96, 80) - 96),
    );
    expect(photoGradeFilter(100)).toMatch(/brightness\(1\./);
    expect(PHOTO_GRADE_FILTER).toMatch(/contrast\(/);
    expect(PHOTO_GRADE_FILTER).toMatch(/saturate\(/);
    expect(PHOTO_GRADE_FILTER).not.toMatch(/font/);
  });

  it("adds structure without crushing blacks", () => {
    expect(gradeChannel(18, 100)).toBeGreaterThanOrEqual(18);
    expect(gradeChannel(28, 100)).toBeGreaterThanOrEqual(28);
    expect(gradeChannel(48, 80)).not.toBe(gradeChannel(48, 4));
    expect(gradeChannel(236, 100)).toBeGreaterThanOrEqual(230);
    expect(gradeChannel(252, 100)).toBeGreaterThanOrEqual(248);
    const crushed = {
      ...DEFAULT_PHOTO_GRADE_MIX,
      protect: 0,
      structure: 100,
      low: 100,
    };
    expect(gradeChannel(18, 100, DEFAULT_PHOTO_GRADE_MIX)).toBeGreaterThanOrEqual(
      gradeChannel(18, 100, crushed),
    );
  });

  it("grades pixel buffers in place and skips empty pixels", () => {
    const image = {
      data: new Uint8ClampedArray([
        36, 36, 36, 255, 220, 220, 220, 255, 10, 10, 10, 0, 128, 128, 128, 255,
      ]),
      width: 2,
      height: 2,
    } as ImageData;
    gradeImageData(image, 0, 100);
    expect(image.data[0]).toBeGreaterThanOrEqual(36);
    expect(image.data[4]).toBeGreaterThanOrEqual(215);
    expect(image.data[8]).toBe(10);
    expect(image.data[11]).toBe(0);
  });

  it("brightens the Stat panel and quiets the team watermark", () => {
    expect(PHOTO_GRADE_PANEL.toLowerCase()).toBe("#f3f3f3");
    expect(gradePanelFill(STC_PANEL, false)).toBe(STC_PANEL);
    expect(gradePanelFill(STC_PANEL, true)).toBe(PHOTO_GRADE_PANEL);
    const panel = Number.parseInt(PHOTO_GRADE_PANEL.slice(1), 16);
    const mud = Number.parseInt(STC_PANEL.slice(1), 16);
    expect(panel).toBeGreaterThan(mud);
    const faint = composerWatermarkOpacity("faint");
    expect(gradedWatermarkOpacity(faint, true)).toBeLessThan(faint);
    expect(gradedWatermarkOpacity(faint, true)).toBeCloseTo(
      faint * PHOTO_GRADE_WATERMARK,
    );
    expect(gradedWatermarkOpacity(faint, false)).toBe(faint);
  });
});
