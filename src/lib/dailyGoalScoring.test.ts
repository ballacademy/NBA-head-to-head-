import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import { getDailyGoalById } from "./dailyDraftGoals";
import {
  buildDailyGoalResult,
  formatGoalResult,
  scoreLineupForGoal,
} from "./dailyGoalScoring";

describe("dailyGoalScoring", () => {
  it("weights three-point percentage by attempts per game", () => {
    const goal = getDailyGoalById("splash-zone")!;
    const lineup = players
      .filter((player) => player.threePointersAttempted > 0)
      .slice(0, 5);

    const value = scoreLineupForGoal(lineup, goal);
    const attempts = lineup.reduce(
      (sum, player) => sum + player.threePointersAttempted,
      0,
    );
    const expected =
      lineup.reduce(
        (sum, player) => sum + player.threePoint * player.threePointersAttempted,
        0,
      ) / attempts;

    expect(value).toBeCloseTo(expected, 5);
    expect(formatGoalResult(value, goal)).toMatch(/% from 3$/);
  });

  it("builds a formatted daily goal result", () => {
    const goal = getDailyGoalById("glass-gang")!;
    const lineup = players.slice(0, 5);
    const result = buildDailyGoalResult(lineup, goal);

    expect(result.formatted).toMatch(/RPG$/);
    expect(result.value).toBeGreaterThan(0);
  });

  it("scores defensive fortress by average letter grade rank", () => {
    const goal = getDailyGoalById("defensive-fortress")!;
    const lineup = players
      .filter((player) => player.defenseGrade === "A+")
      .slice(0, 5);

    const result = buildDailyGoalResult(lineup, goal);

    expect(result.value).toBeCloseTo(12, 5);
    expect(result.formatted).toMatch(/A\+ avg DEF$/);
  });
});
