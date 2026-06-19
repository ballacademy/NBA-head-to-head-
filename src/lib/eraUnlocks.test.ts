import { describe, expect, it } from "vitest";
import { getActivePlayerPool } from "./activePlayerPool";
import { ACTIVE_STAR_COUNT, getActiveStarPlayerIds } from "./activeStars";
import {
  ALL_ERA_IDS,
  ALL_TIME_LEGENDS_TESTING_UNLOCK,
  ALL_TIME_WIN_THRESHOLD,
  getAllTimeWinsRemaining,
  getUnlockedEras,
  isAllTimeModeUnlocked,
} from "./eraUnlocks";
import { getLegendPlayerCount } from "./eraPlayers";
import { players } from "./playerPool";

describe("active player pool", () => {
  it("uses only current players outside all-time mode", () => {
    expect(getActivePlayerPool({ wins: 100 })).toEqual(players);
    expect(getActivePlayerPool({ wins: 100 }, { allTimeMode: false })).toEqual(
      players,
    );
  });

  it("adds active stars and legend pools in all-time mode when unlocked", () => {
    const allTimePool = getActivePlayerPool({ wins: 0 }, { allTimeMode: true });
    const activeStarIds = new Set(getActiveStarPlayerIds());
    const nonStarCurrentPlayers = players.filter(
      (player) => !activeStarIds.has(player.id),
    );

    expect(allTimePool.length).toBeLessThan(players.length);
    expect(allTimePool.some((player) => player.name === "Michael Jordan")).toBe(
      true,
    );
    expect(allTimePool.some((player) => player.name === "Kareem Abdul-Jabbar")).toBe(
      true,
    );
    expect(allTimePool.some((player) => player.name === "Kyle Lowry")).toBe(true);
    expect(
      allTimePool.some((player) =>
        nonStarCurrentPlayers.some(
          (currentPlayer) => currentPlayer.id === player.id,
        ),
      ),
    ).toBe(false);
    expect(allTimePool.length).toBeGreaterThanOrEqual(
      ACTIVE_STAR_COUNT + getLegendPlayerCount() - 10,
    );
  });

  it("unlocks every legend era together at the win threshold", () => {
    if (ALL_TIME_LEGENDS_TESTING_UNLOCK) {
      expect(getUnlockedEras({ wins: 0 })).toEqual(ALL_ERA_IDS);
      return;
    }

    expect(getUnlockedEras({ wins: 49 })).toEqual([]);
    expect(getUnlockedEras({ wins: 50 })).toEqual(ALL_ERA_IDS);
  });

  it("unlocks all-time mode at 50 wins", () => {
    if (ALL_TIME_LEGENDS_TESTING_UNLOCK) {
      expect(isAllTimeModeUnlocked({ wins: 0 })).toBe(true);
      return;
    }

    expect(isAllTimeModeUnlocked({ wins: 49 })).toBe(false);
    expect(isAllTimeModeUnlocked({ wins: 50 })).toBe(true);
  });

  it("reports wins remaining until legends unlock", () => {
    if (ALL_TIME_LEGENDS_TESTING_UNLOCK) {
      expect(getAllTimeWinsRemaining({ wins: 0 })).toBe(
        ALL_TIME_WIN_THRESHOLD,
      );
      return;
    }

    expect(getAllTimeWinsRemaining({ wins: 42 })).toBe(8);
    expect(getAllTimeWinsRemaining({ wins: 50 })).toBe(0);
  });
});
