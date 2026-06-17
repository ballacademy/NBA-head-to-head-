import { describe, expect, it } from "vitest";
import { formatPlayerDraftStats, getDefenseGrade } from "./defenseGrade";

describe("getDefenseGrade", () => {
  it("uses the stored grade when provided", () => {
    expect(getDefenseGrade(6, "A")).toBe("A");
  });

  it("maps defense scores to letter grades when no stored grade exists", () => {
    expect(getDefenseGrade(9.64)).toBe("A");
    expect(getDefenseGrade(9.3)).toBe("A-");
    expect(getDefenseGrade(8.56)).toBe("B+");
    expect(getDefenseGrade(8.08)).toBe("B");
    expect(getDefenseGrade(7.48)).toBe("B-");
  });
});

describe("formatPlayerDraftStats", () => {
  it("includes the requested stat line", () => {
    const formatted = formatPlayerDraftStats({
      points: 27.4,
      rebounds: 8.1,
      blocks: 1.2,
      steals: 1.4,
      trueShooting: 0.612,
      threePoint: 0.387,
      turnovers: 2.8,
      defense: 9.1,
      defenseGrade: "A-",
    });

    expect(formatted.grade).toBe("A-");
    expect(formatted.parts).toEqual([
      "27.4 PTS",
      "8.1 REB",
      "1.2 BLK",
      "1.4 STL",
      "38.7% 3P",
      "61.2% TS",
      "2.8 TOV",
      "A- DEF",
    ]);
    expect(formatted.summary).toContain("38.7% 3P");
    expect(formatted.summary).toContain("61.2% TS");
    expect(formatted.summary).toContain("A- DEF");
    expect(formatted.summary).toContain("2.8 TOV");
    expect(formatted.summary.indexOf("% 3P")).toBeLessThan(
      formatted.summary.indexOf("% TS"),
    );
    expect(formatted.summary.indexOf("TOV")).toBeLessThan(
      formatted.summary.indexOf("DEF"),
    );
  });
});
