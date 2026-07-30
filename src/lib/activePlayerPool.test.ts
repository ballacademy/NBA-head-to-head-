import { describe, expect, it } from "vitest";
import { getActivePlayerPool } from "./activePlayerPool";
import { ACTIVE_STAR_COUNT, getActiveStarPlayerIds } from "./activeStars";
import { ALL_TIME_WIN_THRESHOLD } from "./eraUnlocks";
import { getLegendPlayerCount } from "./eraPlayers";
import { players } from "./playerPool";

const unlockedRecord = { wins: ALL_TIME_WIN_THRESHOLD };

describe("getActivePlayerPool", () => {
  it("keeps only the best season for a legend on the same franchise", () => {
    const pool = getActivePlayerPool(unlockedRecord, { allTimeMode: true });
    const hakeemRockets = pool.filter(
      (player) => player.bbrPlayerId === "olajwh01" && player.team === "HOU",
    );

    expect(hakeemRockets).toHaveLength(1);
    expect(hakeemRockets[0]?.points).toBe(27.8);
  });

  it("uses active stars and legends only in all-time mode", () => {
    const pool = getActivePlayerPool(unlockedRecord, { allTimeMode: true });
    const activeStarIds = new Set(getActiveStarPlayerIds());
    const nonStarCurrentPlayers = players.filter(
      (player) => !activeStarIds.has(player.id),
    );

    expect(pool.length).toBeLessThan(players.length);
    expect(pool.some((player) => player.name === "Kyle Lowry")).toBe(true);
    expect(pool.some((player) => player.name === "Michael Jordan")).toBe(true);
    expect(
      pool.some((player) =>
        nonStarCurrentPlayers.some(
          (currentPlayer) => currentPlayer.id === player.id,
        ),
      ),
    ).toBe(false);
    expect(pool.length).toBeGreaterThanOrEqual(
      ACTIVE_STAR_COUNT + getLegendPlayerCount() - 10,
    );
  });

  it("uses best-season stats for active stars like Kyle Lowry", () => {
    const pool = getActivePlayerPool(unlockedRecord, { allTimeMode: true });
    const lowry = pool.find((player) => player.bbrPlayerId === "lowryky01");

    expect(lowry?.points).toBe(22.4);
    expect(lowry?.minutes).toBe(37.4);
  });
});
