import { describe, expect, it } from "vitest";
import {
  LETTER_GRADES,
  cycleLetterGrade,
  defaultLetterGradeFields,
  letterGradeBand,
  letterGradePaint,
  letterGradeReasonText,
  normalizeLetterGradeFields,
  parseLetterGrade,
} from "./letterGrade";

describe("letter grade", () => {
  it("lists A+ through F with plus/minus only on A–C", () => {
    expect(LETTER_GRADES).toEqual([
      "A+",
      "A",
      "A-",
      "B+",
      "B",
      "B-",
      "C+",
      "C",
      "C-",
      "D",
      "F",
    ]);
    expect(LETTER_GRADES).not.toContain("D+");
    expect(LETTER_GRADES).not.toContain("D-");
    expect(LETTER_GRADES).not.toContain("F-");
    expect(LETTER_GRADES).not.toContain("F+");
  });

  it("colors plates by band and cycles the full set", () => {
    expect(letterGradeBand("A+")).toBe("A");
    expect(letterGradeBand("B-")).toBe("B");
    expect(letterGradeBand("C")).toBe("C");
    expect(letterGradeBand("D")).toBe("D");
    expect(letterGradeBand("F")).toBe("F");
    expect(letterGradePaint("A").fill).toMatch(/^#1F8A4C$/i);
    expect(letterGradePaint("B").fill).toMatch(/^#2A9B8F$/i);
    expect(letterGradePaint("C").fill).toMatch(/^#D4A017$/i);
    expect(letterGradePaint("D").fill).toMatch(/^#D46A12$/i);
    expect(letterGradePaint("F").fill).toMatch(/^#C62828$/i);
    expect(cycleLetterGrade("A+")).toBe("A");
    expect(cycleLetterGrade("A-")).toBe("B+");
    expect(cycleLetterGrade("C-")).toBe("D");
    expect(cycleLetterGrade("D")).toBe("F");
    expect(cycleLetterGrade("F")).toBe("A+");
    expect(parseLetterGrade("B+")).toBe("B+");
    expect(parseLetterGrade("nope")).toBe("A");
  });

  it("stays off by default and hides a blank reason", () => {
    const fresh = defaultLetterGradeFields();
    expect(fresh.showLetterGrade).toBe(false);
    expect(fresh.letterGrade).toBe("A");
    expect(fresh.letterGradeReason).toBe("");
    expect(letterGradeReasonText("  4yr / $192M  ")).toBe("4yr / $192M");
    expect(letterGradeReasonText("")).toBe("");
    expect(normalizeLetterGradeFields({}).showLetterGrade).toBe(false);
    expect(
      normalizeLetterGradeFields({
        showLetterGrade: true,
        letterGrade: "A-",
        letterGradeReason: "OVERPAY",
      }),
    ).toEqual({
      showLetterGrade: true,
      letterGrade: "A-",
      letterGradeReason: "OVERPAY",
    });
  });
});
