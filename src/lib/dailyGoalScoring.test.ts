import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import {
  ADVANCED_DAILY_DRAFT_GOALS,
  DAILY_DRAFT_GOALS,
  getDailyGoalById,
} from "./dailyDraftGoals";
import {
  buildDailyGoalResult,
  formatGoalResult,
  formatPlayerGoalStat,
  formatPlayerHeight,
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

  it("still scores legacy defensive fortress by average letter grade rank", () => {
    const goal = getDailyGoalById("defensive-fortress")!;
    const lineup = players
      .filter((player) => player.defenseGrade === "A+")
      .slice(0, 5);

    const result = buildDailyGoalResult(lineup, goal);

    expect(result.value).toBeCloseTo(12, 5);
    expect(result.formatted).toMatch(/A\+ avg DEF$/);
  });

  it("formats a single player's goal height for legacy goals", () => {
    const goal = getDailyGoalById("sky-high")!;
    const player = players.find((entry) => entry.heightInches > 80)!;

    expect(formatPlayerHeight(player.heightInches)).toMatch(/'\d+"$/);
    expect(formatPlayerGoalStat(player, goal)).toBe(
      formatPlayerHeight(player.heightInches),
    );
  });

  it("formats per-player defensive grades for legacy goals", () => {
    const goal = getDailyGoalById("defensive-fortress")!;
    const player = players.find((entry) => entry.defenseGrade === "A+")!;

    expect(formatPlayerGoalStat(player, goal)).toBe("A+ DEF");
  });

  it("scores advanced per-minute and ratio goals", () => {
    const ppmGoal = getDailyGoalById("adv-ppm-scorers")!;
    const ratioGoal = getDailyGoalById("adv-playmaker-ratio")!;
    const threeShareGoal = getDailyGoalById("adv-three-heavy")!;
    const player = players.find((entry) => entry.minutes > 20)!;

    expect(player).toBeDefined();
    expect(formatPlayerGoalStat(player!, ppmGoal)).toMatch(/PPM$/);
    expect(formatPlayerGoalStat(player!, ratioGoal)).toMatch(/AST\/TOV$/);
    expect(formatPlayerGoalStat(player!, threeShareGoal)).toMatch(/3PA share$/);
    expect(scoreLineupForGoal([player!], ppmGoal)).toBeCloseTo(
      player!.points / player!.minutes,
      5,
    );
  });

  it("scores the refreshed basic and advanced challenge set", () => {
    const player = players.find(
      (entry) =>
        entry.minutes > 20 &&
        entry.freeThrowsAttempted > 0 &&
        entry.personalFouls > 0,
    )!;

    expect(player).toBeDefined();

    const ironMen = getDailyGoalById("iron-men")!;
    const benchMob = getDailyGoalById("bench-mob")!;
    const foulTrouble = getDailyGoalById("foul-trouble")!;
    const freeThrowMerchants = getDailyGoalById("free-throw-merchants")!;
    const midrangeMuseum = getDailyGoalById("midrange-museum")!;
    const plusFactory = getDailyGoalById("plus-factory")!;
    const creationRate = getDailyGoalById("adv-creation-rate")!;
    const whistleRate = getDailyGoalById("adv-whistle-rate")!;
    const highEvent = getDailyGoalById("adv-high-event")!;

    expect(scoreLineupForGoal([player], ironMen)).toBe(player.gamesPlayed);
    expect(scoreLineupForGoal([player], benchMob)).toBe(player.minutes);
    expect(scoreLineupForGoal([player], foulTrouble)).toBe(player.personalFouls);
    expect(scoreLineupForGoal([player], freeThrowMerchants)).toBe(
      player.freeThrowsAttempted,
    );
    expect(scoreLineupForGoal([player], midrangeMuseum)).toBeCloseTo(
      Math.max(0, player.fieldGoalsAttempted - player.threePointersAttempted),
      5,
    );
    expect(scoreLineupForGoal([player], plusFactory)).toBeCloseTo(
      player.points +
        player.rebounds +
        player.assists +
        player.steals +
        player.blocks -
        player.turnovers -
        player.personalFouls,
      5,
    );
    expect(scoreLineupForGoal([player], creationRate)).toBeCloseTo(
      (player.points + player.assists) / player.minutes,
      5,
    );
    expect(scoreLineupForGoal([player], whistleRate)).toBeCloseTo(
      player.freeThrowsAttempted / player.minutes,
      5,
    );
    expect(scoreLineupForGoal([player], highEvent)).toBeCloseTo(
      (player.steals + player.blocks + player.turnovers) / player.minutes,
      5,
    );

    expect(formatPlayerGoalStat(player, plusFactory)).toMatch(/box\+$/);
    expect(formatGoalResult(1.23, creationRate)).toMatch(/points \+ assists/);
  });

  it("keeps removed goals out of the active rotation catalogs", () => {
    expect(DAILY_DRAFT_GOALS.some((goal) => goal.id === "defensive-fortress")).toBe(
      false,
    );
    expect(DAILY_DRAFT_GOALS.some((goal) => goal.id === "anti-offense")).toBe(false);
    expect(ADVANCED_DAILY_DRAFT_GOALS.some((goal) => goal.id === "adv-low-ppm")).toBe(
      false,
    );
    expect(getDailyGoalById("defensive-fortress")?.mode).toBe("basic");
    expect(getDailyGoalById("adv-efficient-minute")?.mode).toBe("advanced");
    expect(DAILY_DRAFT_GOALS).toHaveLength(23);
    expect(ADVANCED_DAILY_DRAFT_GOALS).toHaveLength(17);
  });
});
