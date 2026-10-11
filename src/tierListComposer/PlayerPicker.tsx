import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import {
  AGE_FILTERS,
  ALL_PLAYER_FILTER,
  DIVISION_FILTERS,
  HEIGHT_FILTERS,
  POSITION_FILTERS,
  TEAM_FILTERS,
  searchPlayers,
  type PlayerSearchFilters,
  type TierPlayer,
} from "./nbaActivePlayers";

interface PlayerPickerProps {
  heading: string;
  hint?: string;
  currentId?: string | null;
  usedLabels: Record<string, string>;
  clearLabel?: string;
  onPick: (playerId: string) => void;
  onClear?: () => void;
  onClose: () => void;
}

export function PlayerPicker({
  heading,
  hint = "Search a player, then click to add them to this tier.",
  currentId = null,
  usedLabels,
  clearLabel = "Clear slot",
  onPick,
  onClear,
  onClose,
}: PlayerPickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PlayerSearchFilters>({
    team: ALL_PLAYER_FILTER,
    age: ALL_PLAYER_FILTER,
    height: ALL_PLAYER_FILTER,
    division: ALL_PLAYER_FILTER,
    position: ALL_PLAYER_FILTER,
  });
  const filled = Boolean(currentId);

  useDialogA11y({
    open: true,
    onClose,
    containerRef: dialogRef,
    lockScroll: true,
  });

  const players = useMemo(
    () => searchPlayers(query, filters),
    [query, filters],
  );

  const setFilter =
    (key: keyof PlayerSearchFilters) =>
    (event: ChangeEvent<HTMLSelectElement>) => {
      setFilters((current) => ({ ...current, [key]: event.target.value }));
    };

  return (
    <div
      className="sc-picker-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="sc-picker sc-picker--players"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sc-picker-title"
      >
        <div className="sc-picker__top">
          <div>
            <h2 id="sc-picker-title">{heading}</h2>
            <p>{hint}</p>
          </div>
          <button type="button" className="sc-picker__close" onClick={onClose}>
            Close
          </button>
        </div>
        <label className="sc-picker__search">
          Search
          <input
            type="search"
            value={query}
            placeholder="Name or team (LAL, Curry…)"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="sc-picker__dropdowns">
          <FilterSelect
            label="Team"
            value={filters.team ?? ALL_PLAYER_FILTER}
            options={TEAM_FILTERS}
            onChange={setFilter("team")}
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
        </div>
        <div className="sc-picker__grid">
          {players.map((player) => (
            <PlayerButton
              key={player.id}
              player={player}
              currentId={currentId}
              usedLabel={usedLabels[player.id]}
              onPick={onPick}
            />
          ))}
        </div>
        <div className="sc-picker__footer">
          <p className="sc-picker__count">{players.length} players</p>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => onClear?.()}
            disabled={!filled || !onClear}
          >
            {clearLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
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

function PlayerButton({
  player,
  currentId,
  usedLabel,
  onPick,
}: {
  player: TierPlayer;
  currentId: string | null;
  usedLabel?: string;
  onPick: (playerId: string) => void;
}) {
  const isCurrent = currentId === player.id;
  const isUsed = Boolean(usedLabel) && !isCurrent;

  return (
    <button
      type="button"
      className={[
        "sc-team",
        isUsed ? "is-used" : "",
        isCurrent ? "is-current" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onPick(player.id)}
    >
      <img
        src={player.headshotUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <span>
        <span className="sc-team__name">{player.name}</span>
        <span className="sc-team__meta">
          {isCurrent
            ? "This slot"
            : isUsed
              ? usedLabel
              : `${player.team} · ${player.position}`}
        </span>
      </span>
    </button>
  );
}
