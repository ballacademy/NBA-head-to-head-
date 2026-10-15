import {
  composerStatsSampleLabel,
  type ComposerStatsSample,
} from "./composerStatsSample";

interface ComposerStatsSampleToggleProps {
  sample: ComposerStatsSample;
  onChange: (sample: ComposerStatsSample) => void;
}

const OPTIONS: ComposerStatsSample[] = ["preseason", "regular"];

export function ComposerStatsSampleToggle({
  sample,
  onChange,
}: ComposerStatsSampleToggleProps) {
  return (
    <div className="sc-look" role="group" aria-label="Stats sample">
      <span className="sc-look__label">Sample</span>
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={sample === option ? "sc-chip is-on" : "sc-chip"}
          aria-pressed={sample === option}
          onClick={() => onChange(option)}
        >
          {composerStatsSampleLabel(option)}
        </button>
      ))}
    </div>
  );
}
