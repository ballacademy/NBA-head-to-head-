import { describe, expect, it } from "vitest";
import { getDivisionForTeam, isDraftableTeam } from "./divisions";
import {
  autoDraftLineup,
  filterPlayersForSlot,
  formatSlotConstraint,
  generateDraftSlots,
  generateFeasibleDraftSlots,
  isAllBigs,
  isAllCenters,
  isAllGuards,
  isBalancedComposition,
  sortDraftCandidates,
  validateDraftSlotsFeasible,
} from "./draft";
import type { Player } from "./types";
import { players } from "../data/players";

describe("divisions", () => {
  it("maps basketball-reference team codes to divisions", () => {
    expect(getDivisionForTeam("BOS")).toBe("Atlantic");
    expect(getDivisionForTeam("BRK")).toBe("Atlantic");
    expect(getDivisionForTeam("CHI")).toBe("Central");
    expect(getDivisionForTeam("CHO")).toBe("Southeast");
    expect(getDivisionForTeam("OKC")).toBe("Northwest");
    expect(getDivisionForTeam("PHO")).toBe("Pacific");
    expect(getDivisionForTeam("DAL")).toBe("Southwest");
  });

  it("excludes multi-team rows from drafting", () => {
    expect(isDraftableTeam("2TM")).toBe(false);
    expect(isDraftableTeam("LAL")).toBe(true);
  });
});

describe("draft constraints", () => {
  it("filters players by position and division", () => {
    const slot = { position: "PG" as const, division: "Pacific" as const };
    const matches = filterPlayersForSlot(players, slot, new Set());

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((player) => player.positions.includes("PG"))).toBe(true);
    expect(matches.every((player) => getDivisionForTeam(player.team) === "Pacific")).toBe(
      true,
    );
  });

  it("auto-drafts one player per slot when possible", () => {
    const slots = [
      { position: "PG" as const, division: "Pacific" as const },
      { position: "SG" as const, division: "Atlantic" as const },
      { position: "SF" as const, division: "Central" as const },
      { position: "PF" as const, division: "Southwest" as const },
      { position: "C" as const, division: "Northwest" as const },
    ];

    const lineup = autoDraftLineup(players, slots);
    expect(lineup.length).toBe(5);
    expect(new Set(lineup).size).toBe(5);
  });

  it("generates feasible slots for the full player pool", () => {
    const slots = generateFeasibleDraftSlots(players);

    expect(slots.length).toBe(5);
    expect(validateDraftSlotsFeasible(players, slots)).toBe(true);
  });

  it("always leaves at least one eligible player for every generated slot", () => {
    for (let index = 0; index < 100; index += 1) {
      const slots = generateFeasibleDraftSlots(players);
      const pickedIds = new Set<string>();

      for (const slot of slots) {
        const candidates = filterPlayersForSlot(players, slot, pickedIds);
        expect(candidates.length).toBeGreaterThan(0);

        const pick = candidates[0]!;
        pickedIds.add(pick.id);
      }
    }
  });

  it("excludes already drafted players from later slots", () => {
    const slot = { position: "SF" as const, division: "Pacific" as const };
    const firstPick = filterPlayersForSlot(players, slot, new Set())[0];

    expect(firstPick).toBeDefined();

    const remaining = filterPlayersForSlot(
      players,
      slot,
      new Set([firstPick!.id]),
    );

    expect(remaining.some((player) => player.id === firstPick!.id)).toBe(false);
  });

  it("formats slot prompts for the UI", () => {
    expect(
      formatSlotConstraint({ position: "C", division: "Central" }),
    ).toBe("Draft a C from the Central Division");
  });

  it("sorts limited-sample players below full-sample options", () => {
    const makeCandidate = (
      name: string,
      points: number,
      gamesPlayed: number,
    ): Player => ({
      id: name,
      name,
      team: "LAL",
      position: "SG",
      positions: ["SG"],
      jerseyNumber: 1,
      points,
      rebounds: 5,
      assists: 3,
      steals: 1,
      blocks: 0.5,
      turnovers: 2,
      trueShooting: 0.58,
      threePoint: 0.36,
      threePointersAttempted: 5,
      fieldGoalsAttempted: 12,
      minutes: 30,
      heightInches: 76,
      usage: 24,
      defense: 7,
      gamesPlayed,
      styles: ["connector"],
    });

    const sorted = sortDraftCandidates([
      makeCandidate("Low Sample Star", 30, 6),
      makeCandidate("Reliable Starter", 18, 40),
      makeCandidate("High Sample Star", 24, 55),
      makeCandidate("Tiny Sample", 28, 3),
    ]);

    expect(sorted.map((player) => player.name)).toEqual([
      "High Sample Star",
      "Reliable Starter",
      "Low Sample Star",
      "Tiny Sample",
    ]);
  });

  it("favors two guards, two forwards, and one center", () => {
    const simulations = 5000;
    let balancedCount = 0;
    let allGuardsCount = 0;
    let allCentersCount = 0;
    let allBigsCount = 0;

    for (let index = 0; index < simulations; index += 1) {
      const positions = generateDraftSlots().map((slot) => slot.position);

      if (isBalancedComposition(positions)) {
        balancedCount += 1;
      }

      if (isAllGuards(positions)) {
        allGuardsCount += 1;
      }

      if (isAllCenters(positions)) {
        allCentersCount += 1;
      }

      if (isAllBigs(positions)) {
        allBigsCount += 1;
      }
    }

    expect(balancedCount / simulations).toBeGreaterThan(0.75);
    expect(allGuardsCount / simulations).toBeLessThan(0.05);
    expect(allCentersCount / simulations).toBeLessThan(0.05);
    expect(allBigsCount / simulations).toBeLessThan(0.05);
  });
});
