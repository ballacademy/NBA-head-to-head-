import type { ComposerLook } from "./composerLook";

interface ComposerLookToggleProps {
  look: ComposerLook;
  onChange: (look: ComposerLook) => void;
}

export function ComposerLookToggle({ look, onChange }: ComposerLookToggleProps) {
  return (
    <div className="sc-look" role="group" aria-label="Graphic style">
      <span className="sc-look__label">Style</span>
      <button
        type="button"
        className={look === "classic" ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={look === "classic"}
        onClick={() => onChange("classic")}
      >
        Classic
      </button>
      <button
        type="button"
        className={look === "improve" ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={look === "improve"}
        onClick={() => onChange("improve")}
      >
        Improve graphic
      </button>
    </div>
  );
}
