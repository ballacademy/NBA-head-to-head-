import { describe, expect, it } from "vitest";
import { formatPlayerDraftStats, getDefenseGrade } from "./defenseGrade";

describe("getDefenseGrade", () => {
  it("maps defense scores to letter grades", () => {
    expect(getDefenseGrade(9.3)).toBe("A+");
    expect(getDefenseGrade(8.5)).toBe("A-");
    expect(getDefenseGrade(7.2)).toBe("B-");
    expect(getDefenseGrade(5.8)).toBe("C-");
    expect(getDefenseGrade(4.2)).toBe("F");
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
      defense: 8.5,
    });

    expect(formatted.grade).toBe("A-");
    expect(formatted.summary).toContain("27.4 PTS");
    expect(formatted.summary).toContain("8.1 REB");
    expect(formatted.summary).toContain("1.2 BLK");
    expect(formatted.summary).toContain("1.4 STL");
    expect(formatted.summary).toContain("61.2% TS");
    expect(formatted.summary).toContain("A- DEF");
  });
});
