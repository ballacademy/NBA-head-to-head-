interface PhotoGradeToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

export function PhotoGradeToggle({ on, onChange }: PhotoGradeToggleProps) {
  return (
    <label className="sc-field">
      <span className="sc-toolbar__eyebrow">Grade</span>
      <button
        type="button"
        className={on ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={on}
        aria-label="Photo grade"
        onClick={() => onChange(!on)}
      >
        {on ? "On" : "Off"}
      </button>
    </label>
  );
}
