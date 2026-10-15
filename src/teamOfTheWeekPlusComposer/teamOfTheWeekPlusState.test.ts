import { describe, expect, it } from "vitest";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { getPlayer, NBA_ACTIVE_PLAYERS } from "../tierListComposer/nbaActivePlayers";
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
import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import { emptyStats } from "../playerOfTheDayComposer/lastGame";
import {
  applyPlayerPick,
  createEmptyPlusSlots,
  fillPlusFromStandouts,
  isPlusStar,
  plusBoardEmpty,
  plusLineupGroup,
  DEFAULT_PLUS_STANDOUT_CAPTION,
  DEFAULT_PLUS_STARTER_CAPTION,
  defaultTotwPlusDraft,
  PLUS_SLOT_COUNT,
  PLUS_STANDOUT_COUNT,
  PLUS_STARTER_COUNT,
  patchStrip,
  selectPlusStandouts,
  selectPlusStarters,
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
    const below = plusBoardMetrics(true);
    expect(below.titlesBelow).toBe(true);
    expect(below.headerH).toBeLessThan(PLUS_HEADER_H);
    expect(below.titleY).toBeGreaterThan(below.starterY + below.starterH);
    expect(below.sectionY).toBe(below.standoutY + below.standoutH);
    expect(below.weekY + below.weekH).toBeLessThanOrEqual(below.headerH);
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

  it("auto-fills a 2/2/1 week and surprise non-stars who aren’t already on TOTW", () => {
    const game = (
      athleteId: string,
      score: number,
      stats: Partial<NightStandout["game"]["stats"]> = {},
    ): NightStandout => {
      const player = getPlayer(athleteId)!;
      return {
        athleteId,
        name: player.name,
        teamId: player.team,
        badge: "Standout",
        flags: [],
        line: `${stats.pts ?? "20"} PTS`,
        score,
        game: {
          eventId: "1",
          gameDate: "2026-10-14",
          teamId: player.team,
          opponentId: "SAS",
          opponentAbbrev: "SAS",
          result: "W",
          playerScore: "110",
          opponentScore: "100",
          resultLine: "W",
          dateLabel: "10/14",
          stats: {
            ...emptyStats(),
            pts: "20",
            reb: "5",
            ast: "5",
            stl: "1",
            blk: "1",
            fg: "8-16",
            three: "2-6",
            tov: "2",
            min: "30",
            ...stats,
          },
        },
      };
    };
    const luka = "3945274";
    const sga = "4278073";
    const lebron = "1966";
    const tatum = "4065648";
    const jokic = "3112335";
    const extraStar = "3032977";
    const bouyea = "4280245";
    const keon = "4702177";
    const podz = "4709138";
    const tari = "4433192";
    const camara = "4431736";
    expect(plusLineupGroup(getPlayer(luka))).toBe("G");
    expect(plusLineupGroup(getPlayer(sga))).toBe("G");
    expect(plusLineupGroup(getPlayer(lebron))).toBe("F");
    expect(plusLineupGroup(getPlayer(tatum))).toBe("F");
    expect(plusLineupGroup(getPlayer(jokic))).toBe("C");
    expect(plusLineupGroup(getPlayer("5104157"))).toBe("C");
    expect(isPlusStar(luka)).toBe(true);
    expect(isPlusStar(jokic)).toBe(true);
    expect(isPlusStar(bouyea)).toBe(false);
    expect(isPlusStar(keon)).toBe(false);

    const rows = [
      game(extraStar, 200, { pts: "40", reb: "12", ast: "8" }),
      game(luka, 120, { pts: "38", reb: "8", ast: "11" }),
      game(sga, 110, { pts: "36", reb: "5", ast: "7" }),
      game(lebron, 100, { pts: "31", reb: "8", ast: "9" }),
      game(tatum, 90, { pts: "33", reb: "9", ast: "6" }),
      game(jokic, 80, { pts: "28", reb: "14", ast: "12" }),
      game(bouyea, 25, { pts: "15", reb: "4", ast: "8", min: "28" }),
      game(keon, 22, { pts: "18", reb: "3", ast: "4", stl: "4" }),
      game(podz, 21, { pts: "22", reb: "6", ast: "5" }),
      game(tari, 20, { pts: "19", reb: "10", ast: "3" }),
      game(camara, 19, { pts: "17", reb: "11", ast: "4" }),
    ];
    expect(plusBoardEmpty(createEmptyPlusSlots())).toBe(true);
    const starters = selectPlusStarters(rows);
    const starterIds = starters.map((row) => row.athleteId);
    const starterGroups = starterIds.map(
      (id) => plusLineupGroup(getPlayer(id)),
    );
    expect(starterGroups.filter((group) => group === "G")).toHaveLength(2);
    expect(starterGroups.filter((group) => group === "F")).toHaveLength(2);
    expect(starterGroups.filter((group) => group === "C")).toHaveLength(1);
    expect(starterIds).toContain(luka);
    expect(starterIds).toContain(sga);
    expect(starterIds).toContain(jokic);
    expect(starterIds).not.toContain(bouyea);
    expect(starterGroups.slice(0, 2)).toEqual(["G", "G"]);
    expect(starterGroups[4]).toBe("C");

    const standouts = selectPlusStandouts(rows, new Set(starterIds));
    const standoutIds = standouts.map((row) => row.athleteId);
    expect(standoutIds).toHaveLength(5);
    expect(standoutIds).toContain(bouyea);
    expect(standoutIds.every((id) => !starterIds.includes(id))).toBe(true);
    expect(standoutIds.every((id) => !isPlusStar(id))).toBe(true);
    expect(standoutIds).not.toContain(extraStar);
    expect(standoutIds).not.toContain(tatum);

    const filled = fillPlusFromStandouts(createEmptyPlusSlots(), rows);
    expect(starterSlots(filled).map((slot) => slot.playerId)).toEqual(starterIds);
    expect(standoutSlots(filled).map((slot) => slot.playerId)).toEqual(
      standoutIds,
    );
    expect(new Set(filled.map((slot) => slot.playerId)).size).toBe(10);
    expect(filled[0]?.photoSrc).toBe(getPlayer(starterIds[0]!)?.headshotUrl);

    const onlyGuards = NBA_ACTIVE_PLAYERS.filter(
      (player) => plusLineupGroup(player) === "G" && !player.allStar,
    )
      .slice(0, 6)
      .map((player, index) => game(player.id, 50 - index, { pts: "18" }));
    const loose = selectPlusStarters(onlyGuards);
    expect(loose).toHaveLength(5);
    expect(
      loose.every((row) => plusLineupGroup(getPlayer(row.athleteId)) === "G"),
    ).toBe(true);
  });
});
