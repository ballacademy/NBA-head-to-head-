import { describe, expect, it } from "vitest";
import { autoDraftLineup } from "./draft";
import { getDailyDraftSetup } from "./dailyDraft";
import { buildDailyGoalResult } from "./dailyGoalScoring";
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
