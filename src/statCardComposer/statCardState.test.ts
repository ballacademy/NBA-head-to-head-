import { describe, expect, it } from "vitest";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "./statCardLayout";
import {
  defaultStatCardDraft,
  fillStatCardFromGame,
  fillStatCardFromPlayer,
  playerName,
} from "./statCardState";

describe("stat card composer", () => {
  it("is a 4:5 split with empty photo-first and four huge stats", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    const draft = defaultStatCardDraft();
    expect(draft.photoSrc).toBeNull();
    expect(draft.customPhoto).toBe(false);
    expect(draft.stats).toHaveLength(4);
    expect(draft.stats.map((line) => line.label)).toEqual([
      "PTS",
      "REB",
      "AST",
      "3PM",
    ]);
    expect(draft.showBa).toBe(true);
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
      },
    });
    expect(filled.stats[0]?.value).toBe("29");
    expect(filled.stats[2]?.value).toBe("6");
    expect(filled.stats[3]?.value).toBe("6-11");
  });
});
