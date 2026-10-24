import type { CSSProperties } from "react";
import {
  LETTER_GRADE_REASON_MAX,
  clipLetterGradeReason,
  cycleLetterGrade,
  letterGradeBand,
  letterGradePaint,
  letterGradeReasonText,
  type LetterGrade,
} from "../lib/letterGrade";
import "./letterGrade.css";

interface LetterGradePlateProps {
  grade: LetterGrade;
  reason: string;
  exporting?: boolean;
  className?: string;
  style?: CSSProperties;
  onGrade: (grade: LetterGrade) => void;
  onReason?: (reason: string) => void;
}

export function LetterGradePlate({
  grade,
  reason,
  exporting = false,
  className,
  style,
  onGrade,
  onReason,
}: LetterGradePlateProps) {
  const paint = letterGradePaint(grade);
  const text = letterGradeReasonText(reason);
  const showReason = Boolean(text) || (!exporting && Boolean(onReason));
  return (
    <div
      className={["lg-plate", `lg-plate--${letterGradeBand(grade)}`, className]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--lg-fill" as string]: paint.fill,
          ["--lg-ink" as string]: paint.ink,
          ["--lg-stroke" as string]: paint.stroke,
          ...style,
        } as CSSProperties
      }
      data-letter-grade={grade}
    >
      <button
        type="button"
        className="lg-plate__mark"
        aria-label="Letter grade"
        onClick={() => onGrade(cycleLetterGrade(grade))}
      >
        {grade}
      </button>
      {showReason ? (
        <input
          className={["lg-plate__reason", text ? "" : "is-empty"]
            .filter(Boolean)
            .join(" ")}
          value={reason}
          maxLength={LETTER_GRADE_REASON_MAX}
          spellCheck={false}
          aria-label="Letter grade reason"
          placeholder={exporting ? "" : "REASON"}
          onChange={(event) =>
            onReason?.(clipLetterGradeReason(event.target.value))
          }
        />
      ) : null}
    </div>
  );
}
