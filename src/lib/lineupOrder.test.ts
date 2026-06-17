import { describe, expect, it } from "vitest";
import { sortLineupByPosition } from "./lineupOrder";
import type { Player } from "./types";

const makePlayer = (name: string, position: Player["position"]): Player => ({
  id: name,
  name,
  team: "LAL",
  position,
  positions: [position],
  jerseyNumber: 23,
  points: 20,
  rebounds: 5,
  assists: 3,
  steals: 1,
  blocks: 1,
  trueShooting: 0.58,
  threePoint: 0.35,
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
});
