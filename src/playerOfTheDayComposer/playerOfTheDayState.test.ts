import { describe, expect, it } from "vitest";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { emptyStats, parseLastGamePayload } from "./lastGame";
import type { NightStandout } from "./nightStandouts";
import { rankNightStandouts } from "./nightStandouts";
import {
  BANNER_FILL_BASE,
  BANNER_STUD_FILL,
  FIELD_TEXTURE_SRC,
} from "../standingsComposer/headerTexture";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { coveredLogoRect } from "../standingsComposer/logoDraw";
import { isPhotoChromeClassName, photoFrameFilled } from "./PhotoFrame";
import * as potdLayout from "./playerOfTheDayLayout";
import { coverPanDraw, statsFillForTeam } from "./playerOfTheDayLayout";
import {
  DEFAULT_CUSTOM_PAN,
  DEFAULT_HEADSHOT_PAN,
  DEFAULT_PHOTO_ZOOM,
  DEFAULT_POTD_TITLE,
  MAX_PHOTO_ZOOM,
  POTD_WL_LOSS,
  POTD_WL_WIN,
  applyPlayerPick,
  blankStats,
  clampPan,
  clampZoom,
  createEmptyCards,
  exportPotdFilename,
  fillCardFromPlayer,
  fillPotdFromStandouts,
  resizePotdCards,
  photoRotate,
  photoZoom,
  potdResultChipFill,
  potdResultFromDisplay,
  potdResultLineDisplay,
  potdResultOutcome,
  potdNightHeading,
  potdPickerSuggestions,
  rankPotdNightBest,
  setCardPhoto,
  splitPlayerName,
  splitPotdTitle,
  usedPlayerIds,
} from "./playerOfTheDayState";

describe("player of the day state", () => {
  it("keeps the Instagram 4:5 PNG size", () => {
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
  });

  it("splits names and the outlined title onto two lines", () => {
    expect(splitPlayerName("James Harden")).toEqual({
      firstName: "James",
      lastName: "Harden",
    });
    expect(splitPlayerName("Giannis Antetokounmpo")).toEqual({
      firstName: "Giannis",
      lastName: "Antetokounmpo",
    });
    expect(splitPlayerName("Tim Hardaway Jr.")).toEqual({
      firstName: "Tim",
      lastName: "Hardaway Jr.",
    });
    expect(splitPlayerName("Gary Payton II")).toEqual({
      firstName: "Gary",
      lastName: "Payton II",
    });
    expect(splitPlayerName("Tristan da Silva")).toEqual({
      firstName: "Tristan da",
      lastName: "Silva",
    });
    const lines = splitPotdTitle(DEFAULT_POTD_TITLE);
    expect(lines).toHaveLength(2);
    expect(`${lines[0]} ${lines[1]}`).toBe(DEFAULT_POTD_TITLE);
    expect(exportPotdFilename(DEFAULT_POTD_TITLE)).toBe(
      "player-of-the-day.png",
    );
  });

  it("pulls W/L onto a mint/coral chip and leaves the score line white", () => {
    expect(potdResultOutcome("113-121 L vs DET")).toBe("L");
    expect(potdResultOutcome("106-100 W vs NYK")).toBe("W");
    expect(potdResultOutcome("128-110 W VS MIN")).toBe("W");
    expect(potdResultOutcome("")).toBeNull();
    expect(potdResultOutcome("VS DET")).toBeNull();
    expect(potdResultChipFill("W")).toBe(POTD_WL_WIN);
    expect(potdResultChipFill("L")).toBe(POTD_WL_LOSS);
    expect(potdResultLineDisplay("113-121 L vs DET", false)).toBe(
      "113-121 L vs DET",
    );
    expect(potdResultLineDisplay("113-121 L vs DET", true)).toBe(
      "113-121 vs DET",
    );
    expect(potdResultLineDisplay("106-100 W vs NYK", true)).toBe(
      "106-100 vs NYK",
    );
    expect(
      potdResultFromDisplay("113-121 vs DET", "113-121 L vs DET"),
    ).toBe("113-121 L vs DET");
  });

  it("auto-fills headshot, team, stats, and result from the latest game", () => {
    const luka = getPlayer("3945274");
    expect(luka).toBeTruthy();
    const game = parseLastGamePayload(
      {
      labels: ["FG", "3PT", "REB", "AST", "BLK", "STL", "TO", "PTS"],
      events: {
        e1: {
          id: "e1",
          gameDate: "2026-10-20T00:00:00.000Z",
          homeTeamId: "13",
          awayTeamId: "16",
          homeTeamScore: "128",
          awayTeamScore: "110",
          gameResult: "W",
          team: {
            id: "13",
            abbreviation: "LAL",
            displayName: "Los Angeles Lakers",
          },
          opponent: {
            abbreviation: "MIN",
            displayName: "Minnesota Timberwolves",
          },
        },
      },
      seasonTypes: [
        {
          displayName: "2026-27 Regular Season",
          categories: [
            {
              events: [
                {
                  eventId: "e1",
                  stats: ["12-20", "4-9", "8", "11", "1", "2", "3", "31"],
                },
              ],
            },
          ],
        },
      ],
    },
      "regular",
    );
    const card = fillCardFromPlayer(luka!, game);
    expect(card.playerId).toBe("3945274");
    expect(card.teamId).toBe("LAL");
    expect(card.photoSrc).toBe(luka!.headshotUrl);
    expect(card.customPhoto).toBe(false);
    expect(card.pan).toEqual(DEFAULT_HEADSHOT_PAN);
    expect(card.stats.pts).toBe("31");
    expect(card.stats.reb).toBe("8");
    expect(card.stats.fg).toBe("12-20");
    expect(card.result).toBe("128-110 W VS MIN");
    expect(statsFillForTeam("LAL")).toMatch(/^#/);
    expect(statsFillForTeam("LAL")).not.toBe(statsFillForTeam("MIL"));
  });

  it("leaves empty cards dashed instead of live-looking zeros", () => {
    const [left, right] = createEmptyCards();
    expect(left?.playerId).toBeNull();
    expect(left?.total).toBe("");
    expect(left?.stats).toEqual(blankStats());
    expect(right?.stats.pts).toBe("—");
  });

  it("replaces a custom photo only after upload, and pans inside the frame", () => {
    const luka = getPlayer("3945274")!;
    const cards = applyPlayerPick(createEmptyCards(), 0, luka, null);
    expect(cards[0]!.customPhoto).toBe(false);
    const withPhoto = setCardPhoto(cards, 0, "data:image/png;base64,aaa");
    expect(withPhoto[0]!.customPhoto).toBe(true);
    expect(withPhoto[0]!.photoSrc).toBe("data:image/png;base64,aaa");
    expect(withPhoto[0]!.pan).toEqual(DEFAULT_CUSTOM_PAN);
    expect(clampPan({ x: -1, y: 2 })).toEqual({
      x: 0,
      y: 1,
      zoom: DEFAULT_PHOTO_ZOOM,
      rotate: 0,
    });
    const drawn = coverPanDraw(2000, 1000, 0, 0, 520, 640, 1, 0.5);
    expect(drawn.dw).toBeGreaterThanOrEqual(520);
    expect(drawn.dh).toBeGreaterThanOrEqual(640);
    expect(drawn.dx).toBeLessThanOrEqual(0);
    const zoomed = coverPanDraw(2000, 1000, 0, 0, 520, 640, 0.5, 0.5, 2);
    expect(zoomed.dw).toBeCloseTo(drawn.dw * 2);
    expect(zoomed.dh).toBeCloseTo(drawn.dh * 2);
    expect(clampZoom(0.2)).toBe(1);
    expect(clampZoom(9)).toBe(MAX_PHOTO_ZOOM);
    expect(photoZoom({ x: 0.5, y: 0.5 })).toBe(DEFAULT_PHOTO_ZOOM);
    expect(usedPlayerIds(withPhoto)["3945274"]).toBe("Left card");
  });

  const nightRow = (
    id: string,
    name: string,
    stats: Partial<ReturnType<typeof emptyStats>>,
    score = 0,
    flags: string[] = [],
  ): NightStandout => {
    const line = { ...emptyStats(), min: "32", ...stats };
    return {
      athleteId: id,
      name,
      teamId: "DEN",
      badge: flags[0] ?? "Standout",
      flags,
      line: `${line.pts} PTS`,
      score,
      game: {
        eventId: "1",
        gameDate: "2026-10-20",
        teamId: "DEN",
        opponentId: "LAL",
        opponentAbbrev: "LAL",
        result: "W",
        playerScore: "120",
        opponentScore: "110",
        resultLine: "W 120-110 LAL",
        dateLabel: "10/20",
        stats: line,
      },
    };
  };

  it("ranks POTD by best counting × efficiency, not surprise standouts", () => {
    const jokic = nightRow(
      "3112335",
      "Nikola Jokic",
      {
        pts: "32",
        reb: "14",
        ast: "11",
        stl: "1",
        blk: "1",
        fg: "12-22",
        three: "1-3",
        ft: "7-8",
        tov: "3",
        min: "36",
      },
      40,
      ["Triple-double"],
    );
    const bouyea = nightRow(
      "4280245",
      "Jamaree Bouyea",
      {
        pts: "15",
        reb: "4",
        ast: "8",
        fg: "6-9",
        three: "3-4",
        ft: "0-0",
        tov: "1",
        min: "28",
      },
      80,
      ["Hot night"],
    );
    const emptyLuka = nightRow(
      "3945274",
      "Luka Doncic",
      {
        pts: "28",
        reb: "4",
        ast: "4",
        fg: "10-28",
        three: "1-10",
        ft: "7-10",
        tov: "8",
        min: "36",
      },
      50,
      ["30+ PTS"],
    );
    const efficient = nightRow(
      "4278073",
      "Shai Gilgeous-Alexander",
      {
        pts: "20",
        reb: "6",
        ast: "5",
        fg: "8-12",
        three: "4-6",
        ft: "0-0",
        tov: "1",
        min: "34",
      },
      30,
    );
    const ranked = rankPotdNightBest([bouyea, emptyLuka, efficient, jokic]);
    expect(ranked[0]?.athleteId).toBe("3112335");
    expect(ranked.map((row) => row.athleteId).slice(0, 2)).not.toContain(
      "4280245",
    );
    expect(
      ranked.findIndex((row) => row.athleteId === "4278073"),
    ).toBeLessThan(ranked.findIndex((row) => row.athleteId === "3945274"));
    const filled = fillPotdFromStandouts(createEmptyCards(), ranked);
    expect(filled[0]?.playerId).toBe("3112335");
    expect(filled[1]?.playerId).toBe("4278073");
    expect(filled).toHaveLength(2);
    const three = fillPotdFromStandouts(createEmptyCards(3), ranked);
    expect(three).toHaveLength(3);
    expect(three.map((card) => card.playerId)).toEqual([
      "3112335",
      "4278073",
      "4280245",
    ]);
    const grown = resizePotdCards(filled, 3);
    expect(grown).toHaveLength(3);
    expect(grown[2]?.playerId).toBeNull();
    expect(resizePotdCards(grown, 2)).toHaveLength(2);
    expect(resizePotdCards(grown, 2)[1]?.playerId).toBe("4278073");
    expect(filled[0]?.customPhoto).toBe(false);
    expect(filled[0]?.photoSrc).toBe(getPlayer("3112335")?.headshotUrl);
    const recs = potdPickerSuggestions(ranked);
    expect(recs[0]?.id).toBe("3112335");
    expect(recs[1]?.id).toBe("4278073");
    expect(recs.map((row) => row.id).slice(0, 2)).toEqual([
      "3112335",
      "4278073",
    ]);
    expect(potdNightHeading("2026-10-20", "2026-10-20", "2026-10-19")).toBe(
      "Tonight’s best",
    );
    const surpriseFirst = rankNightStandouts([bouyea, jokic]);
    expect(surpriseFirst[0]?.athleteId).toBe("4280245");
    const liveBest = nightRow(
      "1966",
      "LeBron James",
      {
        pts: "50",
        reb: "10",
        ast: "10",
        fg: "18-24",
        three: "4-6",
        ft: "10-10",
        tov: "1",
        min: "38",
      },
      90,
      ["40+ PTS"],
    );
    liveBest.live = true;
    liveBest.final = false;
    const withoutLive = rankPotdNightBest([liveBest, jokic, efficient]);
    expect(withoutLive.map((row) => row.athleteId)).not.toContain("1966");
    expect(withoutLive[0]?.athleteId).toBe("3112335");
    expect(fillPotdFromStandouts(createEmptyCards(), [liveBest, jokic])[0]?.playerId).toBe(
      "3112335",
    );
    expect(potdPickerSuggestions([liveBest, jokic]).map((row) => row.id)).not.toContain(
      "1966",
    );
  });

  it("clears a player if they are already on the other card", () => {
    const luka = getPlayer("3945274")!;
    const once = applyPlayerPick(createEmptyCards(), 0, luka, null);
    const twice = applyPlayerPick(once, 1, luka, null);
    expect(twice[0]!.playerId).toBeNull();
    expect(twice[1]!.playerId).toBe("3945274");
  });

  it("replacing a player overwrites that slot's name and photo", () => {
    const luka = getPlayer("3945274")!;
    const lebron = getPlayer("1966")!;
    const once = applyPlayerPick(createEmptyCards(), 0, luka, null);
    const custom = setCardPhoto(once, 0, "data:image/png;base64,aaa");
    const replaced = applyPlayerPick(custom, 0, lebron, null);
    expect(replaced[0]!.playerId).toBe("1966");
    expect(replaced[0]!.lastName).toBe("James");
    expect(replaced[0]!.photoSrc).toBe(lebron.headshotUrl);
    expect(replaced[0]!.customPhoto).toBe(false);
    expect(replaced[1]!.playerId).toBeNull();
  });

  it("can keep a custom photo and pan when changing player", () => {
    const luka = getPlayer("3945274")!;
    const lebron = getPlayer("1966")!;
    const once = applyPlayerPick(createEmptyCards(), 0, luka, null);
    const custom = setCardPhoto(once, 0, "data:image/png;base64,aaa");
    const panned = {
      ...custom[0]!.pan,
      zoom: 3.5,
      rotate: 90,
      x: 0.2,
      y: 0.8,
    };
    custom[0] = { ...custom[0]!, pan: panned };
    const kept = applyPlayerPick(custom, 0, lebron, null, "0", true);
    expect(kept[0]!.playerId).toBe("1966");
    expect(kept[0]!.lastName).toBe("James");
    expect(kept[0]!.photoSrc).toBe("data:image/png;base64,aaa");
    expect(kept[0]!.customPhoto).toBe(true);
    expect(kept[0]!.pan).toEqual(panned);
  });

  it("uses the studded near-black title fill; circled BA is an on/off toggle", () => {
    expect(typeof BaMarkToggle).toBe("function");
    expect(typeof PhotoGradeToggle).toBe("function");
    expect(BANNER_FILL_BASE.toLowerCase()).toBe("#1c1c1c");
    expect(BANNER_STUD_FILL.toLowerCase()).toBe("#2a2a2a");
    expect(FIELD_TEXTURE_SRC).toBe("/composer-background-texture.png");
    expect("POTD_CRACKS_SRC" in potdLayout).toBe(false);
    expect("POTD_BA_SRC" in potdLayout).toBe(false);
    expect("potdBadgeRect" in potdLayout).toBe(false);
    const covered = coveredLogoRect({ x: 0, y: 0, w: 500, h: 500 }, 0, 0, 520, 116);
    expect(covered.w / covered.h).toBeCloseTo(1);
    expect(covered.w).toBeGreaterThanOrEqual(520);
    expect(potdLayout.POTD_NAME_SIZE).toBe(36);
    expect(potdLayout.POTD_STAT_SIZE).toBe(38);
    expect(potdLayout.potdStatSize(2)).toBe(38);
    expect(potdLayout.potdStatSize(3)).toBe(28);
    expect(potdLayout.potdCardW(2)).toBe(potdLayout.POTD_CARD_W);
    expect(
      potdLayout.potdCardX(2, 3) + potdLayout.potdCardW(3),
    ).toBeCloseTo(1200 - potdLayout.potdPadX(3));
    expect(potdLayout.potdCardX(0, 3)).toBe(potdLayout.potdPadX(3));
    expect(potdLayout.POTD_TITLE_SIZE).toBe(46);
    expect(potdLayout.POTD_TITLE_PAD).toBe(14);
    expect(potdLayout.POTD_HEADER_H).toBe(208);
    expect(potdLayout.POTD_PLATE_H).toBe(124);
    const typeH = potdLayout.POTD_TITLE_SIZE * 0.92 * 2;
    expect(
      typeH + 3.2 + 8 + potdLayout.POTD_TITLE_PAD * 2,
    ).toBeLessThanOrEqual(potdLayout.POTD_PLATE_H);
  });

  it("always frames the photo and centers larger stat pairs", () => {
    expect(potdLayout.POTD_PHOTO_BORDER).toBe(4);
    expect(potdLayout.potdPhotoBorderColor("white")).toBe("#ffffff");
    expect(potdLayout.potdPhotoBorderColor("black")).toBe("#0a0a0a");
    expect(potdLayout.potdPhotoBorderColor("black")).not.toMatch(/d4|ec|ff.?f4/i);
    expect(potdLayout.POTD_STAT_FIELDS.map((field) => field.label)).toEqual([
      "PTS",
      "FG",
      "REB",
      "3P",
      "AST",
      "FT",
      "STL",
      "TOV",
      "BLK",
      "MIN",
    ]);
    expect(potdLayout.POTD_STAT_ROWS).toBe(5);
    expect(potdLayout.POTD_STATS_H).toBe(296);
    const statsH = potdLayout.POTD_STATS_H;
    const left = potdLayout.potdStatCell(0, 520, 0, statsH, 0);
    const right = potdLayout.potdStatCell(0, 520, 0, statsH, 1);
    const nextRow = potdLayout.potdStatCell(0, 520, 0, statsH, 2);
    const blk = potdLayout.potdStatCell(0, 520, 0, statsH, 8);
    const min = potdLayout.potdStatCell(0, 520, 0, statsH, 9);
    expect(left.cx).toBeCloseTo(130);
    expect(right.cx).toBeCloseTo(390);
    expect(blk.cx).toBeCloseTo(left.cx);
    expect(min.cx).toBeCloseTo(right.cx);
    expect(min.cy).toBeCloseTo(blk.cy);
    expect(left.cy).toBeCloseTo(
      nextRow.cy - (statsH * 0.8) / potdLayout.POTD_STAT_ROWS,
    );
    expect(left.cy).toBeGreaterThan(20);
    expect(left.cy).toBeLessThan(80);
    const photoH =
      potdLayout.GRAPHIC_HEIGHT -
      potdLayout.POTD_HEADER_H -
      potdLayout.POTD_FOOTER -
      potdLayout.POTD_NAME_H -
      potdLayout.POTD_RESULT_H -
      statsH;
    expect(photoH).toBeGreaterThan(780);
    expect(potdLayout.POTD_CARD_RADIUS).toBe(14);
    expect(potdLayout.POTD_CARD_RADIUS).toBeGreaterThan(8);
    expect(potdLayout.POTD_CARD_RADIUS).toBeLessThan(28);
  });

  it("treats upload and change-player chrome as non-pan targets", () => {
    expect(isPhotoChromeClassName("pod-photo__tool")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__file")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__pick extra")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__zoom-in")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__rotate")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__paste")).toBe(true);
    expect(isPhotoChromeClassName("pod-photo__tools")).toBe(false);
    expect(isPhotoChromeClassName("pod-photo__zoom")).toBe(false);
    expect(isPhotoChromeClassName("pod-photo__img")).toBe(false);
    expect(isPhotoChromeClassName("pod-photo__surface")).toBe(false);
    expect(photoFrameFilled(null)).toBe(false);
    expect(photoFrameFilled("data:image/png;base64,aaa")).toBe(true);
    expect(photoFrameFilled("data:image/jpeg;base64,/9j/aaaa")).toBe(true);
  });

  it("rotates custom photos in 90-degree steps and keeps rotate while panning", () => {
    expect(photoRotate({ x: 0.5, y: 0.5, rotate: 90 })).toBe(90);
    expect(photoRotate({ x: 0.5, y: 0.5, rotate: 360 })).toBe(0);
    expect(photoRotate({ x: 0.5, y: 0.5, rotate: -90 })).toBe(270);
    const panned = clampPan({
      x: 0.2,
      y: 0.3,
      zoom: 1.5,
      rotate: 90,
    });
    expect(panned.rotate).toBe(90);
    expect(panned.zoom).toBe(1.5);
  });
});
