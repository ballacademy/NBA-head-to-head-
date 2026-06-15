import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  autofillFromBoard,
  choosePosition,
  DIVISIONS,
  eligiblePositions,
  generateDraftBoard,
  isEligibleForSlot,
  POSITIONS,
  type SlotGrant,
} from "./draft";
import type { Position } from "./types";

// Deterministic RNG that cycles through a fixed list of values.
const sequenceRng = (values: number[]) => {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
};

describe("choosePosition", () => {
  it("strongly favors positions that have not been granted yet", () => {
    const usedCounts = { PG: 1, SG: 0, SF: 0, PF: 0, C: 0 } as Record<
      Position,
      number
    >;

    // weights: PG=1, others=60 each => total 241. PG only owns the first ~0.4%
    // of the range, so a mid-range draw lands on an unused position (SG).
    expect(choosePosition(usedCounts, () => 0.1)).toBe("SG");
  });

  it("can still repeat a position when the draw lands on it", () => {
    const usedCounts = { PG: 1, SG: 0, SF: 0, PF: 0, C: 0 } as Record<
      Position,
      number
    >;

    // A draw of exactly 0 lands on the first item (PG), even though it repeats.
    expect(choosePosition(usedCounts, () => 0)).toBe("PG");
  });
});

describe("generateDraftBoard", () => {
  it("produces one grant per lineup slot", () => {
    const board = generateDraftBoard(5, sequenceRng([0.2, 0.5]));
    expect(board).toHaveLength(5);
    for (const grant of board) {
      expect(POSITIONS).toContain(grant.position);
      expect([
        "Atlantic",
        "Central",
        "Southeast",
        "Northwest",
        "Pacific",
        "Southwest",
      ]).toContain(grant.division);
    }
  });

  it("usually yields a balanced (all-distinct) board", () => {
    let balanced = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i += 1) {
      const board = generateDraftBoard();
      const distinct = new Set(board.map((grant) => grant.position));
      if (distinct.size === 5) {
        balanced += 1;
      }
    }
    // Favoring fresh positions targets roughly a 90% balanced rate.
    expect(balanced / trials).toBeGreaterThan(0.8);
  });
});

describe("eligibility", () => {
  const lebron = {
    id: "lebron-james",
    team: "LAL",
    position: "SF" as Position,
    secondaryPositions: ["PG", "PF"] as Position[],
    points: 25,
  };

  it("includes primary and secondary positions", () => {
    expect(eligiblePositions(lebron)).toEqual(["SF", "PG", "PF"]);
  });

  it("matches a slot only within the same division and an eligible position", () => {
    const pacificPg: SlotGrant = { division: "Pacific", position: "PG" };
    const pacificC: SlotGrant = { division: "Pacific", position: "C" };
    const atlanticSf: SlotGrant = { division: "Atlantic", position: "SF" };

    expect(isEligibleForSlot(lebron, pacificPg)).toBe(true); // LAL is Pacific, PG is secondary
    expect(isEligibleForSlot(lebron, pacificC)).toBe(false); // not a center
    expect(isEligibleForSlot(lebron, atlanticSf)).toBe(false); // wrong division
  });
});

describe("autofillFromBoard", () => {
  it("fills each granted slot with a distinct eligible player", () => {
    const pool = [
      { id: "west-pg", team: "GSW", position: "PG" as Position, points: 30 },
      { id: "west-c", team: "DEN", position: "C" as Position, points: 26 },
      { id: "east-sf", team: "BOS", position: "SF" as Position, points: 27 },
    ];
    const board: SlotGrant[] = [
      { division: "Pacific", position: "PG" },
      { division: "Northwest", position: "C" },
      { division: "Atlantic", position: "SF" },
    ];

    expect(autofillFromBoard(board, pool)).toEqual([
      "west-pg",
      "west-c",
      "east-sf",
    ]);
  });
});

describe("roster coverage", () => {
  it("has at least one eligible player for every division and position", () => {
    for (const division of DIVISIONS) {
      for (const position of POSITIONS) {
        const grant: SlotGrant = { division, position };
        const count = players.filter((player) =>
          isEligibleForSlot(player, grant),
        ).length;
        expect(count, `${division} - ${position}`).toBeGreaterThan(0);
      }
    }
  });
});
