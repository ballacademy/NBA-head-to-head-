import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import {
  canAffordPlayer,
  estimatePlayerSalary,
  getLineupSalaryTotal,
  RANKED_SALARY_CAP,
} from "./salaryCap";

describe("salary cap", () => {
  it("forces cheap filler after expensive stars in ranked mode", () => {
    const expensive = [...players]
      .sort(
        (left, right) => estimatePlayerSalary(right) - estimatePlayerSalary(left),
      )
      .slice(0, 2);
    const spent = getLineupSalaryTotal(expensive);
    const cheap = players
      .filter((player) => !expensive.some((star) => star.id === player.id))
      .sort(
        (left, right) => estimatePlayerSalary(left) - estimatePlayerSalary(right),
      )[0]!;

    expect(spent + estimatePlayerSalary(cheap)).toBeLessThanOrEqual(RANKED_SALARY_CAP);
    expect(
      canAffordPlayer(
        expensive,
        players.sort(
          (left, right) => estimatePlayerSalary(right) - estimatePlayerSalary(left),
        )[0]!,
        3,
      ),
    ).toBe(false);
  });
});
