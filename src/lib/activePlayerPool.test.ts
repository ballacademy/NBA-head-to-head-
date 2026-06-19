import { describe, expect, it } from "vitest";
import { getActivePlayerPool } from "./activePlayerPool";

describe("getActivePlayerPool", () => {
  it("keeps only the best season for a legend on the same franchise", () => {
    const pool = getActivePlayerPool({ wins: 0 }, { allTimeMode: true });
    const hakeemRockets = pool.filter(
      (player) => player.bbrPlayerId === "olajwh01" && player.team === "HOU",
    );

    expect(hakeemRockets).toHaveLength(1);
    expect(hakeemRockets[0]?.points).toBe(27.8);
  });
});
