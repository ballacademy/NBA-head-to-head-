import { describe, expect, it } from "vitest";
import { getActivePlayerPool } from "./activePlayerPool";
import { getUnlockedEras } from "./eraUnlocks";
import { players } from "./playerPool";

describe("active player pool", () => {
  it("uses only current players outside all-time mode", () => {
    expect(getActivePlayerPool({ wins: 100 })).toEqual(players);
    expect(getActivePlayerPool({ wins: 100 }, { allTimeMode: false })).toEqual(
      players,
    );
  });

  it("adds unlocked era legends only in all-time mode", () => {
    const allTimePool = getActivePlayerPool({ wins: 100 }, { allTimeMode: true });

    expect(allTimePool.length).toBeGreaterThan(players.length);
    expect(allTimePool.some((player) => player.name === "Michael Jordan")).toBe(
      true,
    );
  });

  it("unlocks eras at win thresholds", () => {
    expect(getUnlockedEras({ wins: 49 })).toEqual([]);
    expect(getUnlockedEras({ wins: 50 })).toEqual(["2010s"]);
    expect(getUnlockedEras({ wins: 100 })).toEqual(["2010s", "1990s"]);
  });
});
