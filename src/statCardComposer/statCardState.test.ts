import { describe, expect, it } from "vitest";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STC_PHOTO_W,
  STC_VALUE_SIZE,
  statCardType,
} from "./statCardLayout";
import { nbaTodayIso } from "../playerOfTheDayComposer/lastGame";
import {
  addStatCardLine,
  defaultStatCardDraft,
  fillStatCardFromGame,
  fillStatCardFromPlayer,
  nextStatCardLine,
  normalizeStatCardDraft,
  playerName,
  removeStatCardLine,
  setStatCardLineKey,
  STC_STAT_COUNT,
  STC_STAT_MAX,
} from "./statCardState";

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
  });

  it("keeps the editor list identical to the stats on the card", () => {
    const draft = defaultStatCardDraft();
    expect(draft.stats.map((line) => line.label)).toEqual(["PTS", "REB", "AST"]);
    const four = addStatCardLine(draft.stats);
    expect(four).toHaveLength(4);
    expect(four.map((line) => line.label)).toEqual(["PTS", "REB", "AST", "MIN"]);
    expect(removeStatCardLine(four, 3)).toHaveLength(3);
    expect(removeStatCardLine(draft.stats, 0)).toHaveLength(3);
    const swapped = setStatCardLineKey(draft.stats, 1, "blk", "last-game");
    expect(swapped.map((line) => line.label)).toEqual(["PTS", "BLK", "AST"]);
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
});
