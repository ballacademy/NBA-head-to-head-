import { describe, expect, it } from "vitest";
import { buildTournament } from "./tournament";
import { calculateLineupScore } from "./scoring";
import type { Drafter, Player } from "./types";

const makePlayer = (id: string, points: number): Player => ({
  id,
  name: id,
  team: "BOS",
  position: "PG",
  positions: ["PG"],
  jerseyNumber: 1,
  points,
  rebounds: 4,
  assists: 5,
  steals: 1,
  blocks: 0.5,
  turnovers: 2,
  trueShooting: 0.58,
  threePoint: 0.36,
  threePointersAttempted: 5,
  fieldGoalsAttempted: 12,
  freeThrowsAttempted: 3,
  freeThrowPct: 0.75,
  personalFouls: 2,
  minutes: 30,
  heightInches: 75,
  usage: 24,
  defense: 7.5,
  defenseGrade: "B",
  gamesPlayed: 70,
  styles: ["connector"],
});

const makeDrafter = (id: string, lineup: string[]): Drafter => ({
  id,
  name: id,
  accent: "#fff",
  draftSlots: [],
  lineup,
});

describe("buildTournament", () => {
  it("advances drafter A on a true head-to-head tie", () => {
    const sharedLineup = [
      makePlayer("a", 20),
      makePlayer("b", 18),
      makePlayer("c", 16),
      makePlayer("d", 14),
      makePlayer("e", 12),
    ];
    const pool = sharedLineup;
    const drafterA = makeDrafter(
      "seed-a",
      sharedLineup.map((player) => player.id),
    );
    const drafterB = makeDrafter(
      "seed-b",
      sharedLineup.map((player) => player.id),
    );

    const scoreA = calculateLineupScore(sharedLineup);
    const scoreB = calculateLineupScore(sharedLineup);
    expect(scoreA.preciseTotal).toBe(scoreB.preciseTotal);

    const [finals] = buildTournament([drafterA, drafterB], pool);
    expect(finals?.[0]?.winnerId).toBe("seed-a");
  });
});
