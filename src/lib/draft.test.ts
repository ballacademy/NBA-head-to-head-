import { describe, expect, it } from "vitest";
import { getDivisionForTeam, isDraftableTeam } from "./divisions";
import {
  autoDraftLineup,
  filterPlayersForSlot,
  formatSlotConstraint,
  generateDraftSlots,
  isAllBigs,
  isAllCenters,
  isAllGuards,
  isBalancedComposition,
} from "./draft";
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
    ).toBe("Draft a C from the Central division");
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
