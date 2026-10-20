import {
  LETTER_GRADES,
  LETTER_GRADE_REASON_MAX,
  clipLetterGradeReason,
  type LetterGrade,
} from "../lib/letterGrade";
import "./letterGrade.css";

interface LetterGradeHudProps {
  on: boolean;
  grade: LetterGrade;
  reason: string;
  onToggle: (on: boolean) => void;
  onGrade: (grade: LetterGrade) => void;
  onReason: (reason: string) => void;
}

export function LetterGradeHud({
  on,
  grade,
  reason,
  onToggle,
  onGrade,
  onReason,
}: LetterGradeHudProps) {
  return (
    <label className="sc-field sc-field--wide">
      <span className="sc-toolbar__eyebrow">Letter grade</span>
      <div className="lg-hud">
        <button
          type="button"
          className={on ? "sc-chip is-on" : "sc-chip"}
          aria-pressed={on}
          aria-label="Letter grade"
          onClick={() => onToggle(!on)}
        >
          {on ? "On" : "Off"}
        </button>
        {on ? (
          <>
            <div className="lg-hud__letters" role="group" aria-label="Letter grade pick">
              {LETTER_GRADES.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  className={letter === grade ? "sc-chip is-on" : "sc-chip"}
                  aria-pressed={letter === grade}
                  aria-label={`Letter grade ${letter}`}
                  onClick={() => onGrade(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
            <input
              value={reason}
              maxLength={LETTER_GRADE_REASON_MAX}
              aria-label="Letter grade reason"
              placeholder="4yr / $192M"
              onChange={(event) =>
                onReason(clipLetterGradeReason(event.target.value))
              }
            />
          </>
        ) : null}
      </div>
    </label>
  );
}
