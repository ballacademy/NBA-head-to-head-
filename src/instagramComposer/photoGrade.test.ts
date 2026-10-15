import { describe, expect, it } from "vitest";
import { STC_PANEL } from "../statCardComposer/statCardLayout";
import {
  PHOTO_GRADE_FILTER,
  PHOTO_GRADE_PANEL,
  PHOTO_GRADE_WATERMARK,
  composerGradeClass,
  gradeChannel,
  gradeImageData,
  gradePanelFill,
  gradedWatermarkOpacity,
  parsePhotoGrade,
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

  it("crushes shadows, keeps whites clean, and adds a contrast S-curve", () => {
    expect(gradeChannel(28)).toBeLessThan(28);
    expect(gradeChannel(48)).toBeLessThan(48);
    const mid = gradeChannel(128);
    expect(Math.abs(mid - 128)).toBeGreaterThanOrEqual(4);
    expect(gradeChannel(236)).toBeGreaterThanOrEqual(230);
    expect(gradeChannel(252)).toBeGreaterThanOrEqual(248);
    expect(PHOTO_GRADE_FILTER).toMatch(/contrast\(/);
    expect(PHOTO_GRADE_FILTER).toMatch(/saturate\(/);
    expect(PHOTO_GRADE_FILTER).not.toMatch(/font/);
  });

  it("grades pixel buffers in place and skips empty pixels", () => {
    const image = {
      data: new Uint8ClampedArray([
        36, 36, 36, 255, 220, 220, 220, 255, 10, 10, 10, 0, 128, 128, 128, 255,
      ]),
      width: 2,
      height: 2,
    } as ImageData;
    gradeImageData(image, 0);
    expect(image.data[0]).toBeLessThan(36);
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
