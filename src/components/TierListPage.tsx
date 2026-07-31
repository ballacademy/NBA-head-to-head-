import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  addTier,
  clearTierListPlacements,
  CONFERENCES,
  createDefaultTierListState,
  DEFAULT_TIER_LIST_FILTERS,
  DEFAULT_TIER_LIST_TITLE,
  DIVISIONS,
  DRAFT_CLASS_YEARS,
  deleteTierListFromLibrary,
  filterTierListPool,
  getAssignedPlayerIds,
  loadTierListLibrary,
  loadTierListState,
  movePlayerToTier,
  openTierListFromLibrary,
  POSITIONS,
  removeTier,
  renameTier,
  saveTierListState,
  saveTierListToLibrary,
  setTierListTitle,
  type TierListAgencyFilter,
  type TierListClassFilter,
  type TierListConferenceFilter,
  type TierListDivisionFilter,
  type TierListDraftClassFilter,
  type TierListExperienceFilter,
  type TierListFilters,
  type TierListLibrary,
  type TierListPoolSort,
  type TierListRoleFilter,
  type TierListState,
  type TierListTeamFilter,
} from "../lib/tierList";
import { databasePlayersById } from "../lib/playerPool";
import { getTeamColors } from "../lib/teamColors";
import { downloadTierListImage } from "../lib/tierListShareCard";
import type { Player, Position } from "../lib/types";
import { HubFeatureReturnButton } from "./HubFeatureReturnButton";

interface TierListPageProps {
  players: Player[];
  onBack: () => void;
}

const ROLE_OPTIONS: { id: TierListRoleFilter; label: string }[] = [
  { id: "all", label: "Any role" },
  { id: "starter", label: "Starters" },
  { id: "bench", label: "Bench" },
];

const AGENCY_OPTIONS: { id: TierListAgencyFilter; label: string }[] = [
  { id: "all", label: "All players" },
  { id: "free-agent", label: "Free agents" },
  { id: "rostered", label: "Rostered" },
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

const EXPERIENCE_OPTIONS: { id: TierListExperienceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "rookies", label: "Rookies" },
  { id: "veterans", label: "Veterans" },
  { id: "upcoming", label: "Upcoming" },
];

const parseAgeBound = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.min(99, Math.round(parsed)));
};

/** Ten distinct accents — cycle only after the 10th unnamed tier. */
const TIER_ACCENTS = [
  "#f59e0b", // amber
  "#94a3b8", // slate silver
  "#cd7f32", // bronze
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // violet
  "#ef4444", // red
  "#14b8a6", // teal
  "#ec4899", // pink
  "#84cc16", // lime
];

const TIER_METAL_BY_NAME: Record<string, string> = {
  S: "#d4af37", // gold
  A: "#c0c0c0", // silver
  B: "#cd7f32", // bronze
};

function accentForTier(index: number, name: string): string {
  const metal = TIER_METAL_BY_NAME[name.trim().toUpperCase()];
  if (metal) return metal;
  return TIER_ACCENTS[index % TIER_ACCENTS.length]!;
}

const DRAG_TYPE = "application/x-ddgm-tier-player";

const formatSavedAt = (savedAt: number) =>
  new Date(savedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function TierListPage({ players, onBack }: TierListPageProps) {
  const [state, setState] = useState<TierListState>(() => loadTierListState());
  const [library, setLibrary] = useState<TierListLibrary>(() =>
    loadTierListLibrary(),
  );
  const [filters, setFilters] = useState<TierListFilters>(DEFAULT_TIER_LIST_FILTERS);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    saveTierListState(state);
  }, [state]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timer = window.setTimeout(() => setStatusMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const assignedIds = useMemo(() => getAssignedPlayerIds(state), [state]);

  const teamOptions = useMemo(
    () =>
      [...new Set(players.map((player) => player.team))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [players],
  );

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

  const handleSave = () => {
    const result = saveTierListToLibrary(state, library);
    setState(result.state);
    setLibrary(result.library);
    setStatusMessage("Tier list saved");
  };

  const handleDownload = async () => {
    try {
      const tiers = state.tiers.map((tier, index) => ({
        name: tier.name,
        accent: accentForTier(index, tier.name),
        players: tier.playerIds
          .map((playerId) => resolvePlayer(playerId))
          .filter((player): player is Player => player != null)
          .map((player) => ({
            name: player.name,
            team: player.team,
            position: player.position,
          })),
      }));

      await downloadTierListImage(
        {
          title: state.title.trim() || DEFAULT_TIER_LIST_TITLE,
          tiers,
        },
        "png",
      );
      setStatusMessage("Image download started");
    } catch {
      setStatusMessage("Could not download image");
    }
  };

  const handleNew = () => {
    const next = createDefaultTierListState();
    updateState(next);
    setFilters(DEFAULT_TIER_LIST_FILTERS);
    setSelectedPlayerId(null);
    setLibraryOpen(false);
    setStatusMessage("Started a new tier list");
  };

  const handleOpenSaved = (documentId: string) => {
    const next = openTierListFromLibrary(documentId, library);
    if (!next) {
      return;
    }

    updateState(next);
    setSelectedPlayerId(null);
    setLibraryOpen(false);
    setStatusMessage(`Opened “${next.title}”`);
  };

  const handleDeleteSaved = (documentId: string) => {
    setLibrary(deleteTierListFromLibrary(documentId, library));
    setStatusMessage("Removed saved tier list");
  };

  const renderPlayerChip = (
    player: Player,
    options: { inTier?: boolean } = {},
  ) => {
    const selected = selectedPlayerId === player.id;
    const dragging = draggingPlayerId === player.id;
    const colors = getTeamColors(player.team);

    return (
      <button
        key={player.id}
        type="button"
        className={`tier-list__player${selected ? " is-selected" : ""}${
          dragging ? " is-dragging" : ""
        }${options.inTier ? " tier-list__player--ranked" : ""}`}
        style={
          {
            "--team-primary": colors.primary,
          } as CSSProperties
        }
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
        <p className="eyebrow landing-hub__eyebrow">Tier List</p>
        <h1 className="landing-hub__title">Build your rankings</h1>
        <p className="landing__lede landing-hub__lede">
          Filter the pool, then drag players into named tiers
        </p>
      </div>

      <section className="hub-feature__panel tier-list">
        <div className="tier-list__toolbar">
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
              onClick={() => setLibraryOpen((open) => !open)}
              aria-expanded={libraryOpen}
            >
              {libraryOpen ? "Hide saved lists" : "My saved lists"}
            </button>
            <button type="button" className="secondary-button" onClick={handleNew}>
              New list
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                updateState(clearTierListPlacements(state));
                setSelectedPlayerId(null);
              }}
            >
              Reset board
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setFilters(DEFAULT_TIER_LIST_FILTERS)}
            >
              Reset filters
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                updateState(createDefaultTierListState());
                setFilters(DEFAULT_TIER_LIST_FILTERS);
                setSelectedPlayerId(null);
                setLibraryOpen(false);
              }}
            >
              Reset all
            </button>
          </div>
          {statusMessage ? (
            <p className="tier-list__status" role="status">
              {statusMessage}
            </p>
          ) : null}
        </div>

        {libraryOpen ? (
          <div className="tier-list__library" aria-label="Saved tier lists">
            <div className="tier-list__library-header">
              <h2>Saved tier lists</h2>
              <span>{library.documents.length} saved</span>
            </div>
            {library.documents.length > 0 ? (
              <ul className="tier-list__library-list">
                {library.documents.map((document) => (
                  <li key={document.id} className="tier-list__library-item">
                    <div className="tier-list__library-copy">
                      <strong>{document.title}</strong>
                      <span>{formatSavedAt(document.savedAt)}</span>
                    </div>
                    <div className="tier-list__library-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleOpenSaved(document.id)}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleDeleteSaved(document.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tier-list__hint">
                No saved lists yet. Hit Save to keep the current board here.
              </p>
            )}
          </div>
        ) : null}

        <div className="tier-list__filters" aria-label="Player filters">
          <div className="tier-list__filter-row">
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
              <div className="tier-list__age-range">
                <label className="tier-list__age-field">
                  <span>Min</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={99}
                    placeholder="Any"
                    value={filters.ageMin ?? ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        ageMin: parseAgeBound(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className="tier-list__age-field">
                  <span>Max</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={99}
                    placeholder="Any"
                    value={filters.ageMax ?? ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        ageMax: parseAgeBound(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="tier-list__filter-row tier-list__filter-row--selects">
            <label className="tier-list__select-field">
              <span className="tier-list__filter-label">Team</span>
              <div className="tier-list__select-shell">
                <select
                  value={filters.team}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      team: event.target.value as TierListTeamFilter,
                    }))
                  }
                >
                  <option value="all">All teams</option>
                  {teamOptions.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="tier-list__select-field">
              <span className="tier-list__filter-label">Division</span>
              <div className="tier-list__select-shell">
                <select
                  value={filters.division}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      division: event.target.value as TierListDivisionFilter,
                    }))
                  }
                >
                  <option value="all">All divisions</option>
                  {DIVISIONS.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="tier-list__select-field">
              <span className="tier-list__filter-label">Conference</span>
              <div className="tier-list__select-shell">
                <select
                  value={filters.conference}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      conference: event.target.value as TierListConferenceFilter,
                    }))
                  }
                >
                  <option value="all">All conferences</option>
                  {CONFERENCES.map((conference) => (
                    <option key={conference} value={conference}>
                      {conference}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <div className="tier-list__filter-row tier-list__filter-row--selects">
            <label className="tier-list__select-field">
              <span className="tier-list__filter-label">Experience</span>
              <div className="tier-list__select-shell">
                <select
                  value={filters.experience}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      experience: event.target.value as TierListExperienceFilter,
                    }))
                  }
                >
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="tier-list__select-field">
              <span className="tier-list__filter-label">Draft class</span>
              <div className="tier-list__select-shell">
                <select
                  value={filters.draftClass === "all" ? "all" : String(filters.draftClass)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFilters((current) => ({
                      ...current,
                      draftClass:
                        value === "all"
                          ? "all"
                          : (Number(value) as TierListDraftClassFilter),
                    }));
                  }}
                >
                  <option value="all">All classes</option>
                  {DRAFT_CLASS_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <div className="tier-list__filter-group">
            <span className="tier-list__filter-label">Agency</span>
            <div className="tier-list__chips">
              {AGENCY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`tier-list__chip${
                    filters.agency === option.id ? " is-active" : ""
                  }`}
                  aria-pressed={filters.agency === option.id}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      agency: option.id,
                    }))
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
        </div>

        {selectedPlayerId ? (
          <p className="tier-list__hint">
            Tap a tier name or drop zone to place the selected player. Tap the
            pool header to unrank them.
          </p>
        ) : (
          <p className="tier-list__hint">
            Drag players into tiers, or tap a player then tap a tier. Includes
            the full season pool plus upcoming rookies.
          </p>
        )}

        <div className="tier-list__board-header">
          <label className="tier-list__page-title">
            <span className="visually-hidden">Tier list name</span>
            <input
              type="text"
              className="tier-list__page-title-input"
              value={state.title}
              maxLength={48}
              placeholder={DEFAULT_TIER_LIST_TITLE}
              aria-label="Tier list name"
              onChange={(event) =>
                updateState(setTierListTitle(state, event.target.value))
              }
            />
          </label>
          <div className="tier-list__board-header-actions">
            <button type="button" className="secondary-button" onClick={handleSave}>
              Save
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleDownload}
            >
              Download
            </button>
          </div>
        </div>

        <div className="tier-list__board">
          {state.tiers.map((tier, index) => {
            const accent = accentForTier(index, tier.name);
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
          <div className="tier-list__pool-controls">
            <label className="tier-list__search tier-list__search--pool">
              <span>Search players</span>
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
            <div className="tier-list__filter-group tier-list__sort-pool">
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
                      setFilters((current) => ({
                        ...current,
                        sort: option.id,
                      }))
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
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
