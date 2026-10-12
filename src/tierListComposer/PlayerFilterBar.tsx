import type { ChangeEvent } from "react";
import {
  ALL_PLAYER_FILTER,
  ALL_STAR_FILTERS,
  AGE_SPAN,
  CONFERENCE_FILTERS,
  COUNTRY_FILTERS,
  DIVISION_FILTERS,
  DRAFT_CLASS_FILTERS,
  DRAFT_STATUS_FILTERS,
  EXPERIENCE_SPAN,
  HEIGHT_SPAN,
  POSITION_FILTERS,
  TEAM_FILTERS,
  clampRange,
  formatHeightInches,
  isEmptyPlayerFilters,
  isFullRange,
  type NumberRange,
  type PlayerSearchFilters,
} from "./nbaActivePlayers";

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <label className="sc-picker__dropdown">
      {label}
      <select value={value} onChange={onChange} aria-label={label}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterRange({
  label,
  span,
  value,
  format = String,
  onChange,
}: {
  label: string;
  span: NumberRange;
  value: NumberRange | undefined;
  format?: (value: number) => string;
  onChange: (range: NumberRange) => void;
}) {
  const range = clampRange(value, span);
  const full = isFullRange(range, span);
  const lo = range.min;
  const hi = range.max;
  const loPct = ((lo - span.min) / Math.max(1, span.max - span.min)) * 100;
  const hiPct = ((hi - span.min) / Math.max(1, span.max - span.min)) * 100;

  return (
    <div className="sc-picker__range">
      <div className="sc-picker__range-head">
        <span>{label}</span>
        <span className="sc-picker__range-value">
          {full ? "All" : `${format(lo)}–${format(hi)}`}
        </span>
      </div>
      <div
        className="sc-picker__range-track"
        style={{ ["--lo" as string]: `${loPct}%`, ["--hi" as string]: `${hiPct}%` }}
      >
        <input
          type="range"
          min={span.min}
          max={span.max}
          step={1}
          value={lo}
          aria-label={`${label} minimum`}
          onChange={(event) =>
            onChange({
              min: Math.min(Number(event.target.value), hi),
              max: hi,
            })
          }
        />
        <input
          type="range"
          min={span.min}
          max={span.max}
          step={1}
          value={hi}
          aria-label={`${label} maximum`}
          onChange={(event) =>
            onChange({
              min: lo,
              max: Math.max(Number(event.target.value), lo),
            })
          }
        />
      </div>
    </div>
  );
}

interface PlayerFilterBarProps {
  filters: PlayerSearchFilters;
  matchCount: number;
  onChange: (filters: PlayerSearchFilters) => void;
  onReset: () => void;
}

export function PlayerFilterBar({
  filters,
  matchCount,
  onChange,
  onReset,
}: PlayerFilterBarProps) {
  const setFilter =
    (key: keyof PlayerSearchFilters) =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...filters, [key]: event.target.value });
    };
  const setRange =
    (key: "ageRange" | "heightRange" | "experienceRange") =>
    (range: NumberRange) => {
      onChange({ ...filters, [key]: range });
    };

  return (
    <div className="sc-player-filters" aria-label="Player filters">
      <FilterSelect
        label="Team"
        value={filters.team ?? ALL_PLAYER_FILTER}
        options={TEAM_FILTERS}
        onChange={setFilter("team")}
      />
      <FilterSelect
        label="Conference"
        value={filters.conference ?? ALL_PLAYER_FILTER}
        options={CONFERENCE_FILTERS}
        onChange={setFilter("conference")}
      />
      <FilterSelect
        label="Division"
        value={filters.division ?? ALL_PLAYER_FILTER}
        options={DIVISION_FILTERS}
        onChange={setFilter("division")}
      />
      <FilterSelect
        label="Position"
        value={filters.position ?? ALL_PLAYER_FILTER}
        options={POSITION_FILTERS}
        onChange={setFilter("position")}
      />
      <FilterSelect
        label="Draft class"
        value={filters.draftClass ?? ALL_PLAYER_FILTER}
        options={DRAFT_CLASS_FILTERS}
        onChange={setFilter("draftClass")}
      />
      <FilterSelect
        label="Draft status"
        value={filters.draftStatus ?? ALL_PLAYER_FILTER}
        options={DRAFT_STATUS_FILTERS}
        onChange={setFilter("draftStatus")}
      />
      <FilterSelect
        label="All-Star"
        value={filters.allStar ?? ALL_PLAYER_FILTER}
        options={ALL_STAR_FILTERS}
        onChange={setFilter("allStar")}
      />
      <FilterSelect
        label="Country"
        value={filters.country ?? ALL_PLAYER_FILTER}
        options={COUNTRY_FILTERS}
        onChange={setFilter("country")}
      />
      <div className="sc-player-filters__ranges">
        <FilterRange
          label="Age"
          span={AGE_SPAN}
          value={filters.ageRange}
          onChange={setRange("ageRange")}
        />
        <FilterRange
          label="Height"
          span={HEIGHT_SPAN}
          value={filters.heightRange}
          format={formatHeightInches}
          onChange={setRange("heightRange")}
        />
        <FilterRange
          label="Experience"
          span={EXPERIENCE_SPAN}
          value={filters.experienceRange}
          format={(years) => `${years}y`}
          onChange={setRange("experienceRange")}
        />
      </div>
      <div className="sc-player-filters__aside">
        <p className="sc-player-filters__count">{matchCount} players match</p>
        <button
          type="button"
          className="sc-btn sc-btn--ghost sc-player-filters__reset"
          onClick={onReset}
          disabled={isEmptyPlayerFilters(filters)}
        >
          Reset all filters
        </button>
      </div>
    </div>
  );
}
