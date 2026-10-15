interface BaMarkToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

export function BaMarkToggle({ on, onChange }: BaMarkToggleProps) {
  return (
    <label className="sc-field">
      <span className="sc-toolbar__eyebrow">BA mark</span>
      <button
        type="button"
        className={on ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={on}
        aria-label="BA mark"
        onClick={() => onChange(!on)}
      >
        {on ? "On" : "Off"}
      </button>
    </label>
  );
}
