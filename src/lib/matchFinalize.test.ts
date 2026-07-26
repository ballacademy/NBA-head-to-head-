import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import { generateFeasibleDraftSlotsUnderSalaryCap } from "./draft";
import { finalizeOpponentLineup } from "./match";
import { getPlayersById } from "./scoring";
import { getLineupSalaryTotal, RANKED_SALARY_CAP } from "./salaryCap";
import type { Drafter } from "./types";

describe("finalizeOpponentLineup", () => {
  it("respects the opponent salary cap when auto-drafting", () => {
    const draftSlots = generateFeasibleDraftSlotsUnderSalaryCap(
      players,
      RANKED_SALARY_CAP,
    );
    const opponent: Drafter = {
      id: "npc-cap",
      name: "Cap NPC",
      accent: "#fff",
      draftSlots,
      lineup: [],
      salaryCapLimit: RANKED_SALARY_CAP,
    };

    const finalized = finalizeOpponentLineup(players, opponent);
    expect(finalized.lineup).toHaveLength(5);
    expect(
      getLineupSalaryTotal(getPlayersById(finalized.lineup, players)),
    ).toBeLessThanOrEqual(RANKED_SALARY_CAP);
  });
});
