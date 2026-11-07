import { describe, expect, it } from "vitest";
import {
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
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
  PLUS_STANDOUT_LOGO,
  PLUS_STANDOUT_NAME_H,
  PLUS_STARTER_LOGO,
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
  mergeRangeProduction,
  type NightStandout,
} from "../playerOfTheDayComposer/nightStandouts";
import { emptyStats } from "../playerOfTheDayComposer/lastGame";
import { createEmptyStrips } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import {
  applyPlayerPick,
  createEmptyPlusSlots,
  fillPlusFromStandouts,
  fillStartersFromStandouts,
  isPlusStar,
  plusBoardEmpty,
  plusLineupGroup,
  PLUS_LINEUP_SLOTS,
  totwAvailabilityIndex,
  totwCountingScore,
  totwEfficiencyIndex,
  totwPickerEmpty,
  totwPickerHeading,
  totwPickerSuggestions,
  totwProductionScore,
  totwWeekScore,
  totwStandoutScore,
  isCampStandout,
  TOTW_MIN_GAMES,
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
    const story = plusBoardMetrics(false, STORY_DESIGN_HEIGHT);
    expect(story.starterH).toBeLessThan(metrics.starterH + 80);
    expect(story.starterH / story.starterW).toBeLessThan(1.4);
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
    expect(PLUS_STARTER_LOGO).toBeLessThan(PLUS_STARTER_NAME_H / 3);
    expect(PLUS_STANDOUT_LOGO).toBeLessThan(PLUS_STANDOUT_NAME_H / 3);
    expect(draft.slots).toHaveLength(10);
    expect("title" in draft).toBe(false);
    expect(starterSlots(draft.slots)).toHaveLength(5);
    expect(standoutSlots(draft.slots)).toHaveLength(5);
    expect(draft.showNames).toBe(true);
    expect(draft.showStripStat).toBe(false);
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

  it("auto-fills PG–C and surprise non-stars who aren’t already on TOTW", () => {
    const game = (
      athleteId: string,
      score: number,
      stats: Partial<NightStandout["game"]["stats"]> = {},
      games = 2,
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
        games,
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
            ft: "4-5",
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
    const brown = "3917376";
    const white = "3078576";
    const brunson = "3934672";
    const flagg = "5041939";
    const zubac = "4433621";
    expect(getPlayer(brown)?.name).toMatch(/Jaylen Brown/);
    expect(getPlayer(brown)?.position).toBe("SF");
    expect(getPlayer(brown)?.positionGroup).toBe("G");
    expect(plusLineupGroup(getPlayer(brown))).toBe("F");
    expect(plusLineupGroup(getPlayer(white))).toBe("G");
    expect(getPlayer(white)?.position).toBe("SG");
    expect(getPlayer(brunson)?.position).toBe("PG");
    expect([...PLUS_LINEUP_SLOTS]).toEqual(["PG", "SG", "SF", "PF", "C"]);
    expect(getPlayer(luka)?.position).toBe("PG");
    expect(getPlayer(sga)?.position).toBe("PG");
    expect(getPlayer(lebron)?.position).toBe("SF");
    expect(getPlayer(extraStar)?.position).toBe("PF");
    expect(getPlayer(jokic)?.position).toBe("C");
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
    expect(starterGroups.filter((group) => group === "G").length).toBeGreaterThanOrEqual(1);
    expect(starterGroups.filter((group) => group === "F").length).toBeGreaterThanOrEqual(1);
    expect(starterGroups.filter((group) => group === "C")).toHaveLength(1);
    expect(starterIds[0]).toBe(luka);
    expect(starterIds.at(-1)).toBe(jokic);
    expect(starterIds).toContain(extraStar);
    expect(starterIds).toContain(tatum);
    expect(starterIds).not.toContain(bouyea);
    expect(starterGroups).toEqual(["G", "G", "F", "F", "C"]);
    const openPg = totwPickerSuggestions(rows, 0, new Set(), {
      positionless: true,
    });
    expect(openPg.some((row) => row.id === jokic)).toBe(true);
    expect(
      openPg.some((row) => getPlayer(row.id)?.position !== "PG"),
    ).toBe(true);
    expect(openPg[0]?.badge).toBe("Best remaining");
    expect(totwPickerHeading(0, { positionless: true })).toBe("Best remaining");
    expect(totwPickerHeading(5, { positionless: true })).toBe(
      "Best remaining standouts",
    );
    expect(totwPickerEmpty(0, { positionless: true })).toMatch(/players/);
    expect(totwPickerEmpty(5, { positionless: true })).toMatch(/standouts/);
    const brownWhite = selectPlusStarters([
      game(brown, 90, { pts: "28", reb: "6", ast: "4" }),
      game(white, 70, { pts: "22", reb: "4", ast: "5" }),
      game(flagg, 60, { pts: "20", reb: "6", ast: "4" }),
      game(extraStar, 100, { pts: "32", reb: "12", ast: "8" }),
      game(zubac, 50, { pts: "16", reb: "12", ast: "2" }),
      game(brunson, 80, { pts: "26", reb: "3", ast: "7" }),
    ]);
    expect(brownWhite.map((row) => row.athleteId)).toEqual([
      brunson,
      white,
      brown,
      extraStar,
      zubac,
    ]);
    expect(
      brownWhite.map((row) => plusLineupGroup(getPlayer(row.athleteId))),
    ).toEqual(["G", "G", "F", "F", "C"]);

    const standouts = selectPlusStandouts(rows, new Set(starterIds));
    const standoutIds = standouts.map((row) => row.athleteId);
    expect(standoutIds).toHaveLength(5);
    expect(standoutIds).toContain(bouyea);
    expect(standoutIds.every((id) => !starterIds.includes(id))).toBe(true);
    expect(standoutIds.every((id) => !isPlusStar(id))).toBe(true);
    expect(standoutIds).not.toContain(extraStar);
    expect(standoutIds).not.toContain(tatum);
    expect(
      standoutIds.map((id) => plusLineupGroup(getPlayer(id))),
    ).toEqual(["G", "G", "G", "F", "F"]);
    const tjd = "4431684";
    expect(getPlayer(tjd)?.name).toMatch(/Jackson-Davis/);
    expect(getPlayer(tjd)?.position).toBe("C");
    expect(plusLineupGroup(getPlayer(tjd))).toBe("C");
    const loudCenter = game(tjd, 999, {
      pts: "24",
      reb: "14",
      ast: "3",
      blk: "5",
      min: "32",
    });
    const packedStandouts = selectPlusStandouts(
      [...rows, loudCenter],
      new Set(starterIds),
    );
    expect(packedStandouts[0]?.athleteId).not.toBe(tjd);
    expect(plusLineupGroup(getPlayer(packedStandouts[0]?.athleteId))).toBe("G");
    expect(packedStandouts.map((row) => row.athleteId)).toContain(tjd);
    expect(packedStandouts.at(-1)?.athleteId).toBe(tjd);
    expect(
      packedStandouts.map((row) => plusLineupGroup(getPlayer(row.athleteId))),
    ).toEqual(["G", "G", "F", "F", "C"]);

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

    const surpriseGuard = game(bouyea, 999, {
      pts: "16",
      reb: "4",
      ast: "8",
      min: "28",
    });
    const quietStar = game(luka, 10, { pts: "38", reb: "8", ast: "11" });
    expect(surpriseGuard.score).toBeGreaterThan(quietStar.score);
    expect(totwProductionScore(quietStar)).toBeGreaterThan(
      totwProductionScore(surpriseGuard),
    );
    const bestFive = selectPlusStarters([
      surpriseGuard,
      quietStar,
      game(sga, 11, { pts: "36", reb: "5", ast: "7" }),
      game(lebron, 12, { pts: "31", reb: "8", ast: "9" }),
      game(tatum, 13, { pts: "33", reb: "9", ast: "6" }),
      game(jokic, 14, { pts: "28", reb: "14", ast: "12" }),
    ]);
    const bestIds = bestFive.map((row) => row.athleteId);
    expect(bestIds).toEqual([luka, sga, lebron, tatum, jokic]);
    expect(bestIds).not.toContain(bouyea);
    const totwStrips = fillStartersFromStandouts(createEmptyStrips(), [
      surpriseGuard,
      quietStar,
      game(sga, 11, { pts: "36", reb: "5", ast: "7" }),
      game(lebron, 12, { pts: "31", reb: "8", ast: "9" }),
      game(tatum, 13, { pts: "33", reb: "9", ast: "6" }),
      game(jokic, 14, { pts: "28", reb: "14", ast: "12" }),
    ]);
    expect(totwStrips.map((slot) => slot.playerId)).toEqual(bestIds);

    const terry = "4433159";
    expect(getPlayer(terry)?.name).toMatch(/Terry/);
    const terryNights = [
      game(terry, 10, { pts: "5", reb: "5", ast: "2", min: "11" }),
      game(terry, 8, { pts: "4", reb: "1", ast: "1", min: "8" }),
      game(terry, 80, {
        pts: "23",
        reb: "8",
        ast: "9",
        stl: "4",
        min: "43",
      }),
      game(terry, 2, { pts: "0", reb: "3", ast: "1", min: "4" }),
      game(terry, 1, { pts: "0", reb: "0", ast: "1", min: "5" }),
    ];
    const terryWindow = mergeRangeProduction([terryNights]);
    expect(terryWindow).toHaveLength(1);
    expect(Number.parseFloat(terryWindow[0]!.game.stats.pts)).toBeLessThan(8);
    const withTerry = [...rows, ...terryWindow];
    const terryStarters = selectPlusStarters(withTerry);
    expect(terryStarters.map((row) => row.athleteId)).not.toContain(terry);
    const terryStandouts = selectPlusStandouts(
      withTerry,
      new Set(terryStarters.map((row) => row.athleteId)),
    );
    expect(terryStandouts.map((row) => row.athleteId)).not.toContain(terry);
  });

  it("ranks rotation standouts over camp/two-way 10-point weeks", () => {
    const game = (
      athleteId: string,
      stats: Partial<NightStandout["game"]["stats"]>,
      games = 4,
    ): NightStandout => {
      const player = getPlayer(athleteId)!;
      return {
        athleteId,
        name: player.name,
        teamId: player.team,
        badge: "Standout",
        flags: [],
        line: `${stats.pts ?? "10"} PTS`,
        score: Number.parseFloat(stats.pts ?? "10") || 10,
        games,
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
            pts: "10",
            reb: "4",
            ast: "2",
            stl: "1",
            blk: "0",
            fg: "4-9",
            three: "1-3",
            tov: "1",
            min: "20",
            ft: "1-1",
            ...stats,
          },
        },
      };
    };
    const daSilva = "4702382";
    const miller = "5044385";
    const yaxel = "5175737";
    const barnhizer = "4684208";
    const mogbo = "5107897";
    const kelly = "4696317";
    const rui = "4066648";
    const garza = "4277951";
    const porter = "4278104";
    const brown = "3917376";
    const flagg = "5041939";
    const barnes = "4433134";
    const wemby = "5104157";
    expect(getPlayer(daSilva)?.name).toMatch(/da Silva/);
    expect(getPlayer(miller)?.name).toMatch(/Miller/);
    expect(getPlayer(yaxel)?.name).toMatch(/Lendeborg/);
    expect(getPlayer(barnhizer)?.name).toMatch(/Barnhizer/);
    expect(getPlayer(mogbo)?.name).toMatch(/Mogbo/);
    expect(getPlayer(kelly)?.name).toMatch(/Kelly/);
    const totw = [
      game(porter, { pts: "21.7", reb: "3.3", ast: "1", fg: "8-14", three: "3-7", ft: "3-3" }, 3),
      game(brown, { pts: "20", reb: "4", ast: "2.3", fg: "7-15", three: "2-6", ft: "4-5" }, 3),
      game(flagg, { pts: "19.7", reb: "7.3", ast: "4.7", stl: "1.7", blk: "1", fg: "7-14", three: "2-5", ft: "4-5" }, 3),
      game(barnes, { pts: "16.3", reb: "5.3", ast: "3.3", stl: "1.3", blk: "1.3", fg: "6-12", three: "1-4", ft: "3-4" }, 4),
      game(wemby, { pts: "13.8", reb: "6.3", ast: "3", stl: "1.3", blk: "2.3", fg: "5-11", three: "1-4", ft: "3-4" }, 4),
    ];
    const role = [
      game(daSilva, { pts: "16.5", reb: "3.8", ast: "2.8", stl: "1", blk: "0.3", fg: "6-12", three: "2-5", ft: "2-2", min: "21.8" }, 4),
      game(miller, { pts: "16.4", reb: "6.4", ast: "2", stl: "1", blk: "0.4", fg: "6-11", three: "2-4", ft: "2-3", min: "19.8" }, 5),
      game(yaxel, { pts: "15.6", reb: "7.4", ast: "4", stl: "1.2", blk: "0.8", fg: "6-12", three: "1-3", ft: "3-4", min: "23.2" }, 5),
      game(rui, { pts: "17", reb: "4.3", ast: "0.7", stl: "1", blk: "0.3", fg: "6-12", three: "2-5", ft: "3-3", min: "19.3" }, 3),
      game(garza, { pts: "14.3", reb: "6", ast: "0.8", stl: "1", blk: "1.3", fg: "6-10", three: "0-1", ft: "2-3", min: "17.5" }, 4),
    ];
    const camp = [
      game(barnhizer, { pts: "10.8", reb: "4", ast: "2", stl: "0.2", blk: "0.6", fg: "4-10", three: "1-4", ft: "2-2", min: "23.6" }, 5),
      game(mogbo, { pts: "10.8", reb: "7.3", ast: "2", stl: "2.3", blk: "0.3", fg: "4-8", three: "0-1", ft: "3-4", min: "21.3" }, 4),
      game(kelly, { pts: "10.7", reb: "2.3", ast: "2.3", stl: "0.3", blk: "0.7", fg: "4-10", three: "2-6", ft: "1-1", min: "13.7" }, 3),
    ];
    expect(isCampStandout(camp[0]!)).toBe(true);
    expect(isCampStandout(camp[1]!)).toBe(true);
    expect(isCampStandout(camp[2]!)).toBe(true);
    expect(isCampStandout(role[0]!)).toBe(false);
    expect(isCampStandout(role[1]!)).toBe(false);
    expect(isCampStandout(role[2]!)).toBe(false);
    for (const row of role.slice(0, 3)) {
      for (const other of camp) {
        expect(totwStandoutScore(row)).toBeGreaterThan(totwStandoutScore(other));
      }
    }
    const starterIds = new Set(totw.map((row) => row.athleteId));
    expect(new Set(selectPlusStarters(totw).map((row) => row.athleteId))).toEqual(
      starterIds,
    );
    const standouts = selectPlusStandouts([...totw, ...role, ...camp], starterIds);
    const standoutIds = standouts.map((row) => row.athleteId);
    expect(standoutIds).toContain(daSilva);
    expect(standoutIds).toContain(miller);
    expect(standoutIds).toContain(yaxel);
    expect(standoutIds).not.toContain(barnhizer);
    expect(standoutIds).not.toContain(mogbo);
    expect(standoutIds).not.toContain(kelly);
    expect(standoutIds.every((id) => !totw.some((row) => row.athleteId === id))).toBe(
      true,
    );
    expect(plusLineupGroup(getPlayer(standouts[0]?.athleteId))).not.toBe("C");
  });

  it("needs 2 games, ranks a mix of counting and TS%/eFG%, and highlights remaining PGs", () => {
    const game = (
      athleteId: string,
      stats: Partial<NightStandout["game"]["stats"]>,
      games = 2,
    ): NightStandout => {
      const player = getPlayer(athleteId)!;
      return {
        athleteId,
        name: player.name,
        teamId: player.team,
        badge: "Standout",
        flags: [],
        line: `${stats.pts ?? "20"} PTS`,
        score: 50,
        games,
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
            ft: "4-5",
            tov: "2",
            min: "30",
            ...stats,
          },
        },
      };
    };
    expect(TOTW_MIN_GAMES).toBe(2);
    const luka = "3945274";
    const sga = "4278073";
    const brown = "3917376";
    const tatum = "4065648";
    const jokic = "3112335";
    const emptyVolume = game(luka, {
      pts: "28",
      reb: "4",
      ast: "4",
      fg: "10-28",
      three: "1-10",
      ft: "7-10",
    });
    const efficient = game(sga, {
      pts: "20",
      reb: "6",
      ast: "5",
      fg: "8-12",
      three: "4-6",
      ft: "0-0",
    });
    expect(totwEfficiencyIndex(emptyVolume.game.stats)).toBeLessThan(1);
    expect(totwEfficiencyIndex(efficient.game.stats)).toBeGreaterThan(1);
    expect(totwCountingScore(emptyVolume.game.stats)).toBeGreaterThan(
      totwCountingScore(efficient.game.stats),
    );
    expect(totwWeekScore(efficient)).toBeGreaterThan(totwWeekScore(emptyVolume));
    expect(totwProductionScore(efficient)).toBe(totwWeekScore(efficient));

    const starWeek = game(jokic, {
      pts: "30",
      reb: "12",
      ast: "10",
      fg: "12-22",
      three: "1-3",
      ft: "5-6",
    });
    const heater = game(brown, {
      pts: "14",
      reb: "3",
      ast: "2",
      fg: "6-7",
      three: "2-2",
      ft: "0-0",
    });
    expect(totwWeekScore(starWeek)).toBeGreaterThan(totwWeekScore(heater));

    const volumeStar = game(tatum, {
      pts: "21",
      reb: "6.5",
      ast: "5",
      stl: "1.5",
      blk: "0",
      fg: "8.5-18",
      three: "3.5-9",
      ft: "0.5-0.5",
    });
    const quietHeater = game("5174563", {
      pts: "15.3",
      reb: "3.5",
      ast: "2.5",
      stl: "1.3",
      blk: "1.5",
      fg: "4.75-7.25",
      three: "2-3.25",
      ft: "3.75-4",
    });
    expect(totwCountingScore(volumeStar.game.stats)).toBeGreaterThan(
      totwCountingScore(quietHeater.game.stats),
    );
    expect(totwWeekScore(volumeStar)).toBeGreaterThan(totwWeekScore(quietHeater));
    const volumeStarters = selectPlusStarters([
      volumeStar,
      quietHeater,
      game("4278104", {
        pts: "21.7",
        reb: "3.3",
        ast: "1",
        stl: "1.3",
        blk: "0.3",
        fg: "7.7-13",
        three: "3.3-7",
        ft: "3-3.7",
      }),
      game(sga, { pts: "16", reb: "2", ast: "5", fg: "5-8", three: "2-3", ft: "4-4" }),
      game(luka, { pts: "16", reb: "3", ast: "3", fg: "5-11", three: "2-6", ft: "4-5" }),
      game(jokic, { pts: "19", reb: "8", ast: "4", fg: "7-11", three: "0-1", ft: "5-6" }),
    ]).map((row) => row.athleteId);
    expect(volumeStarters).toContain(tatum);

    const white = "3078576";
    const whiteWeek = game(white, {
      pts: "16",
      reb: "3.5",
      ast: "2",
      stl: "2.5",
      blk: "0",
      fg: "5.5-10",
      three: "1-3.5",
      ft: "4-4",
    });
    expect(totwWeekScore(volumeStar)).toBeGreaterThan(totwWeekScore(whiteWeek));
    const mixStarters = selectPlusStarters([
      volumeStar,
      quietHeater,
      whiteWeek,
      game("4278104", {
        pts: "21.7",
        reb: "3.3",
        ast: "1",
        stl: "1.3",
        blk: "0.3",
        fg: "7.7-13",
        three: "3.3-7",
        ft: "3-3.7",
      }),
      game(luka, {
        pts: "19.7",
        reb: "3",
        ast: "2.7",
        stl: "1.3",
        blk: "0.3",
        fg: "5-12.7",
        three: "2.7-7.3",
        ft: "7-7.7",
      }),
      game("4433621", {
        pts: "19",
        reb: "3",
        ast: "1",
        stl: "2",
        blk: "1",
        fg: "7-9",
        three: "0-0.5",
        ft: "5-6",
      }),
      game("4433134", {
        pts: "16.3",
        reb: "5.3",
        ast: "3.3",
        stl: "1.3",
        blk: "1.3",
        fg: "6.5-11.5",
        three: "1.3-2.5",
        ft: "2-2.8",
      }),
    ]).map((row) => row.athleteId);
    expect(mixStarters).toContain(tatum);
    expect(mixStarters).not.toContain(white);

    const emptyLuka = game(
      luka,
      {
        pts: "19.7",
        reb: "3",
        ast: "2.7",
        stl: "1.3",
        blk: "0.3",
        tov: "5",
        fg: "5-12.7",
        three: "2.7-7.3",
        ft: "7-7.7",
      },
      3,
    );
    const brownWeek = game(
      brown,
      {
        pts: "20",
        reb: "4",
        ast: "2.3",
        stl: "0.3",
        blk: "1",
        tov: "0.7",
        fg: "7-12",
        three: "1.7-4.3",
        ft: "4.3-5.7",
      },
      3,
    );
    const barrettWeek = game(
      "4395625",
      {
        pts: "18.3",
        reb: "5",
        ast: "3.3",
        stl: "0.5",
        blk: "0",
        tov: "1.3",
        fg: "5.5-11",
        three: "2-5",
        ft: "5-6.5",
      },
      4,
    );
    const georgeWeek = game(
      "5174563",
      {
        pts: "15.3",
        reb: "3.5",
        ast: "2.5",
        stl: "1.3",
        blk: "1.5",
        tov: "2.3",
        fg: "4.75-7.25",
        three: "2-3.25",
        ft: "3.75-4",
      },
      4,
    );
    expect(totwWeekScore(brownWeek)).toBeGreaterThan(totwWeekScore(emptyLuka));
    expect(totwWeekScore(barrettWeek)).toBeGreaterThan(totwWeekScore(emptyLuka));
    expect(totwWeekScore(georgeWeek)).toBeGreaterThan(totwWeekScore(emptyLuka));
    const noEmptyLuka = selectPlusStarters([
      emptyLuka,
      brownWeek,
      barrettWeek,
      georgeWeek,
      volumeStar,
      game("4278104", {
        pts: "21.7",
        reb: "3.3",
        ast: "1",
        stl: "1.3",
        blk: "0.3",
        tov: "1.7",
        fg: "7.7-13",
        three: "3.3-7",
        ft: "3-3.7",
      }),
      game("4433621", {
        pts: "19",
        reb: "3",
        ast: "1",
        stl: "2",
        blk: "1",
        tov: "3.5",
        fg: "7-9",
        three: "0-0.5",
        ft: "5-6",
      }),
    ]).map((row) => row.athleteId);
    expect(noEmptyLuka).not.toContain(luka);
    expect(noEmptyLuka.some((id) => ["3917376", "4395625", "5174563"].includes(id))).toBe(
      true,
    );

    const quieterFour = game(
      "4433134",
      {
        pts: "16.3",
        reb: "5.3",
        ast: "3.3",
        stl: "1.3",
        blk: "1.3",
        tov: "2",
        fg: "6.5-11.5",
        three: "1.3-2.5",
        ft: "2-2.8",
      },
      4,
    );
    expect(totwCountingScore(volumeStar.game.stats)).toBeGreaterThan(
      totwCountingScore(quieterFour.game.stats),
    );
    expect(totwAvailabilityIndex(quieterFour)).toBeGreaterThan(
      totwAvailabilityIndex(volumeStar),
    );
    expect(totwWeekScore(quieterFour)).toBeGreaterThan(totwWeekScore(volumeStar));
    expect(totwAvailabilityIndex(quieterFour)).toBeLessThanOrEqual(1.04);

    const campFive = game(
      "5175737",
      {
        pts: "15.6",
        reb: "7.4",
        ast: "4",
        stl: "1.2",
        blk: "0.8",
        tov: "1.2",
        fg: "5.8-10.2",
        three: "1.4-3.2",
        ft: "2.6-4",
      },
      5,
    );
    const mpjWeek = game(
      "4278104",
      {
        pts: "21.7",
        reb: "3.3",
        ast: "1",
        stl: "1.3",
        blk: "0.3",
        tov: "1.7",
        fg: "7.7-13",
        three: "3.3-7",
        ft: "3-3.7",
      },
      3,
    );
    const flaggWeek = game(
      "5041939",
      {
        pts: "19.7",
        reb: "7.3",
        ast: "4.7",
        stl: "1.7",
        blk: "1",
        tov: "3",
        fg: "6-14.7",
        three: "1.3-5",
        ft: "6.3-7",
      },
      3,
    );
    const wembyWeek = game(
      "5104157",
      {
        pts: "13.8",
        reb: "6.3",
        ast: "3",
        stl: "1.3",
        blk: "2.3",
        tov: "1.8",
        fg: "5.75-10.75",
        three: "0.25-3",
        ft: "2-2.75",
      },
      4,
    );
    expect(totwWeekScore(volumeStar)).toBeGreaterThan(totwWeekScore(campFive));
    expect(totwWeekScore(mpjWeek)).toBeGreaterThan(totwWeekScore(campFive));
    expect(totwWeekScore(brownWeek)).toBeGreaterThan(totwWeekScore(campFive));
    const noCampPg = selectPlusStarters([
      campFive,
      quieterFour,
      volumeStar,
      mpjWeek,
      brownWeek,
      flaggWeek,
      wembyWeek,
      whiteWeek,
    ]);
    expect(noCampPg.map((row) => row.athleteId)).not.toContain("5175737");
    expect(noCampPg[0]?.athleteId).not.toBe("5175737");
    expect(noCampPg.map((row) => row.athleteId)).not.toContain(white);

    const oneGame = game(
      luka,
      {
        pts: "50",
        reb: "12",
        ast: "11",
        fg: "18-24",
        three: "6-8",
        ft: "8-8",
      },
      1,
    );
    const twoGameSupport = [
      game(sga, { pts: "22", reb: "5", ast: "6", fg: "8-14", three: "3-6", ft: "3-3" }),
      game(brown, { pts: "21", reb: "6", ast: "4", fg: "8-15", three: "2-5", ft: "3-3" }),
      game(tatum, { pts: "20", reb: "7", ast: "5", fg: "7-14", three: "3-7", ft: "3-4" }),
      game(jokic, { pts: "24", reb: "11", ast: "8", fg: "9-16", three: "1-3", ft: "5-6" }),
      game("3032977", { pts: "23", reb: "10", ast: "6", fg: "8-15", three: "1-4", ft: "6-8" }),
    ];
    const starters = selectPlusStarters([oneGame, ...twoGameSupport]);
    expect(starters.map((row) => row.athleteId)).not.toContain(luka);
    expect(starters).toHaveLength(5);

    const standoutOne = game(
      "4280245",
      { pts: "16", reb: "4", ast: "8", min: "28", fg: "6-10", three: "2-4", ft: "2-2" },
      1,
    );
    expect(
      selectPlusStandouts(
        [standoutOne, ...twoGameSupport],
        new Set(starters.map((row) => row.athleteId)),
      ).map((row) => row.athleteId),
    ).not.toContain("4280245");

    const pgSuggestions = totwPickerSuggestions(
      [oneGame, ...twoGameSupport],
      0,
      new Set(),
    );
    expect(pgSuggestions[0]?.id).toBe(sga);
    expect(pgSuggestions[0]?.badge).toBe("Best PG");
    expect(pgSuggestions.every((row) => row.id !== luka)).toBe(true);
    expect(totwPickerHeading(0)).toBe("Best remaining for PG");
    expect(totwPickerHeading(5)).toBe("Best remaining standout PG");
    expect(totwPickerHeading(6)).toBe("Best remaining standout SG");
    const sfSuggestions = totwPickerSuggestions(twoGameSupport, 2, new Set([brown]));
    expect(sfSuggestions.every((row) => row.id !== brown)).toBe(true);
    expect(sfSuggestions[0]?.badge).toMatch(/SF/);
  });
});
