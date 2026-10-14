import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { usedChipLabel } from "../instagramComposer/pickerUsed";
import { withCoaches } from "../instagramComposer/nbaCoaches";
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
  NBA_ACTIVE_PLAYERS,
  PLAYER_SCORING_SEASON,
  PLAYER_SCORING_SOURCE,
  PLAYER_SORT_KEY,
  POSITION_FILTERS,
  depthChartLabel,
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
  /** Season roster instead of the current NBA catalog. */
  rosterPlayers?: TierPlayer[];
  /** Include 2026-27 head coaches as picker rows. */
  includeCoaches?: boolean;
  /** Hide age/draft filters; keep search, position, and sort. */
  simple?: boolean;
  sortStorageKey?: string;
  defaultSort?: PlayerPickerSort;
  showDepthSort?: boolean;
  scoringLabel?: string;
  toolbarExtra?: ReactNode;
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
  rosterPlayers,
  includeCoaches = false,
  simple = false,
  sortStorageKey = PLAYER_SORT_KEY,
  defaultSort,
  showDepthSort = false,
  scoringLabel,
  toolbarExtra,
  onPick,
  onClear,
  onClose,
}: PlayerPickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PlayerPickerSort>(() => {
    const storedRaw = readJson(sortStorageKey);
    if (storedRaw == null) {
      return defaultSort ?? "name";
    }
    const stored = parsePlayerPickerSort(storedRaw);
    if (!showDepthSort && stored === "depth") {
      return defaultSort ?? "name";
    }
    return stored;
  });
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
    writeJson(sortStorageKey, sort);
  }, [sort, sortStorageKey]);

  const players = useMemo(() => {
    const catalog = includeCoaches
      ? withCoaches(rosterPlayers ?? NBA_ACTIVE_PLAYERS)
      : rosterPlayers;
    return sortPlayers(
      searchPlayers(
        query,
        {
          ...boardFilters,
          team: lockedTeam ?? boardFilters.team,
        },
        catalog,
      ),
      sort,
    );
  }, [query, boardFilters, lockedTeam, sort, rosterPlayers, includeCoaches]);

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
            {showDepthSort ? (
              <button
                type="button"
                className={sort === "depth" ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={sort === "depth"}
                onClick={() => setSort("depth")}
              >
                Depth chart
              </button>
            ) : null}
            <span
              className="sc-picker__sort-source"
              title={
                scoringLabel ??
                `${PLAYER_SCORING_SOURCE} · ${PLAYER_SCORING_SEASON} regular-season PPG`
              }
            >
              {scoringLabel ?? `${PLAYER_SCORING_SEASON} PPG`}
            </span>
          </div>
          {toolbarExtra}
        </div>
        {hideBoardFilters ? (
          <p className="sc-picker__filter-hint">
            {simple
              ? "Same position on every team. Depth chart is starter, then backups, for that season."
              : `Showing the board’s filtered roster. Name search still applies.
            Points sort uses Basketball-Reference ${PLAYER_SCORING_SEASON}
            regular-season PPG.`}
          </p>
        ) : simple ? (
          <div className="sc-picker__board-filters">
            <p className="sc-picker__filter-hint">
              Depth chart is starter PG–C, then backup PG–C, from that season’s
              roster slots.
            </p>
            <div className="sc-picker__dropdowns sc-picker__dropdowns--locked">
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
            </div>
          </div>
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
              showDepth={sort === "depth"}
              ppgEmptyLabel={simple ? "No stats" : undefined}
              onPick={onPick}
            />
          ))}
        </div>
        <div className="sc-picker__footer">
          <p className="sc-picker__count">
            {players.length} {includeCoaches ? "people" : "players"}
          </p>
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
  showDepth,
  ppgEmptyLabel,
  onPick,
}: {
  player: TierPlayer;
  currentId: string | null;
  usedLabel?: string;
  showPpg: boolean;
  showDepth: boolean;
  ppgEmptyLabel?: string;
  onPick: (playerId: string) => void;
}) {
  const isCurrent = currentId === player.id;
  const isUsed = Boolean(usedLabel) && !isCurrent;
  const identity = showPpg
    ? `${player.team} · ${formatPpg(player.ppg, ppgEmptyLabel)}`
    : showDepth
      ? `${player.team} · ${depthChartLabel(player)}`
      : player.role === "coach"
        ? `${player.team} · HC`
        : `${player.team} · ${player.position}`;
  const meta = isCurrent ? "This slot" : identity;

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
      aria-label={
        isUsed
          ? `${player.name}, already on the board, ${usedLabel}`
          : player.name
      }
      onClick={() => onPick(player.id)}
    >
      <span className="sc-team__shot">
        <img
          src={player.headshotUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {isUsed ? (
          <span className="sc-team__taken-mark" aria-hidden="true">
            ✓
          </span>
        ) : null}
      </span>
      <span>
        <span className="sc-team__name">{player.name}</span>
        <span className="sc-team__meta">{meta}</span>
        {isUsed && usedLabel ? (
          <span className="sc-team__used">{usedChipLabel(usedLabel)}</span>
        ) : null}
      </span>
    </button>
  );
}
