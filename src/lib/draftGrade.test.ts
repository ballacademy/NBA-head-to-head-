import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import {
  buildDailyDraftShareText,
  gradeFromOvr,
} from "./draftGrade";

describe("draftGrade", () => {
  it("maps OVR to letter grades including pluses and minuses", () => {
    expect(gradeFromOvr(98)).toBe("A+");
    expect(gradeFromOvr(92)).toBe("A");
    expect(gradeFromOvr(88)).toBe("A-");
    expect(gradeFromOvr(10)).toBe("F-");
  });

  it("builds a spoiler-free daily share grid", () => {
    const lineup = players.slice(0, 5);
    const shareText = buildDailyDraftShareText(
      "Splash Zone",
      "42.3% from 3",
      "2026-06-15",
      lineup,
      87,
    );

    expect(shareText).toContain("H2H Daily Draft 2026-06-15");
    expect(shareText).toContain("Splash Zone");
    expect(shareText).toContain("42.3% from 3");
    expect(shareText).toContain("87th percentile");
    expect(shareText).not.toContain(lineup[0]!.name);
  });
});
