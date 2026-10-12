import { describe, expect, it } from "vitest";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { TIER_BADGE_SIZE } from "../tierListComposer/tierLayout";
import { DEFAULT_CUSTOM_PAN } from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  PLUS_BA_INSET,
  PLUS_BA_SIZE,
  PLUS_BRAND_SIZE,
  PLUS_HEADER_H,
  PLUS_HEADER_PAD_X,
  PLUS_SECTION_SIZE,
  PLUS_STARTER_SHARE,
  PLUS_STANDOUT_NAME_H,
  PLUS_STARTER_NAME_H,
  PLUS_TITLE_BAND_H,
  PLUS_TITLE_SIZE,
  PLUS_WEEK_BOTTOM,
  PLUS_WEEK_H,
  PLUS_WEEK_SIZE,
  PLUS_ZOOM_STEP,
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
  patchStrip,
  setStripPhoto,
  standoutSlots,
  starterSlots,
  stripPlayerName,
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

  it("uses large centered titles, a readable week, and a small brand mark", () => {
    const draft = defaultTotwPlusDraft();
    expect(draft.brand.toUpperCase()).toBe("BALLACADEMY");
    expect(draft.starterCaption).toBe("TEAM OF THE WEEK");
    expect(draft.standoutCaption).toBe("STANDOUTS OF THE WEEK");
    expect(draft.starterCaption).toBe(DEFAULT_PLUS_STARTER_CAPTION);
    expect(draft.standoutCaption).toBe(DEFAULT_PLUS_STANDOUT_CAPTION);
    expect(PLUS_TITLE_SIZE).toBeGreaterThan(PLUS_SECTION_SIZE);
    expect(PLUS_SECTION_SIZE).toBeGreaterThan(PLUS_BRAND_SIZE * 2);
    expect(PLUS_BA_SIZE).toBe(TIER_BADGE_SIZE);
    expect(PLUS_BA_INSET).toBe((PLUS_HEADER_H - PLUS_BA_SIZE) / 2);
    expect(PLUS_HEADER_PAD_X).toBeGreaterThan(PLUS_BA_SIZE);
    expect(PLUS_WEEK_SIZE).toBeGreaterThanOrEqual(20);
    const metrics = plusBoardMetrics();
    expect(PLUS_TITLE_BAND_H).toBe(
      PLUS_HEADER_H - PLUS_WEEK_BOTTOM - PLUS_WEEK_H,
    );
    expect(metrics.weekY).toBe(PLUS_TITLE_BAND_H);
    expect(metrics.titleY).toBeCloseTo(metrics.weekY / 2);
    expect(metrics.weekY + metrics.weekH + PLUS_WEEK_BOTTOM).toBe(PLUS_HEADER_H);
    expect(metrics.titleY).toBeLessThan(58);
    expect(PLUS_STARTER_NAME_H).toBeGreaterThan(38);
    expect(PLUS_STANDOUT_NAME_H).toBeGreaterThan(32);
    expect(draft.slots).toHaveLength(10);
    expect("title" in draft).toBe(false);
    expect(starterSlots(draft.slots)).toHaveLength(5);
    expect(standoutSlots(draft.slots)).toHaveLength(5);
    expect(draft.showNames).toBe(true);
    expect(PLUS_ZOOM_STEP).toBeGreaterThan(0.25);
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
    expect(stripPlayerName(slots[0]!)).toMatch(/Luka/i);
    expect(stripPlayerName(slots[0]!)).toMatch(/Doncic/i);
    expect(stripPlayerName(slots[1]!)).toMatch(/LeBron/i);
    expect(stripPlayerName(slots[1]!)).toMatch(/James/i);
    expect(Object.keys(usedPlusPlayerIds(slots))).toHaveLength(10);
    expect(usedPlusPlayerIds(slots)["3945274"]).toBe("Starter 1");
    expect(usedPlusPlayerIds(slots)[ids[9]!]).toBe("Standout 5");
    const custom = setStripPhoto(slots, 0, "data:image/png;base64,aaa");
    expect(custom[0]!.customPhoto).toBe(true);
    expect(custom[0]!.pan).toEqual(DEFAULT_CUSTOM_PAN);
    const uploadedEmpty = setStripPhoto(
      createEmptyPlusSlots(),
      0,
      "data:image/jpeg;base64,bbb",
    );
    expect(uploadedEmpty[0]!.playerId).toBeNull();
    expect(uploadedEmpty[0]!.customPhoto).toBe(true);
    expect(
      patchStrip(uploadedEmpty, 0, {
        pan: { x: 0.15, y: 0.7, zoom: 4, rotate: 0 },
      })[0]!.pan.zoom,
    ).toBe(4);
    const kept = applyPlayerPick(
      [
        {
          ...custom[0]!,
          pan: { x: 0.15, y: 0.7, zoom: 5, rotate: 180 },
        },
        ...custom.slice(1),
      ],
      0,
      getPlayer("1966")!,
      true,
    );
    expect(kept[0]!.playerId).toBe("1966");
    expect(kept[0]!.photoSrc).toBe("data:image/png;base64,aaa");
    expect(kept[0]!.customPhoto).toBe(true);
    expect(kept[0]!.pan.zoom).toBe(5);
    expect(kept[0]!.pan.rotate).toBe(180);
  });
});
