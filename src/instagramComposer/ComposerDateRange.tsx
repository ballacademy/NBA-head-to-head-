import {
  dateRangeChipsForHud,
  matchDateRangePreset,
  rangeForPreset,
  type ComposerDateRange,
  type DateRangeChipSet,
} from "./composerDateRange";
import { useComposerHudMode } from "./composerHudMode";

interface ComposerDateRangeProps {
  from: string;
  to: string;
  onChange: (range: ComposerDateRange) => void;
  onFill?: () => void;
  fillLabel?: string;
  filling?: boolean;
  simpleSet?: DateRangeChipSet;
  /** Keep From/To date inputs in Simple, not only Full HUD. */
  alwaysShowDates?: boolean;
  /** Extra chip: opener through today (or June 30). */
  includeFullSeason?: boolean;
  /** Board-year Full season window. Defaults to the current campaign. */
  seasonRange?: ComposerDateRange;
}

export function ComposerDateRange({
  from,
  to,
  onChange,
  onFill,
  fillLabel = "Fill range",
  filling = false,
  simpleSet,
  alwaysShowDates = false,
  includeFullSeason = false,
  seasonRange,
}: ComposerDateRangeProps) {
  const [hudMode] = useComposerHudMode();
  const simple = hudMode === "simple";
  const preset =
    seasonRange && from === seasonRange.from && to === seasonRange.to
      ? "full-season"
      : matchDateRangePreset(from, to);
  const chips = [
    ...dateRangeChipsForHud(
      simpleSet ?? "night",
      simple && Boolean(simpleSet),
    ),
    ...(includeFullSeason
      ? [{ id: "full-season" as const, label: "Full season" }]
      : []),
  ];
  const showDates = alwaysShowDates || !simple;
  return (
    <div className="sc-look" role="group" aria-label="Date range">
      <span className="sc-look__label">Range</span>
      {chips.map((item) => (
        <button
          key={item.id}
          type="button"
          className={preset === item.id ? "sc-chip is-on" : "sc-chip"}
          aria-pressed={preset === item.id}
          aria-label={item.label}
          onClick={() =>
            onChange(
              item.id === "full-season" && seasonRange
                ? seasonRange
                : rangeForPreset(item.id),
            )
          }
        >
          {item.label}
        </button>
      ))}
      {showDates ? (
        <>
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
        </>
      ) : null}
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
