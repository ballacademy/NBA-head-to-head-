import {
  matchDateRangePreset,
  rangeForPreset,
  type ComposerDateRange,
  type DateRangePreset,
} from "./composerDateRange";

interface ComposerDateRangeProps {
  from: string;
  to: string;
  onChange: (range: ComposerDateRange) => void;
  onFill?: () => void;
  fillLabel?: string;
  filling?: boolean;
}

const PRESETS: Array<{
  id: Exclude<DateRangePreset, "custom">;
  label: string;
}> = [
  { id: "tonight", label: "Tonight" },
  { id: "last-night", label: "Last night" },
  { id: "this-week", label: "This week" },
  { id: "last-week", label: "Last week" },
  { id: "last-5", label: "Last 5 days" },
];

export function ComposerDateRange({
  from,
  to,
  onChange,
  onFill,
  fillLabel = "Fill range",
  filling = false,
}: ComposerDateRangeProps) {
  const preset = matchDateRangePreset(from, to);
  return (
    <div className="sc-look" role="group" aria-label="Date range">
      <span className="sc-look__label">Range</span>
      {PRESETS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={preset === item.id ? "sc-chip is-on" : "sc-chip"}
          aria-pressed={preset === item.id}
          aria-label={item.label}
          onClick={() => onChange(rangeForPreset(item.id))}
        >
          {item.label}
        </button>
      ))}
      <label className="sc-field">
        From
        <input
          type="date"
          value={from}
          aria-label="Range start"
          onChange={(event) => onChange({ from: event.target.value, to })}
        />
      </label>
      <label className="sc-field">
        To
        <input
          type="date"
          value={to}
          aria-label="Range end"
          onChange={(event) => onChange({ from, to: event.target.value })}
        />
      </label>
      {onFill ? (
        <button
          type="button"
          className="sc-chip"
          onClick={onFill}
          disabled={filling}
        >
          {filling ? "Loading…" : fillLabel}
        </button>
      ) : null}
    </div>
  );
}
