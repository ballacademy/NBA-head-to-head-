import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
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
  displayTierListTitle,
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
  setTierListPublishedId,
  setTierListTitle,
  TIER_NAME_MAX_LENGTH,
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
import {
  formatPublicTag,
  getOrCreatePlayerIdentity,
} from "../lib/playerIdentity";
import { getTeamGlowColor } from "../lib/teamColors";
import { downloadTierListImage } from "../lib/tierListShareCard";
import {
  fetchPublicTierList,
  fetchPublicTierLists,
  publishTierList,
  setTierListLike,
  unpublishTierList,
  type PublicTierListDetail,
  type PublicTierListSort,
  type PublicTierListSummary,
} from "../lib/tierListCommunity";
import { fetchAccountStatus } from "../lib/accountApi";
import type { Player, Position } from "../lib/types";
import { HubFeatureReturnButton } from "./HubFeatureReturnButton";
import {
  TierListHubHome,
  TierListMinePanel,
  TierListPublicPanel,
  TierListPublicViewer,
} from "./TierListHubPanels";

interface TierListPageProps {
  players: Player[];
  onBack: () => void;
}

type TierListView = "hub" | "editor" | "mine" | "public" | "viewer";

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

const DRAG_ACTIVATION_DISTANCE = 6;

type PointerDragSession = {
  playerId: string;
  pointerId: number;
  startX: number;
  startY: number;
  activated: boolean;
};

export function TierListPage({ players, onBack }: TierListPageProps) {
  const identity = useMemo(() => getOrCreatePlayerIdentity(), []);
  const [view, setView] = useState<TierListView>("hub");
  const [state, setState] = useState<TierListState>(() => loadTierListState());
  const [library, setLibrary] = useState<TierListLibrary>(() =>
    loadTierListLibrary(),
  );
  const [filters, setFilters] = useState<TierListFilters>(DEFAULT_TIER_LIST_FILTERS);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState(`GM ${formatPublicTag(identity.publicTag)}`);
  const [mineSort, setMineSort] = useState<PublicTierListSort>("recent");
  const [publicSort, setPublicSort] = useState<PublicTierListSort>("recent");
  const [publicLists, setPublicLists] = useState<PublicTierListSummary[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [viewerDetail, setViewerDetail] = useState<PublicTierListDetail | null>(
    null,
  );
  const dragSessionRef = useRef<PointerDragSession | null>(null);
  const suppressClickRef = useRef(false);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);
  const dragPointRef = useRef<{ x: number; y: number } | null>(null);
  const dropTargetRef = useRef<string | null>(null);
  const dragFrameRef = useRef<number | null>(null);

  useEffect(() => {
    saveTierListState(state);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    void fetchAccountStatus(identity.playerId).then((result) => {
      if (cancelled || !result.ok || !result.status.username) {
        return;
      }
      setAuthorName(result.status.username);
    });
    return () => {
      cancelled = true;
    };
  }, [identity.playerId]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timer = window.setTimeout(() => setStatusMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    if (view !== "public") {
      return;
    }

    let cancelled = false;
    setPublicLoading(true);
    void fetchPublicTierLists({
      viewerPlayerId: identity.playerId,
      sort: publicSort,
    }).then((lists) => {
      if (!cancelled) {
        setPublicLists(lists);
        setPublicLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [view, publicSort, identity.playerId]);

  useEffect(() => {
    return () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current);
      }
      document.body.classList.remove("tier-list-dragging");
    };
  }, []);

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

  const clearDragVisuals = () => {
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    dragPointRef.current = null;
    dropTargetRef.current = null;
    setDraggingPlayerId(null);
    setDropTargetId(null);
    document.body.classList.remove("tier-list-dragging");
  };

  const placePlayer = (
    playerId: string,
    tierId: string | null,
    insertBeforePlayerId?: string | null,
  ) => {
    setState((current) =>
      movePlayerToTier(current, playerId, tierId, insertBeforePlayerId),
    );
    setSelectedPlayerId(null);
    clearDragVisuals();
  };

  const resolveDropTargetId = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!(element instanceof Element)) {
      return null;
    }

    const dropZone = element.closest("[data-tier-drop]");
    if (!(dropZone instanceof HTMLElement)) {
      return null;
    }

    return dropZone.dataset.tierDrop ?? null;
  };

  const scheduleDragFrame = () => {
    if (dragFrameRef.current !== null) {
      return;
    }

    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      const point = dragPointRef.current;
      const ghost = dragGhostRef.current;
      if (point && ghost) {
        ghost.style.transform = `translate3d(${point.x + 10}px, ${point.y + 10}px, 0)`;
      }

      if (!point) {
        return;
      }

      const nextTarget = resolveDropTargetId(point.x, point.y);
      if (nextTarget !== dropTargetRef.current) {
        dropTargetRef.current = nextTarget;
        setDropTargetId(nextTarget);
      }
    });
  };

  const finishPointerDrag = (clientX: number, clientY: number) => {
    const session = dragSessionRef.current;
    dragSessionRef.current = null;

    if (!session) {
      return;
    }

    if (session.activated) {
      suppressClickRef.current = true;
      const target = resolveDropTargetId(clientX, clientY);
      if (target === "pool") {
        placePlayer(session.playerId, null);
      } else if (target) {
        placePlayer(session.playerId, target);
      } else {
        clearDragVisuals();
      }
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      return;
    }

    clearDragVisuals();
  };

  const handlePlayerPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    playerId: string,
  ) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.currentTarget;
    suppressClickRef.current = false;
    dragSessionRef.current = {
      playerId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      activated: false,
    };
    setSelectedPlayerId(playerId);

    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort on some mobile browsers.
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || moveEvent.pointerId !== session.pointerId) {
        return;
      }

      const dx = moveEvent.clientX - session.startX;
      const dy = moveEvent.clientY - session.startY;
      const distance = Math.hypot(dx, dy);

      if (!session.activated) {
        if (distance < DRAG_ACTIVATION_DISTANCE) {
          return;
        }

        session.activated = true;
        suppressClickRef.current = true;
        document.body.classList.add("tier-list-dragging");
        dragPointRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
        setDraggingPlayerId(session.playerId);
      }

      moveEvent.preventDefault();
      dragPointRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
      scheduleDragFrame();
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (
        dragSessionRef.current &&
        upEvent.pointerId !== dragSessionRef.current.pointerId
      ) {
        return;
      }

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      try {
        if (target.hasPointerCapture(upEvent.pointerId)) {
          target.releasePointerCapture(upEvent.pointerId);
        }
      } catch {
        // Ignore release failures.
      }
      finishPointerDrag(upEvent.clientX, upEvent.clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
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

  const handlePublish = async () => {
    const saved = saveTierListToLibrary(state, library);
    setState(saved.state);
    setLibrary(saved.library);

    const result = await publishTierList({
      state: saved.state,
      playerId: identity.playerId,
      authorName,
      authorTag: identity.publicTag,
      publishedId: saved.state.publishedId,
    });

    if (!result.ok) {
      setStatusMessage(result.error);
      return;
    }

    const nextState = setTierListPublishedId(saved.state, result.id);
    const nextSaved = saveTierListToLibrary(nextState, saved.library);
    setState(nextSaved.state);
    setLibrary(nextSaved.library);
    setStatusMessage("Published to public tier lists");
  };

  const handleUnpublish = async () => {
    if (!state.publishedId) {
      return;
    }

    const result = await unpublishTierList({
      id: state.publishedId,
      playerId: identity.playerId,
    });

    if (!result.ok) {
      setStatusMessage(result.error);
      return;
    }

    const nextState = setTierListPublishedId(state, null);
    const nextSaved = saveTierListToLibrary(nextState, library);
    setState(nextSaved.state);
    setLibrary(nextSaved.library);
    setStatusMessage("Removed from public tier lists");
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
          title: displayTierListTitle(state.title),
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
    setStatusMessage("Started a new tier list");
    setView("editor");
  };

  const handleOpenSaved = (documentId: string) => {
    const next = openTierListFromLibrary(documentId, library);
    if (!next) {
      return;
    }

    updateState(next);
    setSelectedPlayerId(null);
    setStatusMessage(`Opened “${displayTierListTitle(next.title)}”`);
    setView("editor");
  };

  const handleDeleteSaved = (documentId: string) => {
    setLibrary(deleteTierListFromLibrary(documentId, library));
    setStatusMessage("Removed saved tier list");
  };

  const handleOpenPublic = async (id: string) => {
    const detail = await fetchPublicTierList({
      id,
      viewerPlayerId: identity.playerId,
    });
    if (!detail) {
      setStatusMessage("Could not open that tier list");
      return;
    }
    setViewerDetail(detail);
    setView("viewer");
  };

  const handleToggleLike = async (id: string, liked: boolean) => {
    const result = await setTierListLike({
      id,
      playerId: identity.playerId,
      liked,
    });
    if (!result.ok) {
      setStatusMessage(result.error);
      return;
    }

    setPublicLists((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              likedByViewer: result.liked,
              likeCount: result.likeCount,
            }
          : entry,
      ),
    );
    setViewerDetail((current) =>
      current && current.id === id
        ? {
            ...current,
            likedByViewer: result.liked,
            likeCount: result.likeCount,
          }
        : current,
    );
  };

  const handleBack = () => {
    if (view === "hub") {
      onBack();
      return;
    }
    if (view === "viewer") {
      setViewerDetail(null);
      setView("public");
      return;
    }
    setView("hub");
  };

  const renderPlayerChip = (
    player: Player,
    options: { inTier?: boolean } = {},
  ) => {
    const selected = selectedPlayerId === player.id;
    const dragging = draggingPlayerId === player.id;
    const colors = { primary: getTeamGlowColor(player.team) };

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
        onPointerDown={(event) => handlePlayerPointerDown(event, player.id)}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }

          setSelectedPlayerId((current) =>
            current === player.id ? null : player.id,
          );
        }}
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

  const draggingPlayer = draggingPlayerId
    ? resolvePlayer(draggingPlayerId)
    : null;

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const player of players) {
      map.set(player.id, player);
    }
    for (const [id, player] of databasePlayersById) {
      map.set(id, player);
    }
    return map;
  }, [players]);

  return (
    <div className="hub-feature tier-list-page">
      <div className="landing-hub__top">
        <h1 className="landing-hub__title">Tier List Builder</h1>
        <p className="landing__lede landing-hub__lede">
          Create and share your own tier lists
        </p>
      </div>

      <HubFeatureReturnButton
        onBack={handleBack}
        label={view === "hub" ? "Return" : "Back"}
      />

      {statusMessage ? (
        <p className="tier-list__status" role="status">
          {statusMessage}
        </p>
      ) : null}

      {view === "hub" ? (
        <TierListHubHome
          onCreate={handleNew}
          onOpenMine={() => setView("mine")}
          onOpenPublic={() => setView("public")}
        />
      ) : null}

      {view === "mine" ? (
        <TierListMinePanel
          library={library}
          sort={mineSort}
          onSortChange={setMineSort}
          onOpen={handleOpenSaved}
          onDelete={handleDeleteSaved}
        />
      ) : null}

      {view === "public" ? (
        <TierListPublicPanel
          lists={publicLists}
          loading={publicLoading}
          sort={publicSort}
          onSortChange={setPublicSort}
          onOpen={handleOpenPublic}
          onToggleLike={handleToggleLike}
        />
      ) : null}

      {view === "viewer" && viewerDetail ? (
        <TierListPublicViewer
          detail={viewerDetail}
          playersById={playersById}
          onToggleLike={(liked) => handleToggleLike(viewerDetail.id, liked)}
        />
      ) : null}

      {view === "editor" ? (
      <section className="hub-feature__panel tier-list">
        <div className="tier-list__toolbar">
          <div className="tier-list__toolbar-actions">
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
              }}
            >
              Reset board and filters
            </button>
          </div>
        </div>

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

        {selectedPlayerId && !draggingPlayerId ? (
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
            <button
              type="button"
              className="secondary-button"
              onClick={() => updateState(addTier(state))}
            >
              Add tier
            </button>
            <button type="button" className="secondary-button" onClick={handleSave}>
              Save
            </button>
            {state.publishedId ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleUnpublish()}
              >
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handlePublish()}
              >
                Publish
              </button>
            )}
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
                className={`tier-list__row${
                  dropTargetId === tier.id ? " is-drop-target" : ""
                }`}
                style={{ "--tier-accent": accent } as CSSProperties}
              >
                <div
                  className="tier-list__tier-label"
                  style={
                    {
                      "--tier-name-len": Math.max(tier.name.length, 1),
                    } as CSSProperties
                  }
                >
                  <textarea
                    className="tier-list__tier-name"
                    value={tier.name}
                    maxLength={TIER_NAME_MAX_LENGTH}
                    rows={2}
                    aria-label="Tier name"
                    onChange={(event) =>
                      updateState(renameTier(state, tier.id, event.target.value))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    onClick={() => {
                      if (selectedPlayerId && !draggingPlayerId) {
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
                  data-tier-drop={tier.id}
                  onClick={() => {
                    if (selectedPlayerId && !draggingPlayerId) {
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
          className={`tier-list__pool${
            dropTargetId === "pool" ? " is-drop-target" : ""
          }`}
          data-tier-drop="pool"
        >
          <div className="tier-list__pool-header">
            <h2>Player pool</h2>
            <span>
              {pool.length} available
              {assignedIds.size > 0 ? ` · ${assignedIds.size} ranked` : ""}
            </span>
            {selectedPlayerId && !draggingPlayerId ? (
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
      ) : null}

      {draggingPlayer ? (
        <div
          ref={(node) => {
            dragGhostRef.current = node;
            const point = dragPointRef.current;
            if (node && point) {
              node.style.transform = `translate3d(${point.x + 10}px, ${point.y + 10}px, 0)`;
            }
          }}
          className="tier-list__drag-ghost"
          style={
            {
              "--team-primary": getTeamGlowColor(draggingPlayer.team),
            } as CSSProperties
          }
          aria-hidden
        >
          <strong>{draggingPlayer.name}</strong>
          <span>
            {draggingPlayer.team} · {draggingPlayer.position}
          </span>
        </div>
      ) : null}
    </div>
  );
}
