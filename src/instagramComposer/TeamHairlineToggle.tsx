interface TeamHairlineToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

export function TeamHairlineToggle({ on, onChange }: TeamHairlineToggleProps) {
  return (
    <label className="sc-field">
      <span className="sc-toolbar__eyebrow">Team hairline</span>
      <button
        type="button"
        className={on ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={on}
        aria-label="Team-color hairline inside the frame"
        onClick={() => onChange(!on)}
      >
        {on ? "On" : "Off"}
      </button>
    </label>
  );
}
