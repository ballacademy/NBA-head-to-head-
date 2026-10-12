import { useEffect, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { readJson, writeJson } from "../lib/browserStorage";
import { FilterRange, FilterSelect } from "./PlayerFilterBar";
import {
  AGE_SPAN,
  ALL_PLAYER_FILTER,
  ALL_STAR_FILTERS,
  DRAFT_CLASS_FILTERS,
  EMPTY_PLAYER_FILTERS,
  EXPERIENCE_SPAN,
  HEIGHT_SPAN,
  PLAYER_SCORING_SEASON,
  PLAYER_SCORING_SOURCE,
  PLAYER_SORT_KEY,
  POSITION_FILTERS,
  formatHeightInches,
  formatPpg,
  parsePlayerPickerSort,
  searchPlayers,
  sortPlayers,
  type PlayerPickerSort,
  type PlayerSearchFilters,
  type NumberRange,
  type TierPlayer,
} from "./nbaActivePlayers";

interface PlayerPickerProps {
  heading: string;
  hint?: string;
  currentId?: string | null;
  usedLabels: Record<string, string>;
  clearLabel?: string;
  /** When set, the picker is locked to this club’s roster. */
  lockedTeam?: string;
  /** Board-level filters for the player tier list. Search still runs here. */
  lockedFilters?: PlayerSearchFilters;
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
  lockedTeam,
  lockedFilters,
  onPick,
  onClear,
  onClose,
}: PlayerPickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PlayerPickerSort>(() =>
    parsePlayerPickerSort(readJson(PLAYER_SORT_KEY)),
  );
  const [localFilters, setLocalFilters] = useState<PlayerSearchFilters>({
    ...EMPTY_PLAYER_FILTERS,
    team: lockedTeam ?? ALL_PLAYER_FILTER,
  });
  const boardFilters = lockedFilters ?? localFilters;
  const filled = Boolean(currentId);
  const hideBoardFilters = Boolean(lockedFilters);

  useDialogA11y({
    open: true,
    onClose,
    containerRef: dialogRef,
    lockScroll: true,
  });

  useEffect(() => {
    writeJson(PLAYER_SORT_KEY, sort);
  }, [sort]);

  const players = useMemo(
    () =>
      sortPlayers(
        searchPlayers(query, {
          ...boardFilters,
          team: lockedTeam ?? boardFilters.team,
        }),
        sort,
      ),
    [query, boardFilters, lockedTeam, sort],
  );

  const setLocalRange =
    (key: "ageRange" | "heightRange" | "experienceRange") =>
    (range: NumberRange) => {
      setLocalFilters((current) => ({ ...current, [key]: range }));
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
        <div className="sc-picker__toolbar">
          <label className="sc-picker__search">
            Search
            <input
              type="search"
              value={query}
              placeholder={
                lockedTeam ? "Search this roster…" : "Name or team (LAL, Curry…)"
              }
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="sc-picker__sort" role="group" aria-label="Sort players">
            <span>Sort</span>
            <button
              type="button"
              className={sort === "name" ? "sc-chip is-on" : "sc-chip"}
              aria-pressed={sort === "name"}
              onClick={() => setSort("name")}
            >
              Name
            </button>
            <button
              type="button"
              className={sort === "points" ? "sc-chip is-on" : "sc-chip"}
              aria-pressed={sort === "points"}
              onClick={() => setSort("points")}
            >
              Points
            </button>
            <span
              className="sc-picker__sort-source"
              title={`${PLAYER_SCORING_SOURCE} · ${PLAYER_SCORING_SEASON} regular-season PPG`}
            >
              {PLAYER_SCORING_SEASON} PPG
            </span>
          </div>
        </div>
        {hideBoardFilters ? (
          <p className="sc-picker__filter-hint">
            Showing the board’s filtered roster. Name search still applies.
            Points sort uses Basketball-Reference {PLAYER_SCORING_SEASON}{" "}
            regular-season PPG.
          </p>
        ) : (
          <div className="sc-picker__board-filters">
            <div className="sc-player-filters__ranges">
              <FilterRange
                label="Age"
                span={AGE_SPAN}
                value={localFilters.ageRange}
                onChange={setLocalRange("ageRange")}
              />
              <FilterRange
                label="Height"
                span={HEIGHT_SPAN}
                value={localFilters.heightRange}
                format={formatHeightInches}
                onChange={setLocalRange("heightRange")}
              />
              <FilterRange
                label="Experience"
                span={EXPERIENCE_SPAN}
                value={localFilters.experienceRange}
                format={(years) => `${years}y`}
                onChange={setLocalRange("experienceRange")}
              />
            </div>
            <div
              className={
                lockedTeam
                  ? "sc-picker__dropdowns sc-picker__dropdowns--locked"
                  : "sc-picker__dropdowns"
              }
            >
              <FilterSelect
                label="Position"
                value={localFilters.position ?? ALL_PLAYER_FILTER}
                options={POSITION_FILTERS}
                onChange={(event) =>
                  setLocalFilters((current) => ({
                    ...current,
                    position: event.target.value,
                  }))
                }
              />
              <FilterSelect
                label="Draft class"
                value={localFilters.draftClass ?? ALL_PLAYER_FILTER}
                options={DRAFT_CLASS_FILTERS}
                onChange={(event) =>
                  setLocalFilters((current) => ({
                    ...current,
                    draftClass: event.target.value,
                  }))
                }
              />
              <FilterSelect
                label="All-Star"
                value={localFilters.allStar ?? ALL_PLAYER_FILTER}
                options={ALL_STAR_FILTERS}
                onChange={(event) =>
                  setLocalFilters((current) => ({
                    ...current,
                    allStar: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        )}
        <div className="sc-picker__grid">
          {players.map((player) => (
            <PlayerButton
              key={player.id}
              player={player}
              currentId={currentId}
              usedLabel={usedLabels[player.id]}
              showPpg={sort === "points"}
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

function PlayerButton({
  player,
  currentId,
  usedLabel,
  showPpg,
  onPick,
}: {
  player: TierPlayer;
  currentId: string | null;
  usedLabel?: string;
  showPpg: boolean;
  onPick: (playerId: string) => void;
}) {
  const isCurrent = currentId === player.id;
  const isUsed = Boolean(usedLabel) && !isCurrent;
  const meta = isCurrent
    ? "This slot"
    : isUsed
      ? usedLabel
      : showPpg
        ? `${player.team} · ${formatPpg(player.ppg)}`
        : `${player.team} · ${player.position}`;

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
        <span className="sc-team__meta">{meta}</span>
      </span>
    </button>
  );
}
