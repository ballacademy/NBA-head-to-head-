import { describe, expect, it } from "vitest";
import { sortLineupByPosition } from "./lineupOrder";
import type { Player } from "./types";

const makePlayer = (
  name: string,
  position: Player["position"],
  options: {
    positions?: Player["positions"];
    heightInches?: number;
  } = {},
): Player => ({
  id: name,
  name,
  team: "LAL",
  position,
  positions: options.positions ?? [position],
  jerseyNumber: 23,
  points: 20,
  rebounds: 5,
  assists: 3,
  steals: 1,
  blocks: 1,
  turnovers: 2,
  trueShooting: 0.58,
  threePoint: 0.35,
  threePointersAttempted: 6,
  fieldGoalsAttempted: 14,
  minutes: 32,
  heightInches: options.heightInches ?? 78,
  usage: 25,
  defense: 7,
  gamesPlayed: 70,
  styles: ["connector"],
});

describe("sortLineupByPosition", () => {
  it("orders players from guards to center", () => {
    const lineup = [
      makePlayer("Center", "C"),
      makePlayer("Point", "PG"),
      makePlayer("Forward", "SF"),
      makePlayer("Shooting", "SG"),
      makePlayer("Power", "PF"),
    ];

    expect(sortLineupByPosition(lineup).map((player) => player.position)).toEqual([
      "PG",
      "SG",
      "SF",
      "PF",
      "C",
    ]);
  });

  it("lists single-position players before dual-position players at the same primary", () => {
    const lineup = [
      makePlayer("Combo Guard", "PG", { positions: ["PG", "SG"] }),
      makePlayer("Pure Point", "PG", { positions: ["PG"], heightInches: 74 }),
    ];

    expect(sortLineupByPosition(lineup).map((player) => player.name)).toEqual([
      "Pure Point",
      "Combo Guard",
    ]);
  });

  it("breaks ties by height when primary and position eligibility match", () => {
    const lineup = [
      makePlayer("Tall Point", "PG", { positions: ["PG"], heightInches: 76 }),
      makePlayer("Short Point", "PG", { positions: ["PG"], heightInches: 72 }),
      makePlayer("Tall Combo", "PG", {
        positions: ["PG", "SG"],
        heightInches: 78,
      }),
      makePlayer("Short Combo", "PG", {
        positions: ["PG", "SG"],
        heightInches: 73,
      }),
    ];

    expect(sortLineupByPosition(lineup).map((player) => player.name)).toEqual([
      "Short Point",
      "Tall Point",
      "Short Combo",
      "Tall Combo",
    ]);
  });

  it("orders dual-position players by secondary position before height", () => {
    const lineup = [
      makePlayer("Wing Point", "PG", {
        positions: ["PG", "SF"],
        heightInches: 72,
      }),
      makePlayer("Combo Guard", "PG", {
        positions: ["PG", "SG"],
        heightInches: 76,
      }),
    ];

    expect(sortLineupByPosition(lineup).map((player) => player.name)).toEqual([
      "Combo Guard",
      "Wing Point",
    ]);
  });
});
