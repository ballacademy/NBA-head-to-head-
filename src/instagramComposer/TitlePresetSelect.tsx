import { ComposerHudSelect } from "./ComposerHudSelect";

interface TitlePresetSelectProps {
  value: string;
  presets: readonly string[];
  onChange: (value: string) => void;
}

export function TitlePresetSelect({
  value,
  presets,
  onChange,
}: TitlePresetSelectProps) {
  const selected = presets.includes(value) ? value : "";
  return (
    <div className="sc-field sc-field--preset">
      <ComposerHudSelect
        label="Preset"
        ariaLabel="Title preset"
        value={selected}
        options={[
          { value: "", label: "Custom" },
          ...presets.map((preset) => ({ value: preset, label: preset })),
        ]}
        onChange={(next) => {
          if (next) {
            onChange(next);
          }
        }}
      />
    </div>
  );
}
