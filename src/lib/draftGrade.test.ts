import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import { calculateLineupScore } from "./scoring";
import {
  buildDailyDraftShareText,
  buildDraftGradeReport,
  gradeFromOvr,
} from "./draftGrade";

describe("draftGrade", () => {
  it("maps OVR to letter grades including pluses and minuses", () => {
    expect(gradeFromOvr(98)).toBe("A+");
    expect(gradeFromOvr(92)).toBe("A");
    expect(gradeFromOvr(88)).toBe("A-");
    expect(gradeFromOvr(10)).toBe("F-");
  });

  it("builds a roast summary for a lineup", () => {
    const lineup = players
      .filter((player) => ["jokicni01", "curryst01", "duranke01"].includes(player.bbrPlayerId ?? ""))
      .slice(0, 3);

    expect(lineup.length).toBeGreaterThan(0);

    const padded = [
      ...lineup,
      ...players.filter((player) => player.bbrPlayerId === "whitede01"),
      ...players.filter((player) => player.bbrPlayerId === "carusal01"),
    ].slice(0, 5);

    const score = calculateLineupScore(padded);
    const report = buildDraftGradeReport(padded, score);

    expect(report.grade).toMatch(/^[A-F][+-]?$/);
    expect(report.roast.length).toBeGreaterThan(20);
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
