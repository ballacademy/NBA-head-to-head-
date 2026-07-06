import { describe, expect, it } from "vitest";
import {
  comparePlayersByDefenseGrade,
  formatPlayerDraftStats,
  getDefenseGrade,
  meetsMinimumDefenseGrade,
} from "./defenseGrade";

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

describe("comparePlayersByDefenseGrade", () => {
  it("orders letter grades from A+ to F when descending", () => {
    expect(
      comparePlayersByDefenseGrade(
        { defense: 6, defenseGrade: "A+" },
        { defense: 9.4, defenseGrade: "B" },
        "desc",
      ),
    ).toBeLessThan(0);
  });

  it("orders letter grades from F to A+ when ascending", () => {
    expect(
      comparePlayersByDefenseGrade(
        { defense: 6, defenseGrade: "A+" },
        { defense: 9.4, defenseGrade: "B" },
        "asc",
      ),
    ).toBeGreaterThan(0);
  });

  it("uses stored grades instead of inflated numeric defense scores", () => {
    expect(
      comparePlayersByDefenseGrade(
        { defense: 9.4, defenseGrade: "C+" },
        { defense: 8.2, defenseGrade: "B+" },
        "desc",
      ),
    ).toBeGreaterThan(0);
  });
});

describe("meetsMinimumDefenseGrade", () => {
  it("honors stored grades over inflated numeric defense scores", () => {
    expect(meetsMinimumDefenseGrade(9.4, "C+", "B+")).toBe(false);
    expect(meetsMinimumDefenseGrade(9.4, "B+", "B+")).toBe(true);
    expect(meetsMinimumDefenseGrade(8.56, undefined, "B+")).toBe(true);
  });
});

describe("formatPlayerDraftStats", () => {
  it("includes the requested stat line", () => {
    const formatted = formatPlayerDraftStats({
      points: 27.4,
      rebounds: 8.1,
      assists: 6.3,
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
      "6.3 AST",
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
