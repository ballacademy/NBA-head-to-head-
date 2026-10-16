import { writeLastShowNames } from "./composerBoardDefaults";

interface ComposerNamesToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: string;
  ariaLabel?: string;
}

export function ComposerNamesToggle({
  on,
  onChange,
  label = "Names",
  ariaLabel = "Show names",
}: ComposerNamesToggleProps) {
  return (
    <label className="sc-field">
      <span className="sc-toolbar__eyebrow">{label}</span>
      <button
        type="button"
        className={on ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={on}
        aria-label={ariaLabel}
        onClick={() => {
          const next = !on;
          writeLastShowNames(next);
          onChange(next);
        }}
      >
        {on ? "On" : "Off"}
      </button>
    </label>
  );
}
