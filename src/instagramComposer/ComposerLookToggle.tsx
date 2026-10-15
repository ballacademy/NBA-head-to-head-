import type { ComposerLook } from "./composerLook";

interface ComposerLookToggleProps {
  look: ComposerLook;
  onChange: (look: ComposerLook) => void;
}

const OPTIONS: Array<{ value: ComposerLook; label: string }> = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
  { value: "none", label: "None" },
];

export function ComposerLookToggle({ look, onChange }: ComposerLookToggleProps) {
  return (
    <div className="sc-look" role="group" aria-label="Frame color">
      <span className="sc-look__label">Frames</span>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={look === option.value ? "sc-chip is-on" : "sc-chip"}
          aria-pressed={look === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
