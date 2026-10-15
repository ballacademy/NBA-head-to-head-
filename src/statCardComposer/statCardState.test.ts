import { describe, expect, it } from "vitest";
import catalog from "../../data/every-team-historical-rosters.json";
import {
  hydrateEveryTeamRosters,
} from "../everyTeamComposer/historicalRosters";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STC_MATCHUP_H,
  STC_PHOTO_W,
  STORY_DESIGN_HEIGHT,
  statCardStoryRects,
  STC_STATS_X,
  STC_VALUE_SIZE,
  statCardRows,
  statCardType,
} from "./statCardLayout";
import {
  emptyStats,
  nbaTodayIso,
  type LastGame,
  type LastGameStats,
} from "../playerOfTheDayComposer/lastGame";
import {
  addStatCardLine,
  defaultStatCardDraft,
  fillStatCardFromGame,
  fillStatCardFromPlayer,
  fillStatCardFromSeason,
  fillStatCardFromStandout,
  statCardFromCoverSlot,
  formatStatCardMatchup,
  keepMinLast,
  lastGameValueForKey,
  moveStatCardLine,
  notableStatCardLines,
  nextStatCardLine,
  normalizeStatCardDraft,
  playerName,
  removeStatCardLine,
  setStatCardLineKey,
  STC_STAT_COUNT,
  STC_STAT_MAX,
} from "./statCardState";

hydrateEveryTeamRosters(
  catalog as unknown as Parameters<typeof hydrateEveryTeamRosters>[0],
);

const box = (stats: Partial<LastGameStats>): LastGameStats => ({
  ...emptyStats(),
  ...stats,
});

const gameFrom = (
  stats: Partial<LastGameStats>,
  extra: Partial<LastGame> = {},
): LastGame => ({
  eventId: "1",
  gameDate: "2026-10-14",
  teamId: "MIL",
  opponentId: "NYK",
  opponentAbbrev: "NYK",
  result: "W",
  playerScore: "120",
  opponentScore: "110",
  home: true,
  resultLine: "W",
  dateLabel: "10/14",
  ...extra,
  stats: box(stats),
});

describe("stat card composer", () => {
  it("is a 4:5 split with empty photo-first and three huge stats", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    const draft = defaultStatCardDraft();
    expect(draft.photoSrc).toBeNull();
    expect(draft.customPhoto).toBe(false);
    expect(STC_STAT_COUNT).toBe(3);
    expect(draft.stats).toHaveLength(3);
    expect(draft.stats.map((line) => line.label)).toEqual(["PTS", "REB", "AST"]);
    expect(draft.source).toBe("last-game");
    expect(draft.gameDate).toBe(nbaTodayIso());
    expect(draft.showBa).toBe(true);
    expect(draft.showMatchup).toBe(false);
    expect(draft.matchup).toBe("");
    const story = statCardStoryRects();
    expect(STORY_DESIGN_HEIGHT).toBe(2133);
    expect(story.photo.w).toBe(GRAPHIC_WIDTH);
    expect(story.photo.h).toBeGreaterThan(GRAPHIC_HEIGHT * 0.7);
    expect(story.stats.w).toBe(GRAPHIC_WIDTH);
    expect(story.stats.y).toBeGreaterThan(story.photo.h);
    const luka = getPlayer("3945274")!;
    const packed = statCardFromCoverSlot(
      {
        playerId: luka.id,
        firstName: "Luka",
        lastName: "Doncic",
        teamId: luka.team,
      },
      gameFrom({ pts: "20", reb: "15", ast: "9", min: "24" }),
      "2026-10-14",
    );
    expect(packed?.photoSrc).toBeNull();
    expect(packed?.customPhoto).toBe(false);
    expect(packed?.lastName.toUpperCase()).toContain("DONCIC");
  });

  it("keeps the editor list identical to the stats on the card", () => {
    const draft = defaultStatCardDraft();
    expect(draft.stats.map((line) => line.label)).toEqual(["PTS", "REB", "AST"]);
    const four = addStatCardLine(draft.stats);
    expect(four).toHaveLength(4);
    expect(four.map((line) => line.label)).toEqual(["PTS", "REB", "AST", "MIN"]);
    expect(removeStatCardLine(four, 3)).toHaveLength(3);
    expect(removeStatCardLine(draft.stats, 0)).toHaveLength(2);
    expect(removeStatCardLine([{ key: "pts", label: "PTS", value: "22" }], 0)).toHaveLength(1);
    const six: typeof draft.stats = [
      { key: "pts", label: "PTS", value: "20" },
      { key: "reb", label: "REB", value: "8" },
      { key: "ast", label: "AST", value: "6" },
      { key: "stl", label: "STL", value: "3" },
      { key: "blk", label: "BLK", value: "2" },
      { key: "min", label: "MIN", value: "23" },
    ];
    expect(removeStatCardLine(six, 2).map((line) => line.key)).toEqual([
      "pts",
      "reb",
      "stl",
      "blk",
      "min",
    ]);
    expect(
      keepMinLast([
        { key: "pts", label: "PTS", value: "19" },
        { key: "min", label: "MIN", value: "23" },
        { key: "blk", label: "BLK", value: "4" },
      ]).map((line) => line.key),
    ).toEqual(["pts", "blk", "min"]);
    const swapped = setStatCardLineKey(draft.stats, 1, "blk", "last-game");
    expect(swapped.map((line) => line.label)).toEqual(["PTS", "BLK", "AST"]);
    const stacked: typeof draft.stats = [
      { key: "pts", label: "PTS", value: "22" },
      { key: "reb", label: "REB", value: "8" },
      { key: "ast", label: "AST", value: "6" },
      { key: "min", label: "MIN", value: "23" },
    ];
    expect(moveStatCardLine(stacked, 3, 1).map((line) => line.key)).toEqual([
      "pts",
      "min",
      "reb",
      "ast",
    ]);
    expect(moveStatCardLine(stacked, 0, 2).map((line) => line.key)).toEqual([
      "reb",
      "ast",
      "pts",
      "min",
    ]);
    expect(moveStatCardLine(stacked, 1, 1)).toBe(stacked);
    expect(moveStatCardLine(stacked, -1, 0)).toBe(stacked);
    expect(moveStatCardLine(stacked, 0, 9)).toBe(stacked);
    const restored = normalizeStatCardDraft({
      ...draft,
      stats: four,
      gameDate: "2026-10-14",
    });
    expect(restored.stats).toHaveLength(4);
    expect(restored.gameDate).toBe("2026-10-14");
  });

  it("fills name and team from the picker without a smiling mugshot", () => {
    const jokic = getPlayer("3112335")!;
    const next = fillStatCardFromPlayer(jokic, defaultStatCardDraft());
    expect(next.playerId).toBe(jokic.id);
    expect(next.teamId).toBeTruthy();
    expect(next.photoSrc).toBeNull();
    expect(playerName(next).length).toBeGreaterThan(3);
    const filled = fillStatCardFromGame(next, {
      eventId: "1",
      gameDate: "2026-10-13",
      teamId: next.teamId ?? "MIN",
      opponentId: "LAL",
      opponentAbbrev: "LAL",
      result: "W",
      playerScore: "120",
      opponentScore: "110",
      resultLine: "W",
      dateLabel: "10/13",
      stats: {
        pts: "29",
        reb: "4",
        ast: "6",
        stl: "1",
        blk: "0",
        fg: "11-20",
        three: "6-11",
        tov: "2",
        min: "34",
      },
    });
    expect(filled.stats[0]?.value).toBe("29");
    expect(filled.stats[2]?.value).toBe("6");
    expect(filled.stats).toHaveLength(3);
    expect(addStatCardLine(filled.stats).map((line) => line.label)).toEqual([
      "PTS",
      "REB",
      "AST",
      "MIN",
    ]);
  });

  it("adds unused counting stats through 8 without changing the photo column", () => {
    expect(STC_STAT_MAX).toBe(8);
    expect(STC_PHOTO_W).toBe(748);
    expect(statCardType(3).value).toBe(STC_VALUE_SIZE);
    expect(statCardType(8).value).toBeLessThan(statCardType(3).value);
    expect(statCardType(8).value).toBeGreaterThanOrEqual(44);
    let stats = defaultStatCardDraft().stats;
    const added: string[] = [];
    while (nextStatCardLine(stats)) {
      added.push(nextStatCardLine(stats)!.label);
      stats = addStatCardLine(stats);
    }
    expect(added).toEqual(["MIN", "BLK", "STL", "TOV", "3PM"]);
    expect(stats).toHaveLength(8);
    expect(addStatCardLine(stats)).toHaveLength(8);
  });

  it("maps MIN to minutes, never FGM-FGA, last-game and season", () => {
    const stats = box({
      pts: "18",
      reb: "4",
      ast: "2",
      stl: "1",
      blk: "0",
      fg: "4-12",
      three: "1-6",
      tov: "3",
      min: "32",
    });
    expect(lastGameValueForKey("min", stats)).toBe("32");
    expect(lastGameValueForKey("fg", stats)).toBe("4-12");
    expect(lastGameValueForKey("three", stats)).toBe("1-6");
    expect(lastGameValueForKey("blk", stats)).toBe("0");
    expect(lastGameValueForKey("min", box({ min: "18:42", fg: "4-12" }))).toBe(
      "18",
    );
    expect(lastGameValueForKey("min", box({ min: "4-12", fg: "4-12" }))).toBe("");
    const filled = fillStatCardFromGame(
      {
        ...defaultStatCardDraft(),
        stats: addStatCardLine(defaultStatCardDraft().stats),
      },
      gameFrom(stats),
    );
    expect(filled.stats.map((line) => `${line.value} ${line.label}`)).toEqual([
      "18 PTS",
      "4 REB",
      "2 AST",
      "32 MIN",
    ]);
    const fromFg = setStatCardLineKey(
      [
        { key: "fg", label: "FG", value: "4-12" },
        { key: "reb", label: "REB", value: "4" },
        { key: "ast", label: "AST", value: "2" },
      ],
      0,
      "min",
      "last-game",
      stats,
    );
    expect(fromFg[0]).toMatchObject({ key: "min", label: "MIN", value: "32" });
    expect(fromFg[0]?.value).not.toContain("-");
    const shai = getPlayer("4278073")!;
    const season = fillStatCardFromSeason(
      {
        ...fillStatCardFromPlayer(shai, defaultStatCardDraft()),
        stats: addStatCardLine(defaultStatCardDraft().stats),
        source: "season",
      },
      "2025-26",
      "regular",
    );
    const minLine = season.stats.find((line) => line.key === "min");
    expect(minLine?.label).toBe("MIN");
    expect(minLine?.value).toMatch(/^\d+(\.\d)?$/);
    expect(minLine?.value).not.toMatch(/-/);
    expect(Number(minLine?.value)).toBeGreaterThan(20);
    const fgSeason = fillStatCardFromSeason(
      {
        ...season,
        stats: setStatCardLineKey(season.stats, 3, "fg", "season"),
      },
      "2025-26",
      "regular",
    );
    const fgLine = fgSeason.stats.find((line) => line.key === "fg");
    expect(fgLine?.label).toBe("FG%");
    expect(Number(fgLine?.value)).toBeGreaterThan(40);
  });

  it("auto-picks notable last-game lines without padding junk", () => {
    const threeStat = notableStatCardLines(
      box({ pts: "20", reb: "15", ast: "9", stl: "1", blk: "0", min: "34" }),
    );
    expect(threeStat.map((line) => `${line.value} ${line.label}`)).toEqual([
      "20 PTS",
      "15 REB",
      "9 AST",
    ]);
    const loaded = notableStatCardLines(
      box({
        pts: "32",
        reb: "12",
        ast: "8",
        stl: "3",
        blk: "2",
        three: "5-9",
        fg: "12-22",
        min: "39",
        tov: "7",
      }),
    );
    expect(loaded.map((line) => line.label)).toEqual([
      "PTS",
      "REB",
      "AST",
      "STL",
      "BLK",
      "3PM",
      "FG",
      "MIN",
    ]);
    expect(loaded).toHaveLength(8);
    const quiet = notableStatCardLines(
      box({ pts: "22", reb: "2", ast: "1", stl: "0", blk: "0", min: "28" }),
    );
    expect(quiet.map((line) => `${line.value} ${line.label}`)).toEqual([
      "22 PTS",
      "28 MIN",
    ]);
    const standout = fillStatCardFromStandout(defaultStatCardDraft(), gameFrom({
      pts: "20",
      reb: "12",
      ast: "8",
      stl: "2",
      blk: "2",
      min: "36",
    }));
    expect(standout.stats.map((line) => line.label)).toEqual([
      "PTS",
      "REB",
      "AST",
      "STL",
      "BLK",
      "MIN",
    ]);
  });

  it("shows FG / 3PM as makes-attempts, with MIN last", () => {
    const hot = notableStatCardLines(
      box({
        pts: "24",
        reb: "3",
        ast: "2",
        fg: "9-14",
        three: "4-5",
        min: "32",
      }),
    );
    expect(hot.map((line) => `${line.value} ${line.label}`)).toEqual([
      "24 PTS",
      "4-5 3PM",
      "9-14 FG",
    ]);
    const burst = notableStatCardLines(
      box({ pts: "18", reb: "2", ast: "1", min: "12", fg: "7-9" }),
    );
    expect(burst.map((line) => `${line.value} ${line.label}`)).toEqual([
      "18 PTS",
      "7-9 FG",
      "12 MIN",
    ]);
    const starterMinutes = notableStatCardLines(
      box({ pts: "16", reb: "5", ast: "4", min: "33" }),
    );
    expect(starterMinutes.map((line) => line.label)).toEqual(["PTS", "REB", "AST"]);
    const efg = notableStatCardLines(
      box({
        pts: "22",
        reb: "2",
        ast: "1",
        fg: "8-15",
        three: "3-3",
        min: "30",
      }),
    );
    expect(efg.map((line) => `${line.value} ${line.label}`)).toContain("8-15 FG");
    expect(efg.map((line) => line.label).join(" ")).not.toMatch(/%/);
    const wemby = notableStatCardLines(
      box({
        pts: "19",
        reb: "4",
        ast: "3",
        stl: "2",
        blk: "4",
        fg: "9-14",
        min: "23",
      }),
    );
    expect(wemby.map((line) => `${line.value} ${line.label}`)).toEqual([
      "19 PTS",
      "4 REB",
      "2 STL",
      "4 BLK",
      "9-14 FG",
      "23 MIN",
    ]);
    const brick = notableStatCardLines(
      box({ pts: "18", fg: "1-1", three: "1-1", min: "26" }),
    );
    expect(brick.map((line) => line.label)).toEqual(["PTS", "MIN"]);
    const volume = notableStatCardLines(
      box({ pts: "28", fg: "12-22", three: "6-11", min: "34" }),
    );
    expect(volume.map((line) => `${line.value} ${line.label}`)).toContain(
      "6-11 3PM",
    );
    expect(volume.map((line) => `${line.value} ${line.label}`)).toContain(
      "12-22 FG",
    );
  });

  it("auto-picks FG by position floor and 3s by makes", () => {
    const wiggins = getPlayer("3059319")!;
    expect(wiggins.positionGroup).toBe("F");
    const wigNight = box({
      pts: "19",
      reb: "6",
      ast: "1",
      stl: "1",
      blk: "1",
      fg: "8-15",
      three: "1-5",
      min: "22",
    });
    expect(
      notableStatCardLines(wigNight, wiggins).map(
        (line) => `${line.value} ${line.label}`,
      ),
    ).toEqual(["19 PTS", "6 REB", "8-15 FG", "22 MIN"]);
    const fromStandout = fillStatCardFromStandout(
      { ...defaultStatCardDraft(), playerId: wiggins.id },
      gameFrom(wigNight),
    );
    expect(
      fromStandout.stats.map((line) => `${line.value} ${line.label}`),
    ).toContain("8-15 FG");

    expect(
      notableStatCardLines(box({ pts: "16", fg: "8-17", min: "31" }), "G").map(
        (line) => `${line.value} ${line.label}`,
      ),
    ).toContain("8-17 FG");
    expect(
      notableStatCardLines(box({ pts: "16", fg: "7-16", min: "31" }), "G").map(
        (line) => line.label,
      ),
    ).not.toContain("FG");
    expect(
      notableStatCardLines(box({ pts: "16", fg: "8-17", min: "31" }), "F").map(
        (line) => line.label,
      ),
    ).not.toContain("FG");
    expect(
      notableStatCardLines(box({ pts: "18", fg: "8-13", min: "28" }), "C").map(
        (line) => `${line.value} ${line.label}`,
      ),
    ).toContain("8-13 FG");
    expect(
      notableStatCardLines(box({ pts: "19", fg: "8-15", min: "22" }), "C").map(
        (line) => line.label,
      ),
    ).not.toContain("FG");

    const volumeThrees = notableStatCardLines(
      box({ pts: "18", three: "4-12", fg: "6-18", min: "34" }),
      "G",
    );
    expect(volumeThrees.map((line) => `${line.value} ${line.label}`)).toContain(
      "4-12 3PM",
    );
    expect(volumeThrees.map((line) => line.label)).not.toContain("FG");
  });

  it("formats that night's W/L and score in the stats column, off by default", () => {
    expect(
      formatStatCardMatchup({
        result: "W",
        playerScore: "111",
        opponentScore: "109",
        opponentAbbrev: "OKC",
        home: true,
      }),
    ).toBe("W vs OKC 111–109");
    expect(
      formatStatCardMatchup({
        result: "L",
        playerScore: "103",
        opponentScore: "129",
        opponentAbbrev: "IND",
        home: false,
      }),
    ).toBe("L 103–129 @ IND");
    const filled = fillStatCardFromGame(
      defaultStatCardDraft(),
      gameFrom(
        { pts: "19" },
        {
          opponentAbbrev: "MIA",
          playerScore: "120",
          opponentScore: "110",
          result: "W",
          home: true,
        },
      ),
    );
    expect(filled.showMatchup).toBe(false);
    expect(filled.matchup).toBe("W vs MIA 120–110");
    const away = fillStatCardFromStandout(
      { ...defaultStatCardDraft(), showMatchup: true },
      gameFrom(
        { pts: "22" },
        {
          opponentAbbrev: "IND",
          playerScore: "103",
          opponentScore: "129",
          result: "L",
          home: false,
        },
      ),
    );
    expect(away.matchup).toBe("L 103–129 @ IND");
    const restored = normalizeStatCardDraft({
      ...defaultStatCardDraft(),
      showMatchup: true,
      matchup: "W vs OKC 111–109",
    });
    expect(restored.showMatchup).toBe(true);
    expect(normalizeStatCardDraft(defaultStatCardDraft()).showMatchup).toBe(
      false,
    );
    expect(STC_MATCHUP_H).toBe(86);
    expect(STC_STATS_X).toBe(748);
    const fitted = statCardRows(3, GRAPHIC_HEIGHT - STC_MATCHUP_H);
    expect(fitted[2]!.y + fitted[2]!.h).toBe(GRAPHIC_HEIGHT - STC_MATCHUP_H);
    expect(statCardRows(3)[2]!.h).toBeGreaterThan(fitted[2]!.h);
  });
});
