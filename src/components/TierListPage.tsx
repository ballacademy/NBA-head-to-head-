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
  TIER_LIST_MAX_TIERS,
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
  buildPublicTierListShareUrl,
  DEFAULT_PUBLIC_TIER_LIST_FILTERS,
  fetchPublishedLikeCounts,
  fetchPublicTierList,
  fetchPublicTierLists,
  publishTierList,
  setTierListLike,
  unpublishTierList,
  type PublicTierListBrowseFilters,
  type PublicTierListDetail,
  type PublicTierListSort,
  type PublicTierListSummary,
} from "../lib/tierListCommunity";
import { fetchAccountStatus } from "../lib/accountApi";
import {
  ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE,
  isPlayerAccountLinked,
} from "../lib/accountGate";
import type { Player, Position } from "../lib/types";
import { AccountRequiredNote } from "./AccountRequiredNote";
import { HubFeatureReturnButton } from "./HubFeatureReturnButton";
import {
  TierListHubHome,
  TierListMinePanel,
  TierListPublicPanel,
  TierListPublicViewer,
} from "./TierListHubPanels";

interface TierListPageProps {
  players: Player[];
  /** Kept for App wiring; leaving the Tiers hub uses bottom nav, not Return. */
  onBack?: () => void;
  /** Deep-link public id from `?tierList=` — opens the viewer on mount. */
  initialPublicTierListId?: string | null;
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

/** Height filter bounds in total inches (e.g. 78 = 6'6"). */
const parseHeightBound = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(48, Math.min(108, Math.round(parsed)));
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

export function TierListPage({
  players,
  initialPublicTierListId = null,
}: TierListPageProps) {
  const identity = useMemo(() => getOrCreatePlayerIdentity(), []);
  const [view, setView] = useState<TierListView>(() =>
    initialPublicTierListId ? "viewer" : "hub",
  );
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
  const [accountLinked, setAccountLinked] = useState(false);
  const [mineSort, setMineSort] = useState<PublicTierListSort>("recent");
  const [publishedLikeCounts, setPublishedLikeCounts] = useState<
    Record<string, number>
  >({});
  const [publicSort, setPublicSort] = useState<PublicTierListSort>("recent");
  const [publicFilters, setPublicFilters] = useState<PublicTierListBrowseFilters>(
    DEFAULT_PUBLIC_TIER_LIST_FILTERS,
  );
  const [publicLists, setPublicLists] = useState<PublicTierListSummary[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicLoadingMore, setPublicLoadingMore] = useState(false);
  const [publicHasMore, setPublicHasMore] = useState(false);
  const [publicNextOffset, setPublicNextOffset] = useState(0);
  const [viewerDetail, setViewerDetail] = useState<PublicTierListDetail | null>(
    null,
  );
  const deepLinkHandledRef = useRef(false);
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
      if (cancelled) {
        return;
      }
      if (result.ok && result.status.linked && result.status.username) {
        setAuthorName(result.status.username);
        setAccountLinked(true);
        return;
      }
      setAccountLinked(false);
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
    setPublicHasMore(false);
    setPublicNextOffset(0);
    void fetchPublicTierLists({
      viewerPlayerId: identity.playerId,
      sort: publicSort,
      filters: publicFilters,
      offset: 0,
    }).then((page) => {
      if (!cancelled) {
        setPublicLists(page.lists);
        setPublicHasMore(page.hasMore);
        setPublicNextOffset(page.nextOffset);
        setPublicLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [view, publicSort, publicFilters, identity.playerId]);

  useEffect(() => {
    if (!initialPublicTierListId || deepLinkHandledRef.current) {
      return;
    }

    deepLinkHandledRef.current = true;
    let cancelled = false;
    void fetchPublicTierList({
      id: initialPublicTierListId,
      viewerPlayerId: identity.playerId,
    }).then((detail) => {
      if (cancelled) {
        return;
      }
      if (!detail) {
        setView("public");
        setStatusMessage("That shared tier list could not be found");
        return;
      }
      setViewerDetail(detail);
      setView("viewer");
    });

    return () => {
      cancelled = true;
    };
  }, [initialPublicTierListId, identity.playerId]);

  useEffect(() => {
    if (view !== "mine") {
      return;
    }

    let cancelled = false;
    void fetchPublishedLikeCounts({
      viewerPlayerId: identity.playerId,
    }).then((counts) => {
      if (!cancelled) {
        setPublishedLikeCounts(counts);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [view, identity.playerId, library]);

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

  const resolveDropTarget = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!(element instanceof Element)) {
      return null;
    }

    const playerChip = element.closest("[data-tier-player]");
    if (playerChip instanceof HTMLElement) {
      const tierId = playerChip.dataset.tierId ?? null;
      const insertBeforePlayerId = playerChip.dataset.tierPlayer ?? null;
      if (tierId) {
        return { tierId, insertBeforePlayerId };
      }
    }

    const dropZone = element.closest("[data-tier-drop]");
    if (!(dropZone instanceof HTMLElement)) {
      return null;
    }

    const tierId = dropZone.dataset.tierDrop ?? null;
    if (!tierId) {
      return null;
    }

    return { tierId, insertBeforePlayerId: null as string | null };
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

      const nextTarget = resolveDropTarget(point.x, point.y)?.tierId ?? null;
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
      const target = resolveDropTarget(clientX, clientY);
      if (target?.tierId === "pool") {
        placePlayer(session.playerId, null);
      } else if (target?.tierId) {
        placePlayer(
          session.playerId,
          target.tierId,
          target.insertBeforePlayerId,
        );
      } else {
        clearDragVisuals();
      }
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      return;
    }

    // Tap without drag: keep the selection from pointerdown and suppress the
    // follow-up click (pointerdown preventDefault can still emit click later).
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handlePlayerPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    playerId: string,
  ) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.currentTarget;
    // Stop mobile long-press callouts / text selection before the drag starts.
    event.preventDefault();
    window.getSelection()?.removeAllRanges();

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

      moveEvent.preventDefault();
      const dx = moveEvent.clientX - session.startX;
      const dy = moveEvent.clientY - session.startY;
      const distance = Math.hypot(dx, dy);

      if (!session.activated) {
        if (distance < DRAG_ACTIVATION_DISTANCE) {
          return;
        }

        session.activated = true;
        suppressClickRef.current = true;
        window.getSelection()?.removeAllRanges();
        document.body.classList.add("tier-list-dragging");
        dragPointRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
        setDraggingPlayerId(session.playerId);
      }

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

  const unpublishPublishedCopy = async (publishedId: string | null | undefined) => {
    if (!publishedId) {
      return true;
    }

    const result = await unpublishTierList({
      id: publishedId,
      playerId: identity.playerId,
    });

    if (!result.ok) {
      setStatusMessage(result.error);
      return false;
    }

    return true;
  };

  const handleSave = () => {
    const result = saveTierListToLibrary(state, library);
    setState(result.state);
    setLibrary(result.library);
    setStatusMessage("Tier list saved");
  };

  const handlePublish = async () => {
    if (!(await isPlayerAccountLinked(identity.playerId))) {
      setAccountLinked(false);
      setStatusMessage(ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE);
      return;
    }

    setAccountLinked(true);
    const saved = saveTierListToLibrary(state, library);
    setState(saved.state);
    setLibrary(saved.library);

    const wasPublished = Boolean(saved.state.publishedId);
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
    setStatusMessage(
      wasPublished || result.updated
        ? "Updated public tier list"
        : "Published to public tier lists",
    );
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

  const handleNew = async () => {
    const ok = await unpublishPublishedCopy(state.publishedId);
    if (!ok) {
      return;
    }

    const next = createDefaultTierListState();
    updateState(next);
    setFilters(DEFAULT_TIER_LIST_FILTERS);
    setSelectedPlayerId(null);
    setStatusMessage(
      state.publishedId
        ? "Started a new tier list (previous public copy removed)"
        : "Started a new tier list",
    );
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

  const handleDeleteSaved = async (documentId: string) => {
    const document = library.documents.find((entry) => entry.id === documentId);
    const ok = await unpublishPublishedCopy(document?.publishedId);
    if (!ok) {
      return;
    }

    const nextLibrary = deleteTierListFromLibrary(documentId, library);
    setLibrary(nextLibrary);

    if (state.id === documentId) {
      updateState(createDefaultTierListState());
    } else if (
      document?.publishedId &&
      state.publishedId === document.publishedId
    ) {
      updateState(setTierListPublishedId(state, null));
    }

    setStatusMessage(
      document?.publishedId
        ? "Removed saved tier list and its public copy"
        : "Removed saved tier list",
    );
  };

  const handleResetBoardAndFilters = async () => {
    const ok = await unpublishPublishedCopy(state.publishedId);
    if (!ok) {
      return;
    }

    updateState(createDefaultTierListState());
    setFilters(DEFAULT_TIER_LIST_FILTERS);
    setSelectedPlayerId(null);
    setStatusMessage(
      state.publishedId
        ? "Board reset (previous public copy removed)"
        : "Board and filters reset",
    );
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

  const handleLoadMorePublic = async () => {
    if (publicLoadingMore || !publicHasMore) {
      return;
    }

    setPublicLoadingMore(true);
    const page = await fetchPublicTierLists({
      viewerPlayerId: identity.playerId,
      sort: publicSort,
      filters: publicFilters,
      offset: publicNextOffset,
    });
    setPublicLists((current) => {
      const seen = new Set(current.map((entry) => entry.id));
      const appended = page.lists.filter((entry) => !seen.has(entry.id));
      return [...current, ...appended];
    });
    setPublicHasMore(page.hasMore);
    setPublicNextOffset(page.nextOffset);
    setPublicLoadingMore(false);
  };

  const handleEditOwnedPublic = async (id: string) => {
    const detail = await fetchPublicTierList({
      id,
      viewerPlayerId: identity.playerId,
    });
    if (!detail || !detail.isOwner) {
      setStatusMessage("Could not open that tier list for editing");
      return;
    }

    const next: TierListState = {
      id: `tier-list-edit-${id}`,
      title: detail.title,
      tiers: detail.tiers,
      publishedId: detail.id,
    };
    const saved = saveTierListToLibrary(next, library);
    setState(saved.state);
    setLibrary(saved.library);
    setSelectedPlayerId(null);
    setView("editor");
    setStatusMessage(`Editing “${displayTierListTitle(detail.title)}”`);
  };

  const handleUnpublishOwnedPublic = async (id: string) => {
    const ok = await unpublishPublishedCopy(id);
    if (!ok) {
      return;
    }

    setPublicLists((current) => current.filter((entry) => entry.id !== id));
    if (viewerDetail?.id === id) {
      setViewerDetail(null);
      setView("public");
    }
    if (state.publishedId === id) {
      const nextState = setTierListPublishedId(state, null);
      const nextSaved = saveTierListToLibrary(nextState, library);
      setState(nextSaved.state);
      setLibrary(nextSaved.library);
    }
    setStatusMessage("Removed from public tier lists");
  };

  const handleCopyPublicLink = async (id: string) => {
    const shareUrl = buildPublicTierListShareUrl(id);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      setStatusMessage("Link copied");
    } catch {
      setStatusMessage(shareUrl);
    }
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
    if (view === "viewer") {
      setViewerDetail(null);
      setView("public");
      return;
    }
    setView("hub");
  };

  const renderPlayerChip = (
    player: Player,
    options: { inTier?: boolean; tierId?: string } = {},
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
        data-tier-player={options.inTier ? player.id : undefined}
        data-tier-id={options.inTier ? options.tierId : undefined}
        onPointerDown={(event) => handlePlayerPointerDown(event, player.id)}
        onContextMenu={(event) => event.preventDefault()}
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
          Create and share boards.
        </p>
      </div>

      {view !== "hub" ? (
        <HubFeatureReturnButton onBack={handleBack} label="Back" />
      ) : null}

      {statusMessage ? (
        <p className="tier-list__status" role="status">
          {statusMessage}
        </p>
      ) : null}

      {view === "hub" ? (
        <>
          <AccountRequiredNote>
            Create an account to publish public tier lists. Browsing stays open.
          </AccountRequiredNote>
          <TierListHubHome
            onCreate={() => void handleNew()}
            onOpenMine={() => setView("mine")}
            onOpenPublic={() => setView("public")}
          />
        </>
      ) : null}

      {view === "mine" ? (
        <TierListMinePanel
          library={library}
          sort={mineSort}
          onSortChange={setMineSort}
          likeCountByPublishedId={publishedLikeCounts}
          onOpen={handleOpenSaved}
          onDelete={(documentId) => void handleDeleteSaved(documentId)}
        />
      ) : null}

      {view === "public" ? (
        <TierListPublicPanel
          lists={publicLists}
          loading={publicLoading}
          loadingMore={publicLoadingMore}
          hasMore={publicHasMore}
          sort={publicSort}
          onSortChange={setPublicSort}
          filters={publicFilters}
          onFiltersChange={setPublicFilters}
          onOpen={handleOpenPublic}
          onToggleLike={handleToggleLike}
          onLoadMore={() => void handleLoadMorePublic()}
          onEditOwned={(id) => void handleEditOwnedPublic(id)}
          onUnpublishOwned={(id) => void handleUnpublishOwnedPublic(id)}
        />
      ) : null}

      {view === "viewer" && viewerDetail ? (
        <TierListPublicViewer
          detail={viewerDetail}
          playersById={playersById}
          onToggleLike={(liked) => handleToggleLike(viewerDetail.id, liked)}
          onCopyLink={() => void handleCopyPublicLink(viewerDetail.id)}
          onEditOwned={
            viewerDetail.isOwner
              ? () => void handleEditOwnedPublic(viewerDetail.id)
              : undefined
          }
          onUnpublishOwned={
            viewerDetail.isOwner
              ? () => void handleUnpublishOwnedPublic(viewerDetail.id)
              : undefined
          }
        />
      ) : null}

      {view === "editor" ? (
      <section className="hub-feature__panel tier-list">
        <div className="tier-list__toolbar">
          <div className="tier-list__toolbar-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleNew()}
            >
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
              onClick={() => void handleResetBoardAndFilters()}
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

            <div className="tier-list__filter-group">
              <span className="tier-list__filter-label">Height (in)</span>
              <div className="tier-list__age-range">
                <label className="tier-list__age-field">
                  <span>Min</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={48}
                    max={108}
                    placeholder="Any"
                    value={filters.heightMin ?? ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        heightMin: parseHeightBound(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className="tier-list__age-field">
                  <span>Max</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={48}
                    max={108}
                    placeholder="Any"
                    value={filters.heightMax ?? ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        heightMax: parseHeightBound(event.target.value),
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
              disabled={state.tiers.length >= TIER_LIST_MAX_TIERS}
              title={
                state.tiers.length >= TIER_LIST_MAX_TIERS
                  ? `Maximum of ${TIER_LIST_MAX_TIERS} tiers`
                  : "Add another tier row"
              }
              onClick={() => {
                if (state.tiers.length >= TIER_LIST_MAX_TIERS) {
                  setStatusMessage(`Maximum of ${TIER_LIST_MAX_TIERS} tiers`);
                  return;
                }
                updateState(addTier(state));
              }}
            >
              Add tier
            </button>
            <button type="button" className="secondary-button" onClick={handleSave}>
              Save
            </button>
            {state.publishedId ? (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={!accountLinked}
                  onClick={() => void handlePublish()}
                  title={
                    accountLinked
                      ? "Update the public copy with your latest edits"
                      : ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE
                  }
                >
                  Update
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleUnpublish()}
                >
                  Unpublish
                </button>
              </>
            ) : (
              <button
                type="button"
                className="secondary-button"
                disabled={!accountLinked}
                onClick={() => void handlePublish()}
                title={
                  accountLinked
                    ? "Publish to public tier lists"
                    : ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE
                }
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
        {!accountLinked && !state.publishedId ? (
          <AccountRequiredNote className="account-required-note--inline">
            Create an account to publish this list.
          </AccountRequiredNote>
        ) : null}

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
                      renderPlayerChip(player, {
                        inTier: true,
                        tierId: tier.id,
                      }),
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
