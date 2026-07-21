import { describe, expect, it } from "vitest";
import {
  canCompleteSalaryCapDraft,
  completeSalaryCapDraftFromPartial,
  filterPlayersForSlot,
} from "./draft";
import { filterSalaryCapPlayersForSlot } from "./salaryCapDraft";
import {
  getMaxAffordableSalary,
  MINIMUM_PLAYER_SALARY,
  RANKED_SALARY_CAP,
} from "./salaryCap";
import { players } from "../data/players";

describe("salaryCapDraft", () => {
  it("limits pick four options to salaries that still allow a legal final pick", () => {
    const slots = [
      { position: "PG" as const, division: "Pacific" as const },
      { position: "SG" as const, division: "Atlantic" as const },
      { position: "SF" as const, division: "Central" as const },
      { position: "PF" as const, division: "Southwest" as const },
      { position: "C" as const, division: "Northwest" as const },
    ];

    const fullPath = completeSalaryCapDraftFromPartial(
      players,
      [],
      slots,
      RANKED_SALARY_CAP,
    );

    expect(fullPath).toHaveLength(5);
    const partialIds = fullPath!.slice(0, 3);

    const fourthSlot = slots[3]!;
    const forwardFeasible = filterSalaryCapPlayersForSlot(
      partialIds,
      players,
      fourthSlot,
      slots,
      3,
      RANKED_SALARY_CAP,
    );
    const poolById = new Map(players.map((player) => [player.id, player]));
    const partialLineupPlayers = partialIds
      .map((playerId) => poolById.get(playerId))
      .filter((player): player is NonNullable<typeof player> => Boolean(player));
    const capOnly = filterPlayersForSlot(
      players,
      fourthSlot,
      new Set(partialIds),
      {
        maxAffordableSalary: getMaxAffordableSalary(
          partialLineupPlayers,
          2,
          RANKED_SALARY_CAP,
        ),
      },
    );

    expect(forwardFeasible.length).toBeGreaterThan(0);
    expect(forwardFeasible.length).toBeLessThanOrEqual(capOnly.length);

    for (const candidate of forwardFeasible) {
      const partialLineup = partialIds
        .map((playerId) => poolById.get(playerId))
        .filter((player): player is NonNullable<typeof player> => Boolean(player));

      expect(
        canCompleteSalaryCapDraft(
          players,
          [...partialLineup, candidate],
          slots.slice(4),
          RANKED_SALARY_CAP,
        ),
      ).toBe(true);
    }
  });

  it("can auto-complete a partial salary-cap draft from the current slot", () => {
    const slots = [
      { position: "PG" as const, division: "Pacific" as const },
      { position: "SG" as const, division: "Atlantic" as const },
      { position: "SF" as const, division: "Central" as const },
      { position: "PF" as const, division: "Southwest" as const },
      { position: "C" as const, division: "Northwest" as const },
    ];

    const fullPath = completeSalaryCapDraftFromPartial(
      players,
      [],
      slots,
      RANKED_SALARY_CAP,
    );

    expect(fullPath).toHaveLength(5);

    const partial = fullPath!.slice(0, 4);
    const completed = completeSalaryCapDraftFromPartial(
      players,
      partial,
      slots.slice(4),
      RANKED_SALARY_CAP,
    );

    expect(completed).toHaveLength(5);
  });

  it("never treats an over-cap final pick as a legal completion", () => {
    const slot = {
      position: "PG" as const,
      division: "Pacific" as const,
    };
    const completed = completeSalaryCapDraftFromPartial(
      players,
      [],
      [slot],
      MINIMUM_PLAYER_SALARY - 1,
    );

    expect(completed).toBeNull();
    expect(canCompleteSalaryCapDraft(players, [], [slot], MINIMUM_PLAYER_SALARY - 1)).toBe(
      false,
    );

    const affordable = filterPlayersForSlot(players, slot, new Set(), {
      maxAffordableSalary: MINIMUM_PLAYER_SALARY - 1,
    });
    expect(affordable).toHaveLength(0);
  });
});
