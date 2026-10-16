interface PhotoGradeToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
  intensity?: number;
  onIntensityChange?: (value: number) => void;
}

export function PhotoGradeToggle({
  on,
  onChange,
  intensity,
  onIntensityChange,
}: PhotoGradeToggleProps) {
  const value = on ? Math.max(intensity ?? 100, 1) : 0;
  return (
    <label className="sc-field">
      <span className="sc-toolbar__eyebrow">Grade {value}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-label="Photo grade intensity"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (onIntensityChange) {
            onIntensityChange(next);
            return;
          }
          onChange(next > 0);
        }}
      />
    </label>
  );
}
