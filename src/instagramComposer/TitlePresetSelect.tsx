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
    <label className="sc-field sc-field--preset">
      Preset
      <select
        value={selected}
        aria-label="Title preset"
        title={selected || "Custom"}
        onChange={(event) => {
          if (event.target.value) {
            onChange(event.target.value);
          }
        }}
      >
        <option value="">Custom</option>
        {presets.map((preset) => (
          <option key={preset} value={preset} title={preset}>
            {preset}
          </option>
        ))}
      </select>
    </label>
  );
}
