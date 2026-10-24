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
  return (
    <label className="sc-field">
      Preset
      <select
        value={presets.includes(value) ? value : ""}
        aria-label="Title preset"
        onChange={(event) => {
          if (event.target.value) {
            onChange(event.target.value);
          }
        }}
      >
        <option value="">Custom</option>
        {presets.map((preset) => (
          <option key={preset} value={preset}>
            {preset}
          </option>
        ))}
      </select>
    </label>
  );
}
