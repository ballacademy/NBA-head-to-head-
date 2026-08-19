import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendMatchGameLogEntry,
  loadMatchGameLog,
  MATCH_GAME_LOG_MAX_ENTRIES,
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
});
