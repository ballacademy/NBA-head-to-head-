import {
  LETTER_GRADES,
  LETTER_GRADE_REASON_MAX,
  clipLetterGradeReason,
  type LetterGrade,
} from "../lib/letterGrade";
import { ComposerHudSelect } from "./ComposerHudSelect";
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
            <ComposerHudSelect
              label="Mark"
              ariaLabel="Letter grade pick"
              value={grade}
              options={LETTER_GRADES.map((letter) => ({
                value: letter,
                label: letter,
              }))}
              onChange={onGrade}
            />
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
