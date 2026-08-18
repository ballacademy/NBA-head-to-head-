import { describe, expect, it } from "vitest";
import {
  assignLineupSlots,
  pairLineupsByPosition,
  sortLineupByPosition,
} from "./lineupOrder";
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
  freeThrowsAttempted: 3,
  freeThrowPct: 0.75,
  personalFouls: 2,
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

  it("lists dual-position centers with a PF secondary before pure centers", () => {
    const lineup = [
      makePlayer("Rudy Gobert", "C", { positions: ["C"], heightInches: 85 }),
      makePlayer("Naz Reid", "C", {
        positions: ["C", "PF"],
        heightInches: 81,
      }),
    ];

    expect(sortLineupByPosition(lineup).map((player) => player.name)).toEqual([
      "Naz Reid",
      "Rudy Gobert",
    ]);
  });
});

describe("assignLineupSlots", () => {
  it("gives a five unique PG–C slots even when listed positions repeat", () => {
    const lineup = [
      makePlayer("Point", "PG"),
      makePlayer("Combo", "PG", { positions: ["PG", "SG"], heightInches: 76 }),
      makePlayer("Wing", "SF"),
      makePlayer("Stretch", "SF", { positions: ["SF", "PF"], heightInches: 81 }),
      makePlayer("Big", "C"),
    ];

    expect(
      assignLineupSlots(lineup).map((entry) => [entry.slot, entry.player.name]),
    ).toEqual([
      ["PG", "Point"],
      ["SG", "Combo"],
      ["SF", "Wing"],
      ["PF", "Stretch"],
      ["C", "Big"],
    ]);
  });

  it("slides a second listed PG into SG rather than showing PG twice", () => {
    const lineup = [
      makePlayer("Shorter Point", "PG", { heightInches: 73 }),
      makePlayer("Taller Point", "PG", { heightInches: 76 }),
      makePlayer("Wing", "SF"),
      makePlayer("Power", "PF"),
      makePlayer("Big", "C"),
    ];

    expect(
      assignLineupSlots(lineup).map((entry) => [entry.slot, entry.player.name]),
    ).toEqual([
      ["PG", "Shorter Point"],
      ["SG", "Taller Point"],
      ["SF", "Wing"],
      ["PF", "Power"],
      ["C", "Big"],
    ]);
  });
});

describe("pairLineupsByPosition", () => {
  it("pairs opposing players on PG–C lineup slots", () => {
    const left = [
      makePlayer("Big", "C"),
      makePlayer("Point", "PG"),
      makePlayer("Wing", "SF"),
      makePlayer("Shooting", "SG"),
      makePlayer("Power", "PF"),
    ];
    const right = [
      makePlayer("Rim", "C"),
      makePlayer("Floor", "PG"),
      makePlayer("Three", "SF"),
      makePlayer("Two", "SG"),
      makePlayer("Four", "PF"),
    ];

    expect(
      pairLineupsByPosition(left, right).map((pair) => [
        pair.left?.name,
        pair.position,
        pair.right?.name,
      ]),
    ).toEqual([
      ["Point", "PG", "Floor"],
      ["Shooting", "SG", "Two"],
      ["Wing", "SF", "Three"],
      ["Power", "PF", "Four"],
      ["Big", "C", "Rim"],
    ]);
  });

  it("still uses PG–C labels when listed positions duplicate", () => {
    const left = [
      makePlayer("Point", "PG"),
      makePlayer("Combo", "PG", { positions: ["PG", "SG"] }),
      makePlayer("Wing", "SF"),
      makePlayer("Stretch", "SF", { positions: ["SF", "PF"] }),
      makePlayer("Big", "C"),
    ];
    const right = [
      makePlayer("Floor", "PG"),
      makePlayer("Two", "SG"),
      makePlayer("Three", "SF"),
      makePlayer("Four", "PF"),
      makePlayer("Rim", "C"),
    ];

    expect(pairLineupsByPosition(left, right).map((pair) => pair.position)).toEqual([
      "PG",
      "SG",
      "SF",
      "PF",
      "C",
    ]);
  });

  it("pads missing slots when lineups differ in length", () => {
    const left = [makePlayer("Point", "PG"), makePlayer("Big", "C")];
    const right = [makePlayer("Floor", "PG")];

    expect(
      pairLineupsByPosition(left, right).map((pair) => [
        pair.left?.name ?? null,
        pair.right?.name ?? null,
        pair.position,
      ]),
    ).toEqual([
      ["Point", "Floor", "PG"],
      [null, null, "SG"],
      [null, null, "SF"],
      [null, null, "PF"],
      ["Big", null, "C"],
    ]);
  });
});
