import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendMatchGameLogEntry,
  loadMatchGameLog,
  matchGameLogEntryHasMatchup,
  MATCH_GAME_LOG_MAX_ENTRIES,
  toCommunityMatchupAttachment,
} from "./matchGameLog";

const storage = new Map<string, string>();

describe("matchGameLog", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
  });

  it("appends live and queued entries newest-first", () => {
    appendMatchGameLogEntry({
      id: "live-1",
      kind: "live",
      mode: "classic",
      result: "win",
      opponentName: "East Office",
      ownerScore: 82.4,
      opponentScore: 79.1,
      bannerDelta: 12,
    });
    appendMatchGameLogEntry({
      id: "queued-1",
      kind: "queued",
      mode: "ranked",
      result: "loss",
      opponentName: "West Office",
      ownerScore: 71.2,
      opponentScore: 74.8,
      bannerDelta: -9,
      streakCounted: false,
    });

    expect(loadMatchGameLog()).toHaveLength(2);
    expect(loadMatchGameLog()[0]?.id).toBe("queued-1");
    expect(loadMatchGameLog()[1]?.streakCounted).toBe(true);
    expect(loadMatchGameLog()[0]?.streakCounted).toBe(false);
  });

  it("dedupes by match id and caps history length", () => {
    for (let index = 0; index < MATCH_GAME_LOG_MAX_ENTRIES + 5; index += 1) {
      appendMatchGameLogEntry({
        id: `match-${index}`,
        kind: "live",
        mode: "classic",
        result: "win",
        opponentName: `GM ${index}`,
        ownerScore: 80,
        opponentScore: 78,
      });
    }

    expect(loadMatchGameLog()).toHaveLength(MATCH_GAME_LOG_MAX_ENTRIES);
    const newestId = loadMatchGameLog()[0]?.id;
    expect(
      appendMatchGameLogEntry({
        id: newestId!,
        kind: "live",
        mode: "classic",
        result: "win",
        opponentName: "Duplicate",
        ownerScore: 80,
        opponentScore: 78,
      }),
    ).toBeNull();
    expect(loadMatchGameLog()[0]?.opponentName).not.toBe("Duplicate");
  });

  it("persists matchup snapshots for share rebuilds", () => {
    appendMatchGameLogEntry({
      id: "live-matchup-1",
      kind: "live",
      mode: "classic",
      result: "win",
      opponentName: "East Office",
      ownerScore: 82.4,
      opponentScore: 79.1,
      matchup: {
        modeLabel: "Casual H2H",
        userTeam: "My Five",
        opponentTeam: "East Office",
        userOvr: 82,
        opponentOvr: 79,
        userLineupNames: ["A", "B", "C", "D", "E"],
        opponentLineupNames: ["F", "G", "H", "I", "J"],
        userLineupIds: ["a", "b", "c", "d", "e"],
        opponentLineupIds: ["f", "g", "h", "i", "j"],
      },
    });

    const loaded = loadMatchGameLog()[0];
    expect(loaded?.matchup?.userTeam).toBe("My Five");
    expect(loaded?.matchup?.userLineupIds).toEqual(["a", "b", "c", "d", "e"]);
    expect(toCommunityMatchupAttachment(loaded!)?.kind).toBe("matchup");
  });

  it("keeps older entries without matchup snapshots loadable", () => {
    storage.set(
      "ddgm:match-game-log",
      JSON.stringify([
        {
          id: "legacy-1",
          recordedAt: "2026-08-01T00:00:00.000Z",
          kind: "live",
          mode: "classic",
          result: "loss",
          opponentName: "Old Office",
          ownerScore: 70,
          opponentScore: 75,
          streakCounted: true,
        },
      ]),
    );

    const loaded = loadMatchGameLog();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.matchup).toBeUndefined();
    expect(matchGameLogEntryHasMatchup(loaded[0]!)).toBe(false);
  });
});
