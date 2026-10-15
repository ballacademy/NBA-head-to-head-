import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { closeComposerScrim } from "../instagramComposer/closeComposerScrim";
import { usedChipLabel } from "../instagramComposer/pickerUsed";
import { withCoaches } from "../instagramComposer/nbaCoaches";
import { readJson, writeJson } from "../lib/browserStorage";
import {
  isEveryTeamRostersReady,
  loadEveryTeamRosters,
  withRosterDepth,
} from "../everyTeamComposer/historicalRosters";
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
  ROLE_FILTERS,
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
  suggested?: Array<{ id: string; badge?: string; meta?: string }>;
  suggestedHeading?: string;
  suggestedLoading?: boolean;
  onPick: (playerId: string) => void;
  onClear?: () => void;
  onClose: () => void;
}

export function PlayerPicker({
  heading,
  hint = "Search a player, then pick them for this slot.",
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
  suggested = [],
  suggestedHeading = "Standouts",
  suggestedLoading = false,
  onPick,
  onClear,
  onClose,
}: PlayerPickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const [depthReady, setDepthReady] = useState(isEveryTeamRostersReady);
  const boardFilters = lockedFilters ?? localFilters;
  const filled = Boolean(currentId);
  const hideBoardFilters = Boolean(lockedFilters);

  useDialogA11y({
    open: true,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: dialogRef,
    lockScroll: true,
  });

  useEffect(() => {
    writeJson(sortStorageKey, sort);
  }, [sort, sortStorageKey]);

  useEffect(() => {
    if (depthReady) {
      return;
    }
    void loadEveryTeamRosters()
      .then(() => setDepthReady(true))
      .catch(() => {
        /* catalog still searchable */
      });
  }, [depthReady]);

  const suggestedRows = useMemo(
    () =>
      suggested
        .map((row) => {
          const player =
            (rosterPlayers ?? NBA_ACTIVE_PLAYERS).find(
              (item) => item.id === row.id,
            ) ?? null;
          return player ? { ...row, player } : null;
        })
        .filter(
          (
            row,
          ): row is {
            id: string;
            badge?: string;
            meta?: string;
            player: TierPlayer;
          } => Boolean(row),
        ),
    [suggested, rosterPlayers],
  );
  const showSuggested = suggestedRows.length > 0 && !query.trim();
  const suggestedIds = useMemo(
    () => new Set(suggestedRows.map((row) => row.id)),
    [suggestedRows],
  );

  const players = useMemo(() => {
    const catalog = includeCoaches
      ? withCoaches(rosterPlayers ?? NBA_ACTIVE_PLAYERS)
      : (rosterPlayers ?? NBA_ACTIVE_PLAYERS);
    const withDepth = withRosterDepth(catalog);
    return sortPlayers(
      searchPlayers(
        query,
        {
          ...boardFilters,
          team: lockedTeam ?? boardFilters.team,
        },
        withDepth,
      ),
      sort,
    );
  }, [
    query,
    boardFilters,
    lockedTeam,
    sort,
    rosterPlayers,
    includeCoaches,
    depthReady,
  ]);

  const restPlayers = showSuggested
    ? players.filter((player) => !suggestedIds.has(player.id))
    : players;

  const setLocalRange =
    (key: "ageRange" | "heightRange" | "experienceRange") =>
    (range: NumberRange) => {
      setLocalFilters((current) => ({ ...current, [key]: range }));
    };

  return (
    <div
      className="sc-picker-scrim"
      onClick={(event) => closeComposerScrim(event, onClose)}
    >
      <div
        ref={dialogRef}
        className={[
          "sc-picker",
          "sc-picker--players",
          filtersOpen ? "is-filters-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sc-picker-title"
        tabIndex={-1}
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
              enterKeyHint="search"
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
            {hideBoardFilters ? null : (
              <button
                type="button"
                className={
                  filtersOpen
                    ? "sc-chip is-on sc-picker__filters-toggle"
                    : "sc-chip sc-picker__filters-toggle"
                }
                aria-pressed={filtersOpen}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                Filters
              </button>
            )}
          </div>
          {toolbarExtra}
        </div>
        <div
          className={
            hideBoardFilters
              ? "sc-picker__filters-slot is-hint"
              : "sc-picker__filters-slot"
          }
        >
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
              <FilterSelect
                label="Role"
                value={localFilters.role ?? ALL_PLAYER_FILTER}
                options={ROLE_FILTERS}
                onChange={(event) =>
                  setLocalFilters((current) => ({
                    ...current,
                    role: event.target.value,
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
                label="Role"
                value={localFilters.role ?? ALL_PLAYER_FILTER}
                options={ROLE_FILTERS}
                onChange={(event) =>
                  setLocalFilters((current) => ({
                    ...current,
                    role: event.target.value,
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
        </div>
        {suggestedLoading && !query.trim() ? (
          <p className="sc-picker__suggested-status">Loading box scores…</p>
        ) : null}
        {showSuggested ? (
          <div className="sc-picker__suggested">
            <p className="sc-picker__suggested-label">{suggestedHeading}</p>
            <div
              className="sc-picker__grid sc-picker__grid--suggested"
              aria-label={suggestedHeading}
            >
              {suggestedRows.map((row) => (
                <PlayerButton
                  key={`sug-${row.id}`}
                  player={row.player}
                  currentId={currentId}
                  usedLabel={usedLabels[row.id]}
                  showPpg={false}
                  showDepth={false}
                  badge={row.badge}
                  metaOverride={row.meta}
                  onPick={onPick}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div className="sc-picker__grid">
          {restPlayers.map((player) => (
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
            {restPlayers.length + (showSuggested ? suggestedRows.length : 0)}{" "}
            {includeCoaches ? "people" : "players"}
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
  badge,
  metaOverride,
  onPick,
}: {
  player: TierPlayer;
  currentId: string | null;
  usedLabel?: string;
  showPpg: boolean;
  showDepth: boolean;
  ppgEmptyLabel?: string;
  badge?: string;
  metaOverride?: string;
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
  const meta = isCurrent ? "This slot" : (metaOverride || identity);

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
        {badge ? <span className="sc-team__badge">{badge}</span> : null}
        {isUsed && usedLabel ? (
          <span className="sc-team__used">{usedChipLabel(usedLabel)}</span>
        ) : null}
      </span>
    </button>
  );
}
