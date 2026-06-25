import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import {
  canAffordPlayer,
  CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
  estimatePlayerSalary,
  getLineupSalaryTotal,
  RANKED_SALARY_CAP,
} from "./salaryCap";

describe("salary cap", () => {
  it("keeps ranked lineups under a $100M cap", () => {
    expect(RANKED_SALARY_CAP).toBe(100_000_000);
    expect(CLASSIC_HEAD_TO_HEAD_SALARY_CAP).toBe(150_000_000);

    const rankedBySalary = [...players].sort(
      (left, right) => estimatePlayerSalary(right) - estimatePlayerSalary(left),
    );
    const mostExpensive = rankedBySalary[0]!;
    const secondMostExpensive = rankedBySalary[1]!;
    const cheapest = rankedBySalary.at(-1)!;

    expect(
      getLineupSalaryTotal([mostExpensive]) + estimatePlayerSalary(cheapest),
    ).toBeLessThanOrEqual(RANKED_SALARY_CAP);

    expect(
      getLineupSalaryTotal([mostExpensive, secondMostExpensive]),
    ).toBeGreaterThan(RANKED_SALARY_CAP);

    expect(canAffordPlayer([mostExpensive], secondMostExpensive, 3)).toBe(
      false,
    );
  });
});
