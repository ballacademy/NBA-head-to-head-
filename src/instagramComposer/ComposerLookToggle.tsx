import type { ComposerLook } from "./composerLook";

interface ComposerLookToggleProps {
  look: ComposerLook;
  onChange: (look: ComposerLook) => void;
}

export function ComposerLookToggle({ look, onChange }: ComposerLookToggleProps) {
  return (
    <div className="sc-look" role="group" aria-label="Frame color">
      <span className="sc-look__label">Frames</span>
      <button
        type="button"
        className={look === "white" ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={look === "white"}
        onClick={() => onChange("white")}
      >
        White frames
      </button>
      <button
        type="button"
        className={look === "black" ? "sc-chip is-on" : "sc-chip"}
        aria-pressed={look === "black"}
        onClick={() => onChange("black")}
      >
        Black frames
      </button>
    </div>
  );
}
