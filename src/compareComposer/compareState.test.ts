import { describe, expect, it } from "vitest";
import catalog from "../../data/every-team-historical-rosters.json";
import {
  hydrateEveryTeamRosters,
  statsSeasonFor,
} from "../everyTeamComposer/historicalRosters";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  addCompareStat,
  applySideStatValues,
  autoCompareStatsLabel,
  COMPARE_STAT_COUNT,
  COMPARE_STAT_MAX,
  compareCaptionFor,
  defaultCompareDraft,
  defaultCompareStats,
  isAutoCompareSubtitle,
  normalizeCompareDraft,
  fillCompareSide,
  leadingSide,
  nextCompareStat,
  numericStat,
  parseCompareStats,
  parseCompareStatsMode,
  removeCompareStat,
  formatCompareMinutes,
  statsFromLastGame,
  statsFromSeason,
} from "./compareState";
import {
  CMP_INSET,
  CMP_PHOTO_W,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
  comparePhotoFrame,
  compareStackTop,
  compareStatType,
} from "./compareLayout";

hydrateEveryTeamRosters(
  catalog as unknown as Parameters<typeof hydrateEveryTeamRosters>[0],
);

describe("compare composer recs", () => {
  it("starts empty-photo with this-season averages and stacked default stats", () => {
    const draft = defaultCompareDraft();
    expect(draft.sides[0]?.photoSrc).toBeNull();
    expect(draft.sides[1]?.photoSrc).toBeNull();
    expect(draft.statsMode).toBe("season");
    expect(draft.stats.map((stat) => stat.label)).toEqual([
      "PTS",
      "FG%",
      "3P%",
      "REB",
      "AST",
    ]);
    expect(parseCompareStatsMode(undefined)).toBe("season");
    expect(autoCompareStatsLabel("season", "2026-27")).toBe(
      `${statsSeasonFor("2026-27")} AVG`,
    );
    expect(autoCompareStatsLabel("game", "2026-27")).toBe("LAST GAME");
    expect(draft.subtitle).toBe("");
    expect(isAutoCompareSubtitle("CAREER START VS CAREER BENCH APPEARANCES")).toBe(
      true,
    );
    expect(
      normalizeCompareDraft({
        ...draft,
        subtitle: "CAREER START VS CAREER BENCH APPEARANCES",
      }).subtitle,
    ).toBe("");
    expect(compareCaptionFor(draft)).not.toContain("CAREER START");
  });

  it("fills a side without a mugshot and highlights the leader", () => {
    const luka = getPlayer("3945274")!;
    const next = fillCompareSide(luka, defaultCompareDraft().sides[0]!);
    expect(next.playerId).toBe(luka.id);
    expect(next.photoSrc).toBeNull();
    expect(next.lastName.toUpperCase()).toContain("DONCIC");
    expect(leadingSide("31.1", "24.2")).toBe(0);
    expect(leadingSide("24.2", "31.1")).toBe(1);
    expect(leadingSide("24.2", "24.2")).toBeNull();
    expect(numericStat("47.2%")).toBeCloseTo(47.2);
  });

  it("reads season averages through last-year fallback", () => {
    const sga = getPlayer("4278073");
    const id = sga?.id ?? "4278073";
    const values = statsFromSeason(id, "OKC", "2026-27", defaultCompareStats());
    expect(values[0]).toMatch(/^\d/);
    const game = statsFromLastGame(
      {
        eventId: "1",
        gameDate: "2026-10-13",
        teamId: "OKC",
        opponentId: "MIN",
        opponentAbbrev: "MIN",
        result: "W",
        playerScore: "120",
        opponentScore: "110",
        resultLine: "W",
        dateLabel: "10/13",
        stats: {
          pts: "33",
          reb: "6",
          ast: "8",
          stl: "1",
          blk: "1",
          fg: "12-22",
          three: "3-8",
          tov: "2",
          min: "36",
        },
      },
      defaultCompareStats(),
    );
    expect(game[0]).toBe("33");
    expect(game[1]).toBe("54.5");
    expect(formatCompareMinutes("36:42")).toBe("36");
    expect(formatCompareMinutes("0.7")).toBe("42");
    expect(formatCompareMinutes("33.2")).toBe("33");
    const ten = addCompareStat(
      addCompareStat(
        addCompareStat(defaultCompareStats()),
      ),
    );
    const gameTen = statsFromLastGame(
      {
        eventId: "1",
        gameDate: "2026-10-13",
        teamId: "OKC",
        opponentId: "MIN",
        opponentAbbrev: "MIN",
        result: "W",
        playerScore: "120",
        opponentScore: "110",
        resultLine: "W",
        dateLabel: "10/13",
        stats: {
          pts: "33",
          reb: "6",
          ast: "8",
          stl: "1",
          blk: "1",
          fg: "12-22",
          three: "3-8",
          tov: "2",
          min: "36",
          ft: "8-9",
        },
      },
      ten,
    );
    expect(ten.map((stat) => stat.label).slice(5)).toEqual(["FT%", "TOV", "MIN"]);
    expect(gameTen.slice(5)).toEqual(["88.9", "2", "36"]);
    const patched = applySideStatValues(defaultCompareStats(), 0, game);
    expect(patched[0]?.left).toBe("33");
    expect(patched[0]?.right).toBe("");
  });

  it("adds unused counting stats through 10 without shrinking the photo columns", () => {
    expect(COMPARE_STAT_COUNT).toBe(5);
    expect(COMPARE_STAT_MAX).toBe(10);
    expect(CMP_PHOTO_W).toBe(390);
    expect(GRAPHIC_WIDTH * 2).toBe(2400);
    expect(GRAPHIC_HEIGHT * 2).toBe(3000);
    const feed = comparePhotoFrame(false, false);
    const story = comparePhotoFrame(true, false);
    const withSub = comparePhotoFrame(false, true);
    expect(feed.y).toBe(compareStackTop());
    expect(feed.h).toBe(GRAPHIC_HEIGHT - compareStackTop() - CMP_INSET);
    expect(feed.h).toBeGreaterThan(GRAPHIC_HEIGHT * 0.8);
    expect(feed.y + feed.h).toBe(GRAPHIC_HEIGHT - CMP_INSET);
    expect(story.h).toBe(STORY_DESIGN_HEIGHT - compareStackTop() - CMP_INSET);
    expect(story.h).toBeGreaterThan(feed.h);
    expect(story.h).toBeGreaterThan(STORY_DESIGN_HEIGHT * 0.85);
    expect(withSub.h).toBeLessThan(feed.h);
    expect(comparePhotoFrame(false, false).h).toBe(feed.h);
    expect(compareStatType(5).value).toBe(40);
    expect(compareStatType(10).value).toBeLessThan(compareStatType(5).value);
    expect(compareStatType(10).value).toBeGreaterThanOrEqual(24);
    let stats = defaultCompareStats();
    const added: string[] = [];
    while (nextCompareStat(stats)) {
      added.push(nextCompareStat(stats)!.label);
      stats = addCompareStat(stats);
    }
    expect(added).toEqual(["FT%", "TOV", "MIN", "BLK", "STL"]);
    expect(stats).toHaveLength(10);
    expect(stats.map((stat) => stat.label)).toEqual([
      "PTS",
      "FG%",
      "3P%",
      "REB",
      "AST",
      "FT%",
      "TOV",
      "MIN",
      "BLK",
      "STL",
    ]);
    expect(addCompareStat(stats)).toHaveLength(10);
    expect(removeCompareStat(stats, 9)).toHaveLength(9);
    expect(removeCompareStat(defaultCompareStats(), 0)).toHaveLength(5);
    expect(parseCompareStats([...stats, emptyRow(), emptyRow()])).toHaveLength(
      10,
    );
    expect(leadingSide(stats[0]!.left, stats[0]!.right)).toBeNull();
    expect(leadingSide("2.4", "0.8")).toBe(0);
    expect(leadingSide("0.8", "2.4")).toBe(1);
  });
});

const emptyRow = () => ({
  key: "gp" as const,
  label: "GP",
  left: "1",
  right: "2",
});
