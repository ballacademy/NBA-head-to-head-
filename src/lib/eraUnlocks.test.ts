import { describe, expect, it } from "vitest";
import { getUnlockedEras } from "./eraUnlocks";
import { getEraPlayerPool } from "./eraPlayers";

describe("era unlocks", () => {
  it("unlocks 2010s at 50 wins and 1990s at 100 wins", () => {
    expect(getUnlockedEras({ wins: 49 })).toEqual([]);
    expect(getUnlockedEras({ wins: 50 })).toEqual(["2010s"]);
    expect(getUnlockedEras({ wins: 100 })).toEqual(["2010s", "1990s"]);
  });

  it("adds era legends to the active pool when unlocked", () => {
    const pool = getEraPlayerPool(["2010s", "1990s"]);

    expect(pool.some((player) => player.name === "LeBron James")).toBe(true);
    expect(pool.some((player) => player.name === "Michael Jordan")).toBe(true);
    expect(pool.every((player) => player.era)).toBe(true);
  });
});
