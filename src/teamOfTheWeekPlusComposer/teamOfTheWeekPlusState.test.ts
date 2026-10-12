import { describe, expect, it } from "vitest";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { DEFAULT_CUSTOM_PAN } from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  PLUS_STARTER_SHARE,
  plusBarRect,
  plusBoardMetrics,
  plusCellRect,
} from "./teamOfTheWeekPlusLayout";
import {
  applyPlayerPick,
  createEmptyPlusSlots,
  DEFAULT_PLUS_STANDOUT_CAPTION,
  DEFAULT_PLUS_STARTER_CAPTION,
  defaultTotwPlusDraft,
  PLUS_SLOT_COUNT,
  PLUS_STANDOUT_COUNT,
  PLUS_STARTER_COUNT,
  setStripPhoto,
  standoutSlots,
  starterSlots,
  usedPlusPlayerIds,
} from "./teamOfTheWeekPlusState";

describe("team of the week plus", () => {
  it("keeps the Instagram 4:5 PNG size", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
  });

  it("uses a taller starter bar and a shorter standouts bench, not a 2×5 grid", () => {
    expect(PLUS_STARTER_COUNT).toBe(5);
    expect(PLUS_STANDOUT_COUNT).toBe(5);
    expect(PLUS_SLOT_COUNT).toBe(10);
    const metrics = plusBoardMetrics();
    expect(metrics.starterH / metrics.photoStackH).toBeCloseTo(
      PLUS_STARTER_SHARE,
      2,
    );
    expect(metrics.starterH).toBeGreaterThan(metrics.standoutH);
    expect(metrics.standoutH / metrics.starterH).toBeLessThan(0.9);
    const starter = plusCellRect("starters", 0);
    const standout = plusCellRect("standouts", 0);
    expect(starter.w).toBeGreaterThan(standout.w);
    expect(starter.h).toBeGreaterThan(standout.h);
    expect(standout.y).toBeGreaterThan(starter.y + starter.h);
    expect(starter.x).toBeLessThan(standout.x);
    const starterBar = plusBarRect("starters");
    const standoutBar = plusBarRect("standouts");
    expect(starterBar.w).toBeCloseTo(starter.w * 5);
    expect(standoutBar.w).toBeCloseTo(standout.w * 5);
    expect(starterBar.w).toBeGreaterThan(standoutBar.w);
  });

  it("defaults compact branding and row captions, with no title plate", () => {
    const draft = defaultTotwPlusDraft();
    expect(draft.brand.toUpperCase()).toBe("BALLACADEMY");
    expect(draft.starterCaption).toBe(DEFAULT_PLUS_STARTER_CAPTION);
    expect(draft.standoutCaption).toBe(DEFAULT_PLUS_STANDOUT_CAPTION);
    expect(draft.slots).toHaveLength(10);
    expect("title" in draft).toBe(false);
    expect(starterSlots(draft.slots)).toHaveLength(5);
    expect(standoutSlots(draft.slots)).toHaveLength(5);
  });

  it("fills ten unique portraits and accepts a custom panned photo", () => {
    const ids = [
      "3945274",
      "1966",
      "4278073",
      "3032977",
      "3112335",
      "4065648",
      "3202",
      "3975",
      "4066261",
      "4432166",
    ];
    let slots = createEmptyPlusSlots();
    ids.forEach((id, index) => {
      const player = getPlayer(id);
      expect(player).toBeTruthy();
      slots = applyPlayerPick(slots, index, player!);
    });
    expect(slots.every((slot) => slot.playerId)).toBe(true);
    expect(Object.keys(usedPlusPlayerIds(slots))).toHaveLength(10);
    expect(usedPlusPlayerIds(slots)["3945274"]).toBe("Starter 1");
    expect(usedPlusPlayerIds(slots)[ids[9]!]).toBe("Standout 5");
    const custom = setStripPhoto(slots, 0, "data:image/png;base64,aaa");
    expect(custom[0]!.customPhoto).toBe(true);
    expect(custom[0]!.pan).toEqual(DEFAULT_CUSTOM_PAN);
  });
});
