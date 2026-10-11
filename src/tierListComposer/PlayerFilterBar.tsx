import type { ChangeEvent } from "react";
import {
  AGE_FILTERS,
  ALL_PLAYER_FILTER,
  ALL_STAR_FILTERS,
  CONFERENCE_FILTERS,
  COUNTRY_FILTERS,
  DIVISION_FILTERS,
  DRAFT_CLASS_FILTERS,
  DRAFT_STATUS_FILTERS,
  EXPERIENCE_FILTERS,
  HEIGHT_FILTERS,
  POSITION_FILTERS,
  TEAM_FILTERS,
  isEmptyPlayerFilters,
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
        label="Age"
        value={filters.age ?? ALL_PLAYER_FILTER}
        options={AGE_FILTERS}
        onChange={setFilter("age")}
      />
      <FilterSelect
        label="Height"
        value={filters.height ?? ALL_PLAYER_FILTER}
        options={HEIGHT_FILTERS}
        onChange={setFilter("height")}
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
      <FilterSelect
        label="Experience"
        value={filters.experience ?? ALL_PLAYER_FILTER}
        options={EXPERIENCE_FILTERS}
        onChange={setFilter("experience")}
      />
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
