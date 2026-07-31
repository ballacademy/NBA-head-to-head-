import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  addTier,
  clearTierListPlacements,
  DEFAULT_TIER_LIST_FILTERS,
  filterTierListPool,
  getAssignedPlayerIds,
  loadTierListState,
  movePlayerToTier,
  POSITIONS,
  removeTier,
  renameTier,
  resetTierListState,
  saveTierListState,
  setTierListTitle,
  type TierListAgeFilter,
  type TierListClassFilter,
  type TierListFilters,
  type TierListPoolSort,
  type TierListRoleFilter,
  type TierListState,
} from "../lib/tierList";
import { databasePlayersById } from "../lib/playerPool";
import type { Player, Position } from "../lib/types";
import { HubFeatureReturnButton } from "./HubFeatureReturnButton";

interface TierListPageProps {
  players: Player[];
  onBack: () => void;
}

const AGE_OPTIONS: { id: TierListAgeFilter; label: string }[] = [
  { id: "all", label: "Any age" },
  { id: "u25", label: "25 & under" },
  { id: "26-30", label: "26–30" },
  { id: "31plus", label: "31+" },
];

const ROLE_OPTIONS: { id: TierListRoleFilter; label: string }[] = [
  { id: "all", label: "Any role" },
  { id: "starter", label: "Starters" },
  { id: "bench", label: "Bench" },
];

const CLASS_OPTIONS: { id: TierListClassFilter; label: string }[] = [
  { id: "all", label: "All players" },
  { id: "superstar", label: "Superstars" },
  { id: "all-star", label: "All-Stars" },
  { id: "recent-all-star", label: "Recent All-Stars" },
  { id: "scrub", label: "Scrubs" },
  { id: "super-scrub", label: "Super Scrubs" },
];

const SORT_OPTIONS: { id: TierListPoolSort; label: string }[] = [
  { id: "points", label: "PPG" },
  { id: "name", label: "Name" },
  { id: "age", label: "Age" },
  { id: "minutes", label: "Minutes" },
];

const TIER_ACCENTS = [
  "#f59e0b",
  "#22c55e",
  "#38bdf8",
  "#a78bfa",
  "#fb7185",
  "#94a3b8",
  "#f97316",
  "#14b8a6",
];

const DRAG_TYPE = "application/x-ddgm-tier-player";

export function TierListPage({ players, onBack }: TierListPageProps) {
  const [state, setState] = useState<TierListState>(() => loadTierListState());
  const [filters, setFilters] = useState<TierListFilters>(DEFAULT_TIER_LIST_FILTERS);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);

  useEffect(() => {
    saveTierListState(state);
  }, [state]);

  const assignedIds = useMemo(() => getAssignedPlayerIds(state), [state]);

  const pool = useMemo(
    () => filterTierListPool(players, filters, assignedIds),
    [assignedIds, filters, players],
  );

  const updateState = (next: TierListState) => {
    setState(next);
  };

  const placePlayer = (
    playerId: string,
    tierId: string | null,
    insertBeforePlayerId?: string | null,
  ) => {
    updateState(movePlayerToTier(state, playerId, tierId, insertBeforePlayerId));
    setSelectedPlayerId(null);
    setDraggingPlayerId(null);
  };

  const togglePosition = (position: Position) => {
    setFilters((current) => {
      const exists = current.positions.includes(position);
      return {
        ...current,
        positions: exists
          ? current.positions.filter((entry) => entry !== position)
          : [...current.positions, position],
      };
    });
  };

  const resolvePlayer = (playerId: string) =>
    databasePlayersById.get(playerId) ??
    players.find((player) => player.id === playerId) ??
    null;

  const renderPlayerChip = (
    player: Player,
    options: { inTier?: boolean } = {},
  ) => {
    const selected = selectedPlayerId === player.id;
    const dragging = draggingPlayerId === player.id;

    return (
      <button
        key={player.id}
        type="button"
        className={`tier-list__player${selected ? " is-selected" : ""}${
          dragging ? " is-dragging" : ""
        }${options.inTier ? " tier-list__player--ranked" : ""}`}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAG_TYPE, player.id);
          event.dataTransfer.setData("text/plain", player.id);
          event.dataTransfer.effectAllowed = "move";
          setDraggingPlayerId(player.id);
          setSelectedPlayerId(player.id);
        }}
        onDragEnd={() => setDraggingPlayerId(null)}
        onClick={() =>
          setSelectedPlayerId((current) =>
            current === player.id ? null : player.id,
          )
        }
        aria-pressed={selected}
        title={`${player.name} · ${player.position} · ${player.points.toFixed(1)} PPG`}
      >
        <span className="tier-list__player-copy">
          <strong>{player.name}</strong>
          <span>
            {player.team} · {player.position}
            {typeof player.age === "number" ? ` · ${player.age}` : ""}
            {` · ${player.points.toFixed(1)}`}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="hub-feature tier-list-page">
      <HubFeatureReturnButton onBack={onBack} />
      <div className="landing-hub__top">
        <h1 className="landing-hub__title">Tier List</h1>
        <p className="landing__lede landing-hub__lede">
          Filter the pool, then drag players into named tiers
        </p>
      </div>

      <section className="hub-feature__panel tier-list">
        <div className="tier-list__toolbar">
          <label className="tier-list__title-field">
            <span>List title</span>
            <input
              type="text"
              value={state.title}
              maxLength={48}
              onChange={(event) =>
                updateState(setTierListTitle(state, event.target.value))
              }
            />
          </label>
          <div className="tier-list__toolbar-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => updateState(addTier(state))}
            >
              Add tier
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => updateState(clearTierListPlacements(state))}
            >
              Clear board
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                updateState(resetTierListState());
                setFilters(DEFAULT_TIER_LIST_FILTERS);
                setSelectedPlayerId(null);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="tier-list__filters" aria-label="Player filters">
          <label className="tier-list__search">
            <span>Search</span>
            <input
              type="search"
              value={filters.query}
              placeholder="Name, team, or position"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
            />
          </label>

          <div className="tier-list__filter-group">
            <span className="tier-list__filter-label">Position</span>
            <div className="tier-list__chips">
              {POSITIONS.map((position) => {
                const active = filters.positions.includes(position);
                return (
                  <button
                    key={position}
                    type="button"
                    className={`tier-list__chip${active ? " is-active" : ""}`}
                    aria-pressed={active}
                    onClick={() => togglePosition(position)}
                  >
                    {position}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="tier-list__filter-group">
            <span className="tier-list__filter-label">Age</span>
            <div className="tier-list__chips">
              {AGE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`tier-list__chip${
                    filters.age === option.id ? " is-active" : ""
                  }`}
                  aria-pressed={filters.age === option.id}
                  onClick={() =>
                    setFilters((current) => ({ ...current, age: option.id }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tier-list__filter-group">
            <span className="tier-list__filter-label">Role</span>
            <div className="tier-list__chips">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`tier-list__chip${
                    filters.role === option.id ? " is-active" : ""
                  }`}
                  aria-pressed={filters.role === option.id}
                  onClick={() =>
                    setFilters((current) => ({ ...current, role: option.id }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tier-list__filter-group">
            <span className="tier-list__filter-label">International</span>
            <div className="tier-list__chips">
              <button
                type="button"
                className={`tier-list__chip${
                  !filters.internationalOnly ? " is-active" : ""
                }`}
                aria-pressed={!filters.internationalOnly}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    internationalOnly: false,
                  }))
                }
              >
                All countries
              </button>
              <button
                type="button"
                className={`tier-list__chip${
                  filters.internationalOnly ? " is-active" : ""
                }`}
                aria-pressed={filters.internationalOnly}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    internationalOnly: true,
                  }))
                }
              >
                Born outside U.S.
              </button>
            </div>
          </div>

          <div className="tier-list__filter-group">
            <span className="tier-list__filter-label">Class</span>
            <div className="tier-list__chips">
              {CLASS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`tier-list__chip${
                    filters.playerClass === option.id ? " is-active" : ""
                  }`}
                  aria-pressed={filters.playerClass === option.id}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      playerClass: option.id,
                    }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tier-list__filter-group">
            <span className="tier-list__filter-label">Sort pool</span>
            <div className="tier-list__chips">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`tier-list__chip${
                    filters.sort === option.id ? " is-active" : ""
                  }`}
                  aria-pressed={filters.sort === option.id}
                  onClick={() =>
                    setFilters((current) => ({ ...current, sort: option.id }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedPlayerId ? (
          <p className="tier-list__hint">
            Tap a tier name or drop zone to place the selected player. Tap the
            pool header to unrank them.
          </p>
        ) : (
          <p className="tier-list__hint">
            Drag players into tiers, or tap a player then tap a tier. The full
            season pool is available here.
          </p>
        )}

        <div className="tier-list__board">
          {state.tiers.map((tier, index) => {
            const accent = TIER_ACCENTS[index % TIER_ACCENTS.length]!;
            const tierPlayers = tier.playerIds
              .map((playerId) => resolvePlayer(playerId))
              .filter((player): player is Player => player != null);

            return (
              <div
                key={tier.id}
                className="tier-list__row"
                style={{ "--tier-accent": accent } as CSSProperties}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const playerId =
                    event.dataTransfer.getData(DRAG_TYPE) ||
                    event.dataTransfer.getData("text/plain");
                  if (playerId) {
                    placePlayer(playerId, tier.id);
                  }
                }}
              >
                <div className="tier-list__tier-label">
                  <input
                    type="text"
                    className="tier-list__tier-name"
                    value={tier.name}
                    maxLength={24}
                    aria-label="Tier name"
                    onChange={(event) =>
                      updateState(renameTier(state, tier.id, event.target.value))
                    }
                    onClick={() => {
                      if (selectedPlayerId) {
                        placePlayer(selectedPlayerId, tier.id);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="tier-list__tier-remove"
                    aria-label={`Remove ${tier.name} tier`}
                    disabled={state.tiers.length <= 1}
                    onClick={() => updateState(removeTier(state, tier.id))}
                  >
                    ×
                  </button>
                </div>
                <div
                  className="tier-list__tier-drop"
                  onClick={() => {
                    if (selectedPlayerId) {
                      placePlayer(selectedPlayerId, tier.id);
                    }
                  }}
                >
                  {tierPlayers.length > 0 ? (
                    tierPlayers.map((player) =>
                      renderPlayerChip(player, { inTier: true }),
                    )
                  ) : (
                    <span className="tier-list__empty">Drop players here</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="tier-list__pool"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
          onDrop={(event) => {
            event.preventDefault();
            const playerId =
              event.dataTransfer.getData(DRAG_TYPE) ||
              event.dataTransfer.getData("text/plain");
            if (playerId) {
              placePlayer(playerId, null);
            }
          }}
        >
          <div className="tier-list__pool-header">
            <h2>Player pool</h2>
            <span>
              {pool.length} available
              {assignedIds.size > 0 ? ` · ${assignedIds.size} ranked` : ""}
            </span>
            {selectedPlayerId ? (
              <button
                type="button"
                className="secondary-button tier-list__unrank"
                onClick={() => placePlayer(selectedPlayerId, null)}
              >
                Unrank selected
              </button>
            ) : null}
          </div>
          <div className="tier-list__pool-grid">
            {pool.length > 0 ? (
              pool.map((player) => renderPlayerChip(player))
            ) : (
              <p className="draft-empty">
                No players match these filters
                {assignedIds.size > 0 ? " (or all matches are already ranked)" : ""}.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
