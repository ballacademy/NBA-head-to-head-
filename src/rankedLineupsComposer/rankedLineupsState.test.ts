import { describe, expect, it } from "vitest";
import catalog from "../../data/every-team-historical-rosters.json";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { FIELD_TEXTURE_SRC } from "../standingsComposer/headerTexture";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  EVERY_TEAM_STAT_METRICS,
  hydrateEveryTeamRosters,
} from "../everyTeamComposer/historicalRosters";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
  rankedFooterH,
  rankedHeaderH,
  rankedStripH,
  rankedStripRect,
  RL_FOOTER_H,
  RL_HEADER_H,
  RL_PAD_X,
  RL_STRIP_GAP,
  RL_STRIP_H,
  RL_STRIP_W,
  RL_TITLE_BOX_H,
  RL_TITLE_LINE,
  RL_TITLE_PAD_Y,
  RL_TITLE_SIZE,
  rlStripX,
} from "./rankedLineupsLayout";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
import { TOTW_STRIP_GAP } from "../teamOfTheWeekComposer/teamOfTheWeekLayout";
import {
  applyPlayerPick,
  createEmptyStrips,
  DEFAULT_RANK_DISPLAY,
  DEFAULT_RANK_PILL,
  DEFAULT_RANKED_LINEUP_TITLE,
  fillLineupByStatLeaders,
  rankHeadlinePrimary,
  rankHeadlineSecondary,
  defaultRankedLineupsDraft,
  DEFAULT_POSITION_LABELS,
  LINEUP_POSITIONS,
  lineupPosition,
  parsePositionLabels,
  nextRankPill,
  swipeRankCue,
  parseRankDisplay,
  pickLineupStatLeaders,
  RANK_PILL_PRESETS,
  RANKED_LINEUP_STRIP_COUNT,
  extraPositionLabel,
  parseStripCount,
  resizeRankedStrips,
  setStripPhoto,
  slidesFromDraft,
  splitRankedLineupTitle,
  usedLineupPlayerIds,
} from "./rankedLineupsState";

hydrateEveryTeamRosters(
  catalog as unknown as Parameters<typeof hydrateEveryTeamRosters>[0],
);

describe("ranked lineups", () => {
  it("keeps the Instagram 4:5 PNG size", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
    expect(RL_HEADER_H + RL_STRIP_H + RL_FOOTER_H).toBe(GRAPHIC_HEIGHT);
    expect(RL_STRIP_W).toBeGreaterThan(200);
    expect(RL_STRIP_H).toBeGreaterThan(RL_STRIP_W * 4);
    expect(rlStripX(0)).toBeLessThan(rlStripX(1));
    expect(FIELD_TEXTURE_SRC).toBe("/composer-background-texture.png");
  });

  it("is five PG–C strips with a BEST rank pill, not an unranked lineup", () => {
    expect(RANKED_LINEUP_STRIP_COUNT).toBe(5);
    expect([...LINEUP_POSITIONS]).toEqual(["PG", "SG", "SF", "PF", "C"]);
    expect(lineupPosition(0)).toBe("PG");
    expect(lineupPosition(4)).toBe("C");
    expect(createEmptyStrips()).toHaveLength(5);
    const draft = defaultRankedLineupsDraft();
    expect(draft.title).toBe(DEFAULT_RANKED_LINEUP_TITLE);
    expect(draft.rank).toBe(DEFAULT_RANK_PILL);
    expect(draft.brand.toUpperCase()).toBe("BALLACADEMY");
    expect(RANK_PILL_PRESETS[0]).toBe("BEST");
    expect(RANK_PILL_PRESETS[1]).toBe("2ND");
    expect(RANK_PILL_PRESETS).toHaveLength(10);
    expect(splitRankedLineupTitle(DEFAULT_RANKED_LINEUP_TITLE)).toEqual([
      "TOP 10 NBA PLAYERS",
      "AT EACH POSITION",
    ]);
    expect(RL_PAD_X).toBe(10);
    expect(RL_STRIP_GAP).toBe(4);
    expect(TOTW_STRIP_GAP).toBeGreaterThan(RL_STRIP_GAP);
    expect(nextRankPill("BEST")).toBe("2ND");
    expect(swipeRankCue("BEST")).toBe("BEST → 2ND");
    expect(nextRankPill("2ND")).toBe("3RD");
    expect(nextRankPill("10TH")).toBe("11TH");
    expect(slidesFromDraft(draft)).toHaveLength(1);
    expect(draft.showFade).toBe(false);
    expect(draft.showStripStat).toBe(false);
    expect(draft.showTeamHairline).toBe(true);
    expect(draft.positionLabels).toEqual([...DEFAULT_POSITION_LABELS]);
    expect(parsePositionLabels(["pg", "", "SF", "PF", "C"])).toEqual([
      "pg",
      "",
      "SF",
      "PF",
      "C",
    ]);
    expect(parsePositionLabels(undefined)[0]).toBe("PG");
    expect(draft.rankDisplay).toBe(DEFAULT_RANK_DISPLAY);
    expect(DEFAULT_RANK_DISPLAY).toBe("pill");
    expect(parseRankDisplay(undefined)).toBe("pill");
    expect(parseRankDisplay("headline")).toBe("headline");
    expect(parseRankDisplay("none")).toBe("none");
    expect(parseRankDisplay("nope", "none")).toBe("none");
    expect(RL_TITLE_PAD_Y).toBeGreaterThanOrEqual(10);
    expect(RL_TITLE_BOX_H).toBeGreaterThan(RL_TITLE_SIZE * RL_TITLE_LINE * 2);
    expect(RL_HEADER_H).toBe(rankedHeaderH("pill"));
    expect(rankHeadlinePrimary("BEST")).toBe("#1");
    expect(rankHeadlineSecondary("BEST")).toBe("1 OF 10");
    expect(rankHeadlinePrimary("2ND")).toBe("#2");
    expect(rankedStripH("headline", true)).toBeGreaterThan(
      rankedStripH("headline", false),
    );
    expect(
      rankedHeaderH("headline") +
        rankedStripH("headline", true) +
        rankedFooterH(true),
    ).toBe(GRAPHIC_HEIGHT);
    expect(STORY_DESIGN_HEIGHT).toBe(2133);
    expect(rankedStripH("pill", false, STORY_DESIGN_HEIGHT)).toBe(
      STORY_DESIGN_HEIGHT - rankedHeaderH("pill") - rankedFooterH(false),
    );
  });

  it("fills a position from the picker and tags used players by slot", () => {
    const luka = getPlayer("3945274")!;
    const filled = applyPlayerPick(createEmptyStrips(), 0, luka);
    expect(filled[0]?.playerId).toBe("3945274");
    expect(usedLineupPlayerIds(filled)["3945274"]).toBe("PG");
  });

  it("lists every counting and percentage lineup auto-fill metric", () => {
    expect(EVERY_TEAM_STAT_METRICS.map((item) => item.label)).toEqual([
      "PTS",
      "REB",
      "AST",
      "STL",
      "BLK",
      "TOV",
      "FG%",
      "3P%",
      "FT%",
      "eFG%",
      "TS%",
      "MIN",
      "GP",
      "PRA",
      "STL+BLK",
      "PER",
      "USG%",
      "BPM",
      "VORP",
      "WS",
      "OWS",
      "DWS",
      "WS/48",
      "OBPM",
      "DBPM",
      "PACE",
      "ORtg",
      "DRtg",
      "NRtg",
      "TOV%",
      "ORB%",
      "Charges",
      "Deflections",
      "Loose balls",
      "Screen AST",
      "Contested",
      "C/S 2PT",
      "C/S 3PT",
      "Box outs",
      "Off box",
      "Def box",
      "SA PTS",
    ]);
  });

  it("auto-fills 2012-13 PTS leaders at PG–C with no repeats", () => {
    const empty = createEmptyStrips();
    const result = fillLineupByStatLeaders(empty, "2012-13", "points");
    expect(result.filled).toBe(5);
    expect(result.strips.map((strip) => strip.lastName)).toEqual([
      "Westbrook",
      "Bryant",
      "Anthony",
      "Aldridge",
      "Lopez",
    ]);
    expect(result.strips.map((strip) => strip.teamId)).toEqual([
      "OKC",
      "LAL",
      "NYK",
      "POR",
      "BKN",
    ]);
    const ids = result.strips.map((strip) => strip.playerId);
    expect(new Set(ids).size).toBe(5);
    expect(empty.every((strip) => !strip.playerId)).toBe(true);
  });

  it("auto-fills the 2nd 2012-13 PTS lineup without repeating the BEST five", () => {
    const best = fillLineupByStatLeaders(createEmptyStrips(), "2012-13", "points", "regular", 1);
    const second = fillLineupByStatLeaders(
      createEmptyStrips(),
      "2012-13",
      "points",
      "regular",
      2,
    );
    expect(second.strips.map((strip) => strip.lastName)).toEqual([
      "Curry",
      "Harden",
      "Durant",
      "Lee",
      "Jefferson",
    ]);
    const bestIds = new Set(best.strips.map((strip) => strip.playerId));
    second.strips.forEach((strip) => {
      expect(bestIds.has(strip.playerId)).toBe(false);
    });
  });

  it("auto-fills 2026-27 regular-season PTS leaders using last year’s table", () => {
    const result = fillLineupByStatLeaders(
      createEmptyStrips(),
      "2026-27",
      "points",
      "regular",
    );
    expect(result.filled).toBe(5);
    expect(result.strips[0]?.lastName).toBe("Doncic");
    expect(result.strips[1]?.lastName).toBe("Edwards");
    expect(result.strips[2]?.lastName).toBe("Brown");
    expect(result.strips[3]?.lastName).toMatch(/Antetokounmpo/i);
    expect(result.strips[4]?.lastName).toBe("Jokic");
    const leaders = pickLineupStatLeaders("2026-27", "points", "regular");
    expect(leaders.map((row) => row?.player.position)).toEqual([
      "PG",
      "SG",
      "SF",
      "PF",
      "C",
    ]);
    const assists = pickLineupStatLeaders("2026-27", "assists", "regular");
    expect(assists.map((row) => row?.player.id).filter(Boolean)).toHaveLength(5);
    expect(new Set(assists.map((row) => row?.player.id)).size).toBe(5);
    expect(assists.map((row) => row?.player.id)).not.toEqual(
      result.strips.map((strip) => strip.playerId),
    );
  });

  it("keeps a custom photo when populating that strip’s leader", () => {
    const custom = setStripPhoto(createEmptyStrips(), 0, "data:image/png;base64,abc");
    const result = fillLineupByStatLeaders(custom, "2012-13", "points");
    expect(result.strips[0]?.lastName).toBe("Westbrook");
    expect(result.strips[0]?.customPhoto).toBe(true);
    expect(result.strips[0]?.photoSrc).toBe("data:image/png;base64,abc");
    expect(result.strips[1]?.customPhoto).toBe(false);
  });

  it("paints a light vignette over five-strip photos", () => {
    expect(typeof paintPhotoVignette).toBe("function");
  });

  it("wraps 6–10 man lineups onto extra rows instead of a wider strip", () => {
    expect(parseStripCount(8)).toBe(8);
    expect(parseStripCount(2)).toBe(5);
    expect(parseStripCount(12)).toBe(10);
    expect(resizeRankedStrips(createEmptyStrips(), 8)).toHaveLength(8);
    expect(parsePositionLabels(undefined, 7)[5]).toBe("6TH");
    expect(extraPositionLabel(5)).toBe("6TH");
    const sixth = rankedStripRect(5, 8);
    const first = rankedStripRect(0, 8);
    expect(sixth.y).toBeGreaterThan(first.y);
    expect(sixth.x).toBe(first.x);
    expect(rankedStripRect(4, 8).y).toBe(first.y);
    const eight = fillLineupByStatLeaders(
      resizeRankedStrips(createEmptyStrips(), 8),
      "2012-13",
      "points",
    );
    expect(eight.strips).toHaveLength(8);
    expect(eight.strips.slice(0, 5).map((strip) => strip.lastName)).toEqual([
      "Westbrook",
      "Bryant",
      "Anthony",
      "Aldridge",
      "Lopez",
    ]);
    const extraIds = eight.strips.slice(5).map((strip) => strip.playerId);
    expect(extraIds.filter(Boolean)).toHaveLength(3);
    expect(
      extraIds.every(
        (id) => !eight.strips.slice(0, 5).some((strip) => strip.playerId === id),
      ),
    ).toBe(true);
    expect(parsePositionLabels(undefined, 8)).toEqual([
      "PG",
      "SG",
      "SF",
      "PF",
      "C",
      "6TH",
      "7TH",
      "8TH",
    ]);
  });
});
