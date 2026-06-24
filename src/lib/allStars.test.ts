import { describe, expect, it } from "vitest";
import {
  getRecentAllStarPlayerIds,
  getWinUnlockPlayerIds,
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
  RECENT_ALL_STAR_COUNT,
} from "./allStars";
import { players, playersById } from "./playerPool";

describe("allStars recent tier", () => {
  it("defines recent all-stars from 2023 through 2025 who are not 2026 all-stars", () => {
    const recentIds = getRecentAllStarPlayerIds();

    expect(recentIds.length).toBeGreaterThan(0);
    expect(recentIds.length).toBeLessThanOrEqual(RECENT_ALL_STAR_COUNT);

    recentIds.forEach((playerId) => {
      const player = playersById.get(playerId);

      expect(player).toBeDefined();
      expect(isRecentAllStarPlayer(player!)).toBe(true);
      expect(isAllStarPlayer(player!)).toBe(false);
    });
  });

  it("includes Jayson Tatum as a recent all-star and superstar but not a 2026 all-star", () => {
    const tatum = players.find((player) => player.bbrPlayerId === "tatumja01");

    expect(tatum).toBeDefined();
    expect(isRecentAllStarPlayer(tatum!)).toBe(true);
    expect(isSuperstarPlayer(tatum!)).toBe(true);
    expect(isAllStarPlayer(tatum!)).toBe(false);
  });

  it("includes Kawhi Leonard as a superstar", () => {
    const kawhi = players.find((player) => player.bbrPlayerId === "leonaka01");

    expect(kawhi).toBeDefined();
    expect(isSuperstarPlayer(kawhi!)).toBe(true);
    expect(isAllStarPlayer(kawhi!)).toBe(true);
  });

  it("includes manually added recent all-stars in the active pool", () => {
    const haliburton = players.find((player) => player.bbrPlayerId === "halibty01");
    const kyrie = players.find((player) => player.bbrPlayerId === "irvinky01");
    const lillard = players.find((player) => player.bbrPlayerId === "lillada01");
    const vanvleet = players.find((player) => player.bbrPlayerId === "vanvlfr01");

    expect(haliburton && kyrie && lillard && vanvleet).toBeTruthy();
    expect(isRecentAllStarPlayer(haliburton!)).toBe(true);
    expect(isRecentAllStarPlayer(kyrie!)).toBe(true);
    expect(isRecentAllStarPlayer(lillard!)).toBe(true);
    expect(isRecentAllStarPlayer(vanvleet!)).toBe(false);
  });

  it("expands win unlocks to include recent all-stars", () => {
    const unlockPool = getWinUnlockPlayerIds();

    expect(unlockPool.length).toBeGreaterThan(getRecentAllStarPlayerIds().length);

    getRecentAllStarPlayerIds().forEach((playerId) => {
      expect(unlockPool).toContain(playerId);
    });
  });
});
