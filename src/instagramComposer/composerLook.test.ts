import { describe, expect, it } from "vitest";
import {
  composerFlairClass,
  composerLookClass,
  FRAME_BLACK,
  FRAME_WHITE,
  FRAME_WIDTH,
  frameColor,
  frameLinePx,
  framesOn,
  headshotGlowPx,
  headshotSilhouettePx,
  hairlineLinePx,
  IDENTITY_PURPLE,
  innerFrameRect,
  purplePlateOutsetRect,
  parseComposerLook,
  parsePurpleFlair,
  parseShowTeamHairline,
  TEAM_HAIRLINE_PX,
  teamHairlineColor,
} from "./composerLook";
import { COMPOSER_LIBRARY_KEYS } from "./composerLibrary";
import { TIER_WRAP_COLS } from "../tierListComposer/tierLayout";

describe("composer look", () => {
  it("treats the toggle as white, black, or no frames", () => {
    expect(parseComposerLook("white")).toBe("white");
    expect(parseComposerLook("classic")).toBe("white");
    expect(parseComposerLook("black")).toBe("black");
    expect(parseComposerLook("improve")).toBe("black");
    expect(parseComposerLook("none")).toBe("none");
    expect(parseComposerLook("off")).toBe("none");
    expect(parseComposerLook("neon")).toBe("white");
    expect(parseComposerLook(null)).toBe("white");
    expect(parseComposerLook({ look: "black" })).toBe("white");
    expect(composerLookClass("white")).toBe("is-white");
    expect(composerLookClass("black")).toBe("is-black");
    expect(composerLookClass("none")).toBe("is-none");
    expect(frameColor("white")).toBe(FRAME_WHITE);
    expect(frameColor("black")).toBe(FRAME_BLACK);
    expect(frameColor("none")).toBe("transparent");
    expect(frameColor(null)).toBe(FRAME_WHITE);
    expect(framesOn("white")).toBe(true);
    expect(framesOn("none")).toBe(false);
  });

  it("keeps the stroke in the outer band so artwork cannot cover it", () => {
    expect(FRAME_WHITE).toBe("#ffffff");
    expect(FRAME_BLACK).toBe("#0a0a0a");
    expect(FRAME_WIDTH).toBe(4);
    const inner = innerFrameRect(10, 20, 200, 200, 1);
    expect(inner.line).toBe(4);
    expect(inner.x).toBe(14);
    expect(inner.y).toBe(24);
    expect(inner.w).toBe(192);
    expect(inner.h).toBe(192);
    expect(inner.x + inner.w).toBe(10 + 200 - inner.line);
    expect(frameLinePx(2)).toBe(8);
    expect(frameLinePx(2, "none")).toBe(0);
    expect(innerFrameRect(10, 20, 200, 200, 1, "none")).toEqual({
      x: 10,
      y: 20,
      w: 200,
      h: 200,
      line: 0,
    });
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

  it("includes pyramid and headline named-save buckets", () => {
    expect(COMPOSER_LIBRARY_KEYS).toContain("ddgm:pyramid-composer:saves");
    expect(COMPOSER_LIBRARY_KEYS).toContain("ddgm:headline-composer:saves");
    expect(COMPOSER_LIBRARY_KEYS).toContain("ddgm:lineup-composer:saves");
    expect(COMPOSER_LIBRARY_KEYS).toContain("ddgm:compare-composer:saves");
    expect(COMPOSER_LIBRARY_KEYS).toContain("ddgm:quote-composer:saves");
    expect(COMPOSER_LIBRARY_KEYS).toContain("ddgm:play-in-composer:saves");
  });

  it("keeps kyber purple off by default and electric, not pastel", () => {
    expect(parsePurpleFlair(undefined)).toBe(false);
    expect(parsePurpleFlair(false)).toBe(false);
    expect(parsePurpleFlair(true)).toBe(true);
    expect(composerFlairClass(true)).toBe("is-purple");
    expect(composerFlairClass(false)).toBe("");
    expect(IDENTITY_PURPLE.toLowerCase()).toBe("#b026ff");
    const r = Number.parseInt(IDENTITY_PURPLE.slice(1, 3), 16);
    const b = Number.parseInt(IDENTITY_PURPLE.slice(5, 7), 16);
    expect(b).toBeGreaterThan(r);
  });

  it("paints the kyber title-plate ring outside the box, matching preview box-shadow", () => {
    const outer = purplePlateOutsetRect(100, 200, 400, 80, 2);
    expect(outer.line).toBe(5);
    expect(outer.x).toBeLessThan(100);
    expect(outer.y).toBeLessThan(200);
    expect(outer.x + outer.w).toBeGreaterThan(500);
    expect(outer.y + outer.h).toBeGreaterThan(280);
  });

  it("keeps a 1px team hairline inside the white/black frame and off by default only when toggled", () => {
    expect(TEAM_HAIRLINE_PX).toBe(1);
    expect(hairlineLinePx(1)).toBe(1);
    expect(hairlineLinePx(2)).toBe(2);
    expect(parseShowTeamHairline(undefined)).toBe(true);
    expect(parseShowTeamHairline(false)).toBe(false);
    expect(teamHairlineColor(null, "white")).toBeNull();
    expect(teamHairlineColor("LAL", "white")).toBe("#552583");
    expect(teamHairlineColor("BKN", "black")).toBe("#FFFFFF");
    const inner = innerFrameRect(0, 0, 200, 400, 1);
    expect(inner.x).toBe(FRAME_WIDTH);
    expect(inner.x + hairlineLinePx(1)).toBeGreaterThan(FRAME_WIDTH);
  });
});
