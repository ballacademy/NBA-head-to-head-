import { describe, expect, it } from "vitest";
import {
  composerLookClass,
  headshotGlowPx,
  headshotSilhouettePx,
  isNeonLook,
  neonCellBlur,
  neonCellInset,
  neonCellLine,
  parseComposerLook,
} from "./composerLook";
import { TIER_WRAP_COLS } from "../tierListComposer/tierLayout";

describe("composer look", () => {
  it("treats only neon as the alternate look", () => {
    expect(parseComposerLook("neon")).toBe("neon");
    expect(parseComposerLook("classic")).toBe("classic");
    expect(parseComposerLook("glow")).toBe("classic");
    expect(parseComposerLook(null)).toBe("classic");
    expect(parseComposerLook({ look: "neon" })).toBe("classic");
    expect(isNeonLook("neon")).toBe(true);
    expect(isNeonLook("classic")).toBe(false);
    expect(composerLookClass("neon")).toBe("is-neon");
    expect(composerLookClass("classic")).toBe("");
  });

  it("keeps neon cell metrics inside the box", () => {
    expect(neonCellInset(200)).toBe(6);
    expect(neonCellLine(200)).toBe(4);
    expect(neonCellBlur(200)).toBe(22);
    expect(neonCellInset(200) * 2 + neonCellLine(200)).toBeLessThan(200);
    expect(headshotGlowPx(120)).toBe(14);
  });

  it("keeps player silhouette shadows inside a modest outline offset", () => {
    const shadow = headshotSilhouettePx(180);
    expect(shadow.tightX).toBe(5);
    expect(shadow.tightY).toBe(7);
    expect(shadow.softY).toBeGreaterThan(shadow.tightY);
    expect(shadow.softX + shadow.softBlur).toBeLessThan(180 * 0.12);
  });

  it("does not change the wrap-after-8 tier grid", () => {
    expect(TIER_WRAP_COLS).toBe(8);
  });
});
