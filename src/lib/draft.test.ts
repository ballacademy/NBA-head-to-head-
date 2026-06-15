import { describe, expect, it } from "vitest";
import { getDivisionForTeam, isDraftableTeam } from "./divisions";
import {
  autoDraftLineup,
  filterPlayersForSlot,
  formatSlotConstraint,
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
    expect(matches.every((player) => player.position === "PG")).toBe(true);
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

  it("formats slot prompts for the UI", () => {
    expect(
      formatSlotConstraint({ position: "C", division: "Central" }),
    ).toBe("C from the Central");
  });
});
