import {
  COMPOSER_WATERMARK_MODES,
  parseComposerWatermark,
  type ComposerWatermark,
} from "./composerWatermark";

interface WatermarkToggleProps {
  value: ComposerWatermark | undefined;
  onChange: (value: ComposerWatermark) => void;
}

export function WatermarkToggle({ value, onChange }: WatermarkToggleProps) {
  const mode = parseComposerWatermark(value);
  return (
    <label className="sc-field">
      Watermark
      <select
        value={mode}
        aria-label="Team watermark"
        onChange={(event) =>
          onChange(parseComposerWatermark(event.target.value))
        }
      >
        {COMPOSER_WATERMARK_MODES.map((option) => (
          <option key={option} value={option}>
            {option === "off" ? "Off" : option === "medium" ? "Medium" : "Faint"}
          </option>
        ))}
      </select>
    </label>
  );
}
