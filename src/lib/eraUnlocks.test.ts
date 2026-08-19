import { describe, expect, it } from "vitest";
import { getActivePlayerPool } from "./activePlayerPool";
import { ACTIVE_STAR_COUNT, getActiveStarPlayerIds } from "./activeStars";
import {
  ALL_ERA_IDS,
  ALL_TIME_MODE_PLAYABLE,
  getUnlockedEras,
  isAllTimeModePlayable,
} from "./eraUnlocks";
import { getLegendPlayerCount } from "./eraPlayers";
import { players } from "./playerPool";

describe("all-time mode availability", () => {
  it("keeps all-time mode behind a date gate on production until launched", () => {
    expect(ALL_TIME_MODE_PLAYABLE).toBe(false);
    expect(isAllTimeModePlayable("www.draftdaygm.com")).toBe(false);
    expect(isAllTimeModePlayable("")).toBe(false);
  });

  it("exposes all-time mode on QA and local hosts", () => {
    expect(isAllTimeModePlayable("nba-head-to-head-qa.pages.dev")).toBe(true);
    expect(isAllTimeModePlayable("qa.draftdaygm.com")).toBe(true);
    expect(isAllTimeModePlayable("localhost")).toBe(true);
  });
});

describe("active player pool", () => {
  it("uses only current players outside all-time mode", () => {
    expect(getActivePlayerPool({ wins: 100 })).toEqual(players);
    expect(getActivePlayerPool({ wins: 100 }, { allTimeMode: false })).toEqual(
      players,
    );
  });

  it("unlocks all eras when in all-time mode (no per-player threshold)", () => {
    expect(getUnlockedEras()).toEqual(ALL_ERA_IDS);
    expect(getUnlockedEras()).toHaveLength(5);
  });

  it("adds active stars and legend pools in all-time mode", () => {
    const allTimePool = getActivePlayerPool(
      { wins: 0 },
      { allTimeMode: true },
    );
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

  it("keeps only the best season for a legend on the same franchise", () => {
    const pool = getActivePlayerPool({ wins: 0 }, { allTimeMode: true });
    const hakeemRockets = pool.filter(
      (player) => player.bbrPlayerId === "olajwh01" && player.team === "HOU",
    );

    expect(hakeemRockets).toHaveLength(1);
    expect(hakeemRockets[0]?.points).toBe(27.8);
  });

  it("uses best-season stats for active stars like Kyle Lowry", () => {
    const pool = getActivePlayerPool({ wins: 0 }, { allTimeMode: true });
    const lowry = pool.find((player) => player.bbrPlayerId === "lowryky01");

    expect(lowry?.points).toBe(22.4);
    expect(lowry?.minutes).toBe(37.4);
  });
});
