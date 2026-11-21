interface PurpleFlairToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

export function PurpleFlairToggle({ on, onChange }: PurpleFlairToggleProps) {
  return (
    <label className="sc-field">
      <span className="sc-toolbar__eyebrow">Purple</span>
      <button
        type="button"
        className={on ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={on}
        aria-label="Ballacademy purple identity"
        onClick={() => onChange(!on)}
      >
        {on ? "On" : "Off"}
      </button>
    </label>
  );
}
