import { describe, expect, it } from "vitest";
import {
  composerLookClass,
  headshotGlowPx,
  headshotSilhouettePx,
  IMPROVE_LIGHT_TOP,
  IMPROVE_RIM_BLACK,
  IMPROVE_RIM_WHITE,
  improveCellInset,
  improveCellLine,
  isImprovedLook,
  parseComposerLook,
} from "./composerLook";
import { TIER_WRAP_COLS } from "../tierListComposer/tierLayout";

describe("composer look", () => {
  it("treats only improve as the alternate look", () => {
    expect(parseComposerLook("improve")).toBe("improve");
    expect(parseComposerLook("classic")).toBe("classic");
    expect(parseComposerLook("neon")).toBe("classic");
    expect(parseComposerLook("glow")).toBe("classic");
    expect(parseComposerLook(null)).toBe("classic");
    expect(parseComposerLook({ look: "improve" })).toBe("classic");
    expect(isImprovedLook("improve")).toBe(true);
    expect(isImprovedLook("classic")).toBe(false);
    expect(composerLookClass("improve")).toBe("is-improve");
    expect(composerLookClass("classic")).toBe("");
  });

  it("uses black rims, white on dark, and no gold wash", () => {
    expect(IMPROVE_RIM_BLACK).toBe("#0a0a0a");
    expect(IMPROVE_RIM_WHITE).toBe("#ffffff");
    expect(IMPROVE_LIGHT_TOP.toLowerCase()).not.toMatch(/d4b56a|ecd694|fff4d6/);
    expect(improveCellInset(200)).toBe(6);
    expect(improveCellLine(200)).toBe(3);
    expect(improveCellInset(200) * 2 + improveCellLine(200)).toBeLessThan(200);
    expect(headshotGlowPx(120)).toBe(14);
  });

  it("keeps player silhouette shadows inside a modest outline offset", () => {
    const shadow = headshotSilhouettePx(180);
    expect(shadow.tightX).toBe(8);
    expect(shadow.tightY).toBe(10);
    expect(shadow.softY).toBeGreaterThan(shadow.tightY);
    expect(shadow.softX + shadow.softBlur).toBeLessThan(180 * 0.14);
  });

  it("does not change the wrap-after-8 tier grid", () => {
    expect(TIER_WRAP_COLS).toBe(8);
  });
});
