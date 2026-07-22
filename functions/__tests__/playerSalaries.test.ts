import { describe, expect, it } from "vitest";
import { computeLineupSalaryTotal } from "../lib/playerSalaries";

describe("functions playerSalaries", () => {
  it("sums known contract salaries for lineup player ids", () => {
    const result = computeLineupSalaryTotal([
      "gilgesh01-okc",
      "jokicni01-den",
      "missing-player-id",
    ]);

    expect(result.missing).toBe(1);
    expect(result.total).toBeGreaterThan(0);
  });
});
