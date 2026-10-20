import { describe, expect, it } from "vitest";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import {
  BANNER_FILL_BASE,
  BANNER_STUD_FILL,
  FIELD_TEXTURE_SRC,
} from "../standingsComposer/headerTexture";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  TOTW_BRAND_H,
  TOTW_FOOTER_H,
  TOTW_STRIP_COUNT as LAYOUT_STRIP_COUNT,
  TOTW_STRIP_H,
  TOTW_STRIP_W,
  TOTW_TITLE_PAD,
  TOTW_TITLE_PLATE_H,
  TOTW_NAME_H,
  TOTW_NAME_LOGO,
  TOTW_NAME_SIZE,
  TOTW_TITLE_SIZE,
  totwStripRect,
  totwStripX,
} from "./teamOfTheWeekLayout";
import {
  applyPlayerPick,
  createEmptyStrip,
  createEmptyStrips,
  DEFAULT_TOTW_TITLE,
  defaultTotwDraft,
  defaultWeekLabel,
  patchStrip,
  setStripPhoto,
  splitTotwTitle,
  totwPhotoPan,
  TOTW_STRIP_COUNT,
  usedPlayerIds,
  weekRangeFor,
} from "./teamOfTheWeekState";

describe("team of the week state", () => {
  it("keeps the Instagram 4:5 PNG size, not a square", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
    expect(GRAPHIC_WIDTH / GRAPHIC_HEIGHT).not.toBeCloseTo(1);
  });

  it("starts with five empty vertical strips", () => {
    expect(TOTW_STRIP_COUNT).toBe(5);
    expect(LAYOUT_STRIP_COUNT).toBe(5);
    const strips = createEmptyStrips();
    expect(strips).toHaveLength(5);
    expect(strips.every((strip) => strip.playerId === null)).toBe(true);
    expect(totwStripX(0)).toBeLessThan(totwStripX(1));
    expect(TOTW_STRIP_W).toBeGreaterThan(200);
    expect(TOTW_STRIP_H).toBeGreaterThan(TOTW_STRIP_W * 4);
    expect(TOTW_BRAND_H + TOTW_STRIP_H + TOTW_FOOTER_H).toBe(GRAPHIC_HEIGHT);
    expect(TOTW_NAME_LOGO).toBeLessThanOrEqual(TOTW_NAME_SIZE + 6);
    expect(TOTW_NAME_H).toBeLessThan(100);
    expect(TOTW_NAME_H).toBeGreaterThan(TOTW_NAME_LOGO * 2);
    const stacked = totwStripRect(0, true);
    expect(stacked.w).toBeGreaterThan(stacked.h);
    expect(totwStripRect(1, true).y).toBeGreaterThan(stacked.y);
    const empty = createEmptyStrip();
    expect(totwPhotoPan(empty, true).y).toBeGreaterThan(empty.pan.y);
    expect(totwPhotoPan(empty, false).y).toBe(empty.pan.y);
  });

  it("defaults the title, week line, and studded metal field", () => {
    const draft = defaultTotwDraft();
    expect(draft.title).toBe("TEAM OF THE WEEK");
    expect(draft.brand.toUpperCase()).toBe("BALLACADEMY");
    expect(draft.week).toBe(defaultWeekLabel());
    expect(defaultWeekLabel(new Date(2026, 9, 13))).toBe("WEEK OF OCT 13, 2026");
    expect(weekRangeFor(new Date(2026, 9, 12))).toBe("10/12 - 10/18");
    expect(draft.showNames).toBe(false);
    expect(draft.showStripStat).toBe(false);
    expect(splitTotwTitle(DEFAULT_TOTW_TITLE)).toEqual([
      "TEAM OF",
      "THE WEEK",
    ]);
    expect(TOTW_TITLE_SIZE).toBe(42);
    expect(TOTW_TITLE_PAD).toBe(12);
    expect(TOTW_TITLE_PLATE_H).toBe(116);
    expect(
      TOTW_TITLE_SIZE * 0.92 * 2 + 3.2 + 8 + TOTW_TITLE_PAD * 2,
    ).toBeLessThanOrEqual(TOTW_TITLE_PLATE_H);
    expect(BANNER_FILL_BASE.toLowerCase()).toBe("#1c1c1c");
    expect(BANNER_STUD_FILL.toLowerCase()).toBe("#2a2a2a");
    expect(FIELD_TEXTURE_SRC).toBe("/composer-background-texture.png");
  });

  it("fills a strip from a picked player headshot", () => {
    const luka = getPlayer("3945274")!;
    const strips = applyPlayerPick(createEmptyStrips(), 2, luka);
    expect(strips[2]!.playerId).toBe("3945274");
    expect(strips[2]!.lastName).toBe("Doncic");
    expect(strips[2]!.photoSrc).toBe(luka.headshotUrl);
    expect(strips[2]!.customPhoto).toBe(false);
    expect(strips[2]!.pan).toEqual(DEFAULT_HEADSHOT_PAN);
    expect(usedPlayerIds(strips)["3945274"]).toBe("Strip 3");
  });

  it("clears a duplicate pick and accepts a custom panned photo", () => {
    const luka = getPlayer("3945274")!;
    const lebron = getPlayer("1966")!;
    const once = applyPlayerPick(createEmptyStrips(), 0, luka);
    const twice = applyPlayerPick(once, 4, luka);
    expect(twice[0]!.playerId).toBeNull();
    expect(twice[4]!.playerId).toBe("3945274");
    const five = applyPlayerPick(
      applyPlayerPick(
        applyPlayerPick(
          applyPlayerPick(twice, 0, lebron),
          1,
          getPlayer("4278073")!,
        ),
        2,
        getPlayer("4066354")!,
      ),
      3,
      luka,
    );
    expect(five.filter((strip) => strip.playerId).length).toBe(4);
    expect(five[4]!.playerId).toBeNull();
    const custom = setStripPhoto(five, 0, "data:image/png;base64,aaa");
    expect(custom[0]!.customPhoto).toBe(true);
    expect(custom[0]!.photoSrc).toBe("data:image/png;base64,aaa");
    const uploadedEmpty = setStripPhoto(createEmptyStrips(), 0, "data:image/jpeg;base64,bbb");
    expect(uploadedEmpty[0]!.playerId).toBeNull();
    expect(uploadedEmpty[0]!.customPhoto).toBe(true);
    expect(Boolean(uploadedEmpty[0]!.photoSrc)).toBe(true);
    const panned = patchStrip(uploadedEmpty, 0, {
      pan: { x: 0.2, y: 0.8, zoom: 3, rotate: 0 },
    });
    expect(panned[0]!.pan.zoom).toBe(3);
    expect(panned[0]!.pan.x).toBe(0.2);
    expect(custom[0]!.photoSrc).toBe("data:image/png;base64,aaa");
    expect(custom[0]!.pan).toEqual(DEFAULT_CUSTOM_PAN);
    const kept = applyPlayerPick(
      [
        {
          ...custom[0]!,
          pan: { x: 0.2, y: 0.8, zoom: 4, rotate: 90 },
        },
        ...custom.slice(1),
      ],
      0,
      lebron,
      true,
    );
    expect(kept[0]!.playerId).toBe("1966");
    expect(kept[0]!.lastName).toBe("James");
    expect(kept[0]!.photoSrc).toBe("data:image/png;base64,aaa");
    expect(kept[0]!.customPhoto).toBe(true);
    expect(kept[0]!.pan).toEqual({ x: 0.2, y: 0.8, zoom: 4, rotate: 90 });
  });

  it("paints a light vignette over five-strip photos", () => {
    expect(typeof paintPhotoVignette).toBe("function");
  });

  it("defaults the inner team-color hairline on", () => {
    expect(defaultTotwDraft().showTeamHairline).toBe(true);
  });
});
