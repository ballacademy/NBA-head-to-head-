import { describe, expect, it } from "vitest";
import { autoDraftLineup } from "./draft";
import { getDailyDraftSetup } from "./dailyDraft";
import { buildDailyGoalResult } from "./dailyGoalScoring";
import { DAILY_DRAFT_GOALS } from "./dailyDraftGoals";
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

  it(
    "does not reuse cached results when the goal changes for the same date key",
    () => {
    clearDailyDraftSolverCacheForTests();
    const setup = getDailyDraftSetup("2026-06-17");
    const alternateGoal = DAILY_DRAFT_GOALS.find((goal) => goal.id !== setup.goal.id)!;
    const primary = solveBestDailyDraftLineup(
      players,
      setup.slots,
      setup.goal,
      setup.dateKey,
    );
    const alternate = solveBestDailyDraftLineup(
      players,
      setup.slots,
      alternateGoal,
      setup.dateKey,
    );
    const primaryScore = buildDailyGoalResult(primary, setup.goal).value;
    const alternateScore = buildDailyGoalResult(alternate, alternateGoal).value;
    const primaryAsAlternate = buildDailyGoalResult(primary, alternateGoal).value;

    expect(buildDailyGoalResult(alternate, alternateGoal).formatted).not.toBe(
      buildDailyGoalResult(primary, setup.goal).formatted,
    );

    if (alternateGoal.direction === "higher") {
      expect(alternateScore).toBeGreaterThanOrEqual(primaryAsAlternate);
    } else {
      expect(alternateScore).toBeLessThanOrEqual(primaryAsAlternate);
    }
  },
    15_000,
  );

  it("does not reuse cached results when the player pool changes", () => {
    clearDailyDraftSolverCacheForTests();
    const setup = getDailyDraftSetup("2026-06-18");
    const fullResult = solveBestDailyDraftLineup(
      players,
      setup.slots,
      setup.goal,
      setup.dateKey,
    );
    const excludedId = fullResult[0]?.id;
    const reducedPool = players.filter((player) => player.id !== excludedId);
    const reducedResult = solveBestDailyDraftLineup(
      reducedPool,
      setup.slots,
      setup.goal,
      setup.dateKey,
    );

    expect(reducedResult.map((player) => player.id)).not.toEqual(
      fullResult.map((player) => player.id),
    );
    expect(reducedResult.some((player) => player.id === excludedId)).toBe(false);
  });
});
