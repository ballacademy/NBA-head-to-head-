import { describe, expect, it } from "vitest";
import { autoDraftLineup } from "./draft";
import { getDailyDraftSetup } from "./dailyDraft";
import { buildDailyGoalResult } from "./dailyGoalScoring";
import { getDivisionForTeam } from "./divisions";
import { playerMatchesPosition } from "./positions";
import { players } from "./playerPool";
import {
  clearDailyDraftSolverCacheForTests,
  solveBestDailyDraftLineup,
} from "./dailyDraftSolver";
import { getPlayersById } from "./scoring";

describe("solveBestDailyDraftLineup", () => {
  it("returns a full feasible lineup for a daily board", () => {
    const setup = getDailyDraftSetup("2026-06-14");
    const lineup = solveBestDailyDraftLineup(
      players,
      setup.slots,
      setup.goal,
      setup.dateKey,
    );

    expect(lineup).toHaveLength(5);
    expect(new Set(lineup.map((player) => player.id)).size).toBe(5);
  });

  it("fills each daily slot with the exact position and division constraint", () => {
    const setup = getDailyDraftSetup("2026-06-15");
    const lineup = solveBestDailyDraftLineup(
      players,
      setup.slots,
      setup.goal,
      setup.dateKey,
    );

    expect(lineup).toHaveLength(setup.slots.length);

    for (let index = 0; index < setup.slots.length; index += 1) {
      const slot = setup.slots[index]!;
      const player = lineup[index]!;

      expect(playerMatchesPosition(player, slot.position)).toBe(true);
      expect(getDivisionForTeam(player.team)).toBe(slot.division);
    }
  });

  it("beats the greedy auto-draft score for the same goal", () => {
    clearDailyDraftSolverCacheForTests();
    const setup = getDailyDraftSetup("2026-06-15");
    const greedy = getPlayersById(autoDraftLineup(players, setup.slots), players);
    const optimal = solveBestDailyDraftLineup(
      players,
      setup.slots,
      setup.goal,
    );
    const greedyScore = buildDailyGoalResult(greedy, setup.goal).value;
    const optimalScore = buildDailyGoalResult(optimal, setup.goal).value;

    if (setup.goal.direction === "higher") {
      expect(optimalScore).toBeGreaterThanOrEqual(greedyScore);
    } else {
      expect(optimalScore).toBeLessThanOrEqual(greedyScore);
    }
  });

  it("reuses cached results for the same date key", () => {
    clearDailyDraftSolverCacheForTests();
    const setup = getDailyDraftSetup("2026-06-16");
    const first = solveBestDailyDraftLineup(
      players,
      setup.slots,
      setup.goal,
      setup.dateKey,
    );
    const second = solveBestDailyDraftLineup(
      players,
      setup.slots,
      setup.goal,
      setup.dateKey,
    );

    expect(second.map((player) => player.id)).toEqual(
      first.map((player) => player.id),
    );
  });
});
