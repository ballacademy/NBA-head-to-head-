export const LETTER_GRADES = [
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
] as const;

export type LetterGrade = (typeof LETTER_GRADES)[number];
export type LetterGradeBand = "A" | "B" | "C" | "D" | "F";

export const DEFAULT_LETTER_GRADE: LetterGrade = "A";
export const LETTER_GRADE_REASON_MAX = 28;

export interface LetterGradeFields {
  showLetterGrade?: boolean;
  letterGrade?: LetterGrade;
  letterGradeReason?: string;
}

export interface LetterGradePaint {
  fill: string;
  ink: string;
  stroke: string;
}

/** A green, B lime/teal, C yellow, D orange, F red — stamp, not sticker. */
export const LETTER_GRADE_PAINT: Record<LetterGradeBand, LetterGradePaint> = {
  A: { fill: "#1F8A4C", ink: "#F4FFF6", stroke: "#0E4D2A" },
  B: { fill: "#2A9B8F", ink: "#F3FFFC", stroke: "#0E524B" },
  C: { fill: "#D4A017", ink: "#1A1400", stroke: "#7A5A00" },
  D: { fill: "#D46A12", ink: "#1A0C00", stroke: "#7A3A00" },
  F: { fill: "#C62828", ink: "#FFF5F5", stroke: "#6B1010" },
};

export const letterGradeBand = (grade: LetterGrade): LetterGradeBand => {
  const band = grade.charAt(0);
  if (band === "A" || band === "B" || band === "C" || band === "D" || band === "F") {
    return band;
  }
  return "C";
};

export const letterGradePaint = (grade: LetterGrade) =>
  LETTER_GRADE_PAINT[letterGradeBand(grade)];

export const parseLetterGrade = (value: unknown): LetterGrade =>
  LETTER_GRADES.includes(value as LetterGrade)
    ? (value as LetterGrade)
    : DEFAULT_LETTER_GRADE;

export const cycleLetterGrade = (grade: LetterGrade): LetterGrade => {
  const index = LETTER_GRADES.indexOf(parseLetterGrade(grade));
  return LETTER_GRADES[(index + 1) % LETTER_GRADES.length]!;
};

export const clipLetterGradeReason = (value: string) =>
  value.replace(/[\r\n]+/g, " ").slice(0, LETTER_GRADE_REASON_MAX);

export const letterGradeReasonText = (value: string | undefined) =>
  clipLetterGradeReason(value ?? "").replace(/\s+/g, " ").trim();

export const defaultLetterGradeFields = (): Required<LetterGradeFields> => ({
  showLetterGrade: false,
  letterGrade: DEFAULT_LETTER_GRADE,
  letterGradeReason: "",
});

export const normalizeLetterGradeFields = (
  draft: LetterGradeFields | undefined,
): Required<LetterGradeFields> => ({
  showLetterGrade: draft?.showLetterGrade === true,
  letterGrade: parseLetterGrade(draft?.letterGrade),
  letterGradeReason: letterGradeReasonText(draft?.letterGradeReason),
});
