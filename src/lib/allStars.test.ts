import { describe, expect, it } from "vitest";
import {
  getRecentAllStarPlayerIds,
  getRecentAllStarUnlockPlayerIds,
  getWinUnlockPlayerIds,
  isAllStarPlayer,
  isRecentAllStarPlayer,
  isSuperstarPlayer,
  RECENT_ALL_STAR_COUNT,
} from "./allStars";
import { players, playersById } from "./playerPool";

describe("allStars recent tier", () => {
  it("defines recent all-stars from 2023 through 2025 who are not 2026 all-stars or superstars", () => {
    const recentIds = getRecentAllStarPlayerIds();

    expect(recentIds.length).toBeGreaterThan(0);
    expect(recentIds.length).toBeLessThanOrEqual(RECENT_ALL_STAR_COUNT);

    recentIds.forEach((playerId) => {
      const player = playersById.get(playerId);

      expect(player).toBeDefined();
      expect(isRecentAllStarPlayer(player!)).toBe(true);
      expect(isAllStarPlayer(player!)).toBe(false);
      expect(isSuperstarPlayer(player!)).toBe(false);
    });
  });

  it("classifies Jayson Tatum as superstar only, while still unlocking him with recent grants", () => {
    const tatum = players.find((player) => player.bbrPlayerId === "tatumja01");

    expect(tatum).toBeDefined();
    expect(isSuperstarPlayer(tatum!)).toBe(true);
    expect(isRecentAllStarPlayer(tatum!)).toBe(false);
    expect(isAllStarPlayer(tatum!)).toBe(false);
    expect(getRecentAllStarUnlockPlayerIds()).toContain(tatum!.id);
    expect(getRecentAllStarPlayerIds()).not.toContain(tatum!.id);
  });

  it("classifies current all-star superstars as superstar only", () => {
    const kawhi = players.find((player) => player.bbrPlayerId === "leonaka01");

    expect(kawhi).toBeDefined();
    expect(isSuperstarPlayer(kawhi!)).toBe(true);
    expect(isAllStarPlayer(kawhi!)).toBe(false);
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

  it("expands win unlocks to include recent all-stars and superstars", () => {
    const unlockPool = getWinUnlockPlayerIds();

    expect(unlockPool.length).toBeGreaterThan(getRecentAllStarPlayerIds().length);

    getRecentAllStarUnlockPlayerIds().forEach((playerId) => {
      expect(unlockPool).toContain(playerId);
    });
  });
});
