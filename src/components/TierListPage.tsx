import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
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
  recommendTierListTitle,
  countActiveTierListFilters,
  removeTier,
  renameTier,
  resolveTierListTitle,
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
  createTierListComment,
  deleteTierListComment,
  reportPublicTierList,
  DEFAULT_PUBLIC_TIER_LIST_FILTERS,
  fetchPublishedLikeCounts,
  fetchPublicTierList,
  fetchPublicTierLists,
  listTierListComments,
  publishTierList,
  setTierListLike,
  unpublishTierList,
  type PublicTierListBrowseFilters,
  type PublicTierListDetail,
  type PublicTierListSort,
  type PublicTierListSummary,
  type TierListComment,
} from "../lib/tierListCommunity";
import {
  createCommunityPost,
  deleteCommunityPost,
  fetchCommunityActivity,
  getCommunityPost,
  listCommunityPosts,
  peekLocalCommunityPosts,
  setCommunityPostLike,
  type CommunityPost,
  type CommunityPostFeedCursor,
  type CommunityPostSort,
} from "../lib/communityPosts";
import {
  loadCommunityShareables,
  type CommunityPostAttachment,
} from "../lib/communityShareables";
import { ensureClassicProfile } from "../lib/classicProfile";
import { ensureCurrentRankedSeason } from "../lib/rankedProfile";
import { fetchAccountStatus } from "../lib/accountApi";
import {
  ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE,
  ACCOUNT_REQUIRED_COMMUNITY_LIKE_MESSAGE,
  ACCOUNT_REQUIRED_COMMUNITY_POST_MESSAGE,
  ACCOUNT_REQUIRED_TIER_LIST_COMMENT_MESSAGE,
  ACCOUNT_REQUIRED_TIER_LIST_REPORT_MESSAGE,
  ACCOUNT_REQUIRED_TIER_LIST_COMMENT_DELETE_MESSAGE,
  ACCOUNT_REQUIRED_TIER_LIST_LIKE_MESSAGE,
  isPlayerAccountLinked,
  peekCachedAccountLinked,
  getCachedLinkedUsername,
  resolveAccountRequiredMessage,
  subscribeAccountLinkChanged,
} from "../lib/accountGate";
import { syncLandingDeepLinkUrl } from "../lib/landingHub";
import { isGameReturnPhase, readFeatureHistoryState } from "../lib/featureNavigation";
import { buildCommunityPostSocialMeta } from "../lib/communityPostSocialMeta";
import { applySocialMeta, resetSocialMeta } from "../lib/socialMeta";
import type { Player, Position } from "../lib/types";
import { AccountRequiredNote } from "./AccountRequiredNote";
import { ConfirmDialog } from "./ConfirmDialog";
import { ReportPostDialog } from "./ReportPostDialog";
import { HubPageChrome } from "./HubPageChrome";
import { PlayerTeamIcon } from "./PlayerTeamIcon";
import { useDialogA11y } from "../hooks/useDialogA11y";
import {
  TierListHubHome,
  TierListMinePanel,
  TierListPublicPanel,
  TierListPublicViewer,
  TierListTiersHub,
  CommunityPostsPanel,
} from "./TierListHubPanels";

interface TierListPageProps {
  players: Player[];
  /** Kept for App wiring; leaving the Community hub uses bottom nav, not Return. */
  onBack?: () => void;
  /** Deep-link public id from `?tierList=` — opens the viewer on mount. */
  initialPublicTierListId?: string | null;
  /** Deep-link community view from `?view=`. */
  initialCommunityView?: "posts" | "tiers" | null;
  /** Deep-link post id from `?post=` — opens Posts and focuses that item. */
  initialCommunityPostId?: string | null;
  /** Bumped when Community nav is selected — returns to the hub chooser. */
  hubReturnToken?: number;
  /** Bumped to open Posts compose with the latest results shareable attached. */
  composeIntentToken?: number;
  onOpenAccount?: () => void;
  onChallengeGm?: (
    mode: "classic" | "ranked",
    target?: { playerId: string; displayName?: string } | null,
  ) => void;
}

type TierListView =
  | "hub"
  | "tiersHub"
  | "editor"
  | "mine"
  | "public"
  | "viewer"
  | "posts";

type PendingConfirmAction =
  | { kind: "unpublish"; publishedId: string }
  | { kind: "deleteSaved"; documentId: string }
  | { kind: "deletePost"; postId: string };

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
  "#f97316", // orange
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
  initialCommunityView = null,
  initialCommunityPostId = null,
  hubReturnToken = 0,
  composeIntentToken = 0,
  onBack,
  onOpenAccount,
  onChallengeGm,
}: TierListPageProps) {
  const identity = useMemo(() => getOrCreatePlayerIdentity(), []);
  const accountRequiredMessage = (message: string) =>
    resolveAccountRequiredMessage(identity.playerId, message);
  const [view, setView] = useState<TierListView>(() => {
    if (initialPublicTierListId) {
      return "viewer";
    }
    if (initialCommunityPostId || initialCommunityView === "posts") {
      return "posts";
    }
    if (initialCommunityView === "tiers") {
      return "tiersHub";
    }
    return "hub";
  });
  const [state, setState] = useState<TierListState>(() => loadTierListState());
  const [library, setLibrary] = useState<TierListLibrary>(() =>
    loadTierListLibrary(),
  );
  const [filters, setFilters] = useState<TierListFilters>(DEFAULT_TIER_LIST_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState(`GM ${formatPublicTag(identity.publicTag)}`);
  const [accountLinked, setAccountLinked] = useState<boolean | null>(() =>
    peekCachedAccountLinked(identity.playerId),
  );
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
  const [viewerComments, setViewerComments] = useState<TierListComment[]>([]);
  const [viewerCommentsTotalCount, setViewerCommentsTotalCount] = useState(0);
  const [viewerCommentsHasMore, setViewerCommentsHasMore] = useState(false);
  const [viewerCommentsNextCursor, setViewerCommentsNextCursor] = useState<{
    beforeCreatedAt: string;
    beforeId: string;
  } | null>(null);
  const [viewerCommentsLoading, setViewerCommentsLoading] = useState(false);
  const [viewerCommentsLoadingMore, setViewerCommentsLoadingMore] =
    useState(false);
  const [viewerCommentDraft, setViewerCommentDraft] = useState("");
  const [viewerCommentSubmitting, setViewerCommentSubmitting] = useState(false);
  const [viewerCommentError, setViewerCommentError] = useState<string | null>(
    null,
  );
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() =>
    peekLocalCommunityPosts("recent"),
  );
  const [communityPostsLoading, setCommunityPostsLoading] = useState(false);
  const [communityPostsLoadingMore, setCommunityPostsLoadingMore] =
    useState(false);
  const [communityPostsHasMore, setCommunityPostsHasMore] = useState(false);
  const [communityPostsNextOffset, setCommunityPostsNextOffset] = useState(0);
  const [communityPostsNextCursor, setCommunityPostsNextCursor] =
    useState<CommunityPostFeedCursor | null>(null);
  const [communityPostDraft, setCommunityPostDraft] = useState("");
  const [communityPostSubmitting, setCommunityPostSubmitting] = useState(false);
  const [communityPostError, setCommunityPostError] = useState<string | null>(
    null,
  );
  const [communityPostLikeError, setCommunityPostLikeError] = useState<
    string | null
  >(null);
  const [communityPostSort, setCommunityPostSort] =
    useState<CommunityPostSort>("recent");
  const [communityShareables, setCommunityShareables] = useState<
    CommunityPostAttachment[]
  >(() => loadCommunityShareables());
  const [communityAttachment, setCommunityAttachment] =
    useState<CommunityPostAttachment | null>(null);
  const [communityPostsToday, setCommunityPostsToday] = useState<number | null>(
    null,
  );
  const [communityFocusPostId, setCommunityFocusPostId] = useState<string | null>(
    initialCommunityPostId,
  );
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmAction | null>(
    null,
  );
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(
    Boolean(initialPublicTierListId),
  );
  const [publicFiltersDraft, setPublicFiltersDraft] =
    useState<PublicTierListBrowseFilters>(DEFAULT_PUBLIC_TIER_LIST_FILTERS);
  const deepLinkHandledRef = useRef(false);
  const postDeepLinkHandledRef = useRef(false);
  const communityPostsLoadGenRef = useRef(0);
  const viewerCommentsLoadGenRef = useRef(0);
  const viewerCommentSubmittingRef = useRef(false);
  const communityPostsRef = useRef(communityPosts);
  communityPostsRef.current = communityPosts;
  const communityFocusPostIdRef = useRef(communityFocusPostId);
  // null until first effect — avoids skipping reset when nav bumps the token
  // in the same render that mounts this page.
  const hubReturnSeenRef = useRef<number | null>(null);
  const composeIntentSeenRef = useRef<number | null>(null);
  const dragSessionRef = useRef<PointerDragSession | null>(null);
  const suppressClickRef = useRef(false);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);
  const dragPointRef = useRef<{ x: number; y: number } | null>(null);
  const dropTargetRef = useRef<string | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const filterSheetPanelRef = useRef<HTMLDivElement | null>(null);
  const filterSheetDoneRef = useRef<HTMLButtonElement | null>(null);
  const showCommunityNewHereStrip = accountLinked !== true;

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
  }, []);

  useDialogA11y({
    open: filtersOpen,
    onClose: closeFilters,
    initialFocusRef: filterSheetDoneRef,
    containerRef: filterSheetPanelRef as RefObject<HTMLElement | null>,
    lockScroll: true,
  });

  const resetViewerCommentState = useCallback(() => {
    viewerCommentsLoadGenRef.current += 1;
    setViewerComments([]);
    setViewerCommentsTotalCount(0);
    setViewerCommentsHasMore(false);
    setViewerCommentsNextCursor(null);
    setViewerCommentsLoading(false);
    setViewerCommentsLoadingMore(false);
    setViewerCommentDraft("");
    setViewerCommentError(null);
    setViewerCommentSubmitting(false);
  }, []);

  useEffect(() => {
    if (hubReturnSeenRef.current === null) {
      hubReturnSeenRef.current = hubReturnToken;
      // Nav open bumps the token before mount — land on the hub chooser,
      // not a stale Posts/Tiers deep link from the first page load.
      if (hubReturnToken > 0) {
        setViewerDetail(null);
        setViewerLoading(false);
        resetViewerCommentState();
        setView("hub");
        setCommunityFocusPostId(null);
        syncLandingDeepLinkUrl({
          hub: "community",
          view: null,
          post: null,
          tierList: null,
        });
      }
      return;
    }
    if (hubReturnToken === hubReturnSeenRef.current) {
      return;
    }
    hubReturnSeenRef.current = hubReturnToken;
    setViewerDetail(null);
    setViewerLoading(false);
    resetViewerCommentState();
    setView("hub");
    setCommunityFocusPostId(null);
    syncLandingDeepLinkUrl({
      hub: "community",
      view: null,
      post: null,
      tierList: null,
    });
  }, [hubReturnToken, resetViewerCommentState]);

  useEffect(() => {
    if (composeIntentSeenRef.current === null) {
      composeIntentSeenRef.current = composeIntentToken;
      if (composeIntentToken <= 0) {
        return;
      }
    } else if (composeIntentToken === composeIntentSeenRef.current) {
      return;
    } else {
      composeIntentSeenRef.current = composeIntentToken;
    }

    if (composeIntentToken <= 0) {
      return;
    }

    setViewerDetail(null);
    setViewerLoading(false);
    resetViewerCommentState();
    setView("posts");
    setCommunityFocusPostId(null);
    const shareables = loadCommunityShareables();
    setCommunityShareables(shareables);
    setCommunityAttachment(shareables[0] ?? null);
    syncLandingDeepLinkUrl({
      hub: "community",
      view: "posts",
      post: null,
      tierList: null,
    });
  }, [composeIntentToken, resetViewerCommentState]);

  useEffect(() => {
    saveTierListState(state);
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      const cached = peekCachedAccountLinked(identity.playerId);
      const cachedUsername = getCachedLinkedUsername(identity.playerId);
      if (cached === true && cachedUsername) {
        setAccountLinked(true);
        setAuthorName(cachedUsername);
      } else if (cached === false) {
        setAccountLinked(false);
      }

      void fetchAccountStatus(identity.playerId).then((result) => {
        if (cancelled) {
          return;
        }
        if (result.ok && result.status.authenticated) {
          if (result.status.username) {
            setAuthorName(result.status.username);
          }
          setAccountLinked(true);
          return;
        }
        // Back-compat: older status payloads only returned username with a session.
        if (
          result.ok &&
          result.status.linked &&
          result.status.username &&
          result.status.authenticated !== false
        ) {
          setAuthorName(result.status.username);
          setAccountLinked(true);
          return;
        }
        setAccountLinked(false);
      });
    };

    refresh();
    const unsubscribe = subscribeAccountLinkChanged(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [identity.playerId]);

  useEffect(() => {
    communityFocusPostIdRef.current = communityFocusPostId;
  }, [communityFocusPostId]);

  useEffect(() => {
    if (view !== "posts" || !communityFocusPostId) {
      resetSocialMeta();
      return;
    }

    const post = communityPosts.find((entry) => entry.id === communityFocusPostId);
    if (!post) {
      return;
    }

    applySocialMeta(
      buildCommunityPostSocialMeta(
        {
          id: post.id,
          authorName: post.authorName,
          authorTag: post.authorTag,
          body: post.body,
          attachment: post.attachment,
        },
        `${window.location.origin}${window.location.pathname}${window.location.search}`,
      ),
    );

    return () => {
      resetSocialMeta();
    };
  }, [communityFocusPostId, communityPosts, view]);

  const mergeCommunityPostsWithFocus = useCallback(
    (pagePosts: CommunityPost[], current: CommunityPost[]) => {
      const focusedId = communityFocusPostIdRef.current;
      if (!focusedId) {
        return pagePosts;
      }

      if (pagePosts.some((post) => post.id === focusedId)) {
        return pagePosts;
      }

      const focusedPost = current.find((post) => post.id === focusedId);
      return focusedPost ? [focusedPost, ...pagePosts] : pagePosts;
    },
    [],
  );

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

    const timer = window.setTimeout(() => {
      setPublicFilters((current) => {
        const same =
          current.query === publicFiltersDraft.query &&
          current.mineOnly === publicFiltersDraft.mineOnly &&
          current.likedByMe === publicFiltersDraft.likedByMe &&
          current.minLikes === publicFiltersDraft.minLikes &&
          current.dateWindow === publicFiltersDraft.dateWindow;
        return same ? current : publicFiltersDraft;
      });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [publicFiltersDraft, view]);

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

  const recommendedTitle = useMemo(
    () => recommendTierListTitle(filters),
    [filters],
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

  const withResolvedTitle = (current: TierListState): TierListState => {
    const resolved = resolveTierListTitle(current.title, filters);
    if (!resolved || resolved === current.title.trim()) {
      return current;
    }
    return setTierListTitle(current, resolved);
  };

  const handleSave = () => {
    const titled = withResolvedTitle(state);
    const result = saveTierListToLibrary(titled, library);
    setState(result.state);
    setLibrary(result.library);
    setStatusMessage(
      titled.title !== state.title.trim() && titled.title
        ? `Saved as “${titled.title}”`
        : "Tier list saved",
    );
  };

  const handlePublish = async () => {
    if (!(await isPlayerAccountLinked(identity.playerId))) {
      setAccountLinked(false);
      setStatusMessage(accountRequiredMessage(ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE));
      return;
    }

    setAccountLinked(true);
    const titled = withResolvedTitle(state);
    const saved = saveTierListToLibrary(titled, library);
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

  const handleUnpublish = () => {
    if (!state.publishedId) {
      return;
    }

    setPendingConfirm({ kind: "unpublish", publishedId: state.publishedId });
  };

  const handleDownload = async () => {
    try {
      const titled = withResolvedTitle(state);
      if (titled.title && titled.title !== state.title.trim()) {
        setState(titled);
      }

      let missingCount = 0;
      const tiers = titled.tiers.map((tier, index) => {
        const players = tier.playerIds
          .map((playerId) => resolvePlayer(playerId))
          .filter((player): player is Player => player != null);
        missingCount += Math.max(0, tier.playerIds.length - players.length);
        return {
          name: tier.name,
          accent: accentForTier(index, tier.name),
          players: players.map((player) => ({
            name: player.name,
            team: player.team,
            bbrPlayerId: player.bbrPlayerId,
          })),
        };
      });

      await downloadTierListImage(
        {
          title: displayTierListTitle(titled.title),
          tiers,
        },
        "png",
      );
      setStatusMessage(
        missingCount > 0
          ? `Downloaded — ${missingCount} player${missingCount === 1 ? "" : "s"} missing from roster`
          : "Image download started",
      );
    } catch {
      setStatusMessage("Could not download image");
    }
  };

  const handleDownloadPublic = async (detail: PublicTierListDetail) => {
    try {
      let missingCount = 0;
      const tiers = detail.tiers.map((tier, index) => {
        const players = tier.playerIds
          .map((playerId) => resolvePlayer(playerId))
          .filter((player): player is Player => player != null);
        missingCount += Math.max(0, tier.playerIds.length - players.length);
        return {
          name: tier.name,
          accent: accentForTier(index, tier.name),
          players: players.map((player) => ({
            name: player.name,
            team: player.team,
            bbrPlayerId: player.bbrPlayerId,
          })),
        };
      });

      await downloadTierListImage(
        {
          title: displayTierListTitle(detail.title),
          tiers,
        },
        "png",
      );
      setStatusMessage(
        missingCount > 0
          ? `Downloaded — ${missingCount} player${missingCount === 1 ? "" : "s"} missing from roster`
          : "Image download started",
      );
    } catch {
      setStatusMessage("Could not download image");
    }
  };

  const loadViewerComments = useCallback(async (id: string) => {
    const loadGen = ++viewerCommentsLoadGenRef.current;
    setViewerCommentsLoading(true);
    setViewerCommentError(null);
    try {
      const page = await listTierListComments({ id });
      if (viewerCommentsLoadGenRef.current !== loadGen) {
        return;
      }
      setViewerComments(page.comments);
      setViewerCommentsTotalCount(page.totalCount);
      setViewerCommentsHasMore(page.hasMore);
      setViewerCommentsNextCursor(page.nextCursor);
    } catch {
      if (viewerCommentsLoadGenRef.current !== loadGen) {
        return;
      }
      setViewerComments([]);
      setViewerCommentsTotalCount(0);
      setViewerCommentsHasMore(false);
      setViewerCommentsNextCursor(null);
      setViewerCommentError("Could not load comments");
    } finally {
      if (viewerCommentsLoadGenRef.current === loadGen) {
        setViewerCommentsLoading(false);
      }
    }
  }, []);

  const loadOlderViewerComments = useCallback(async () => {
    if (!viewerDetail) {
      return;
    }
    if (
      !viewerCommentsHasMore ||
      !viewerCommentsNextCursor ||
      viewerCommentsLoadingMore
    ) {
      return;
    }
    const loadGen = viewerCommentsLoadGenRef.current;
    setViewerCommentsLoadingMore(true);
    setViewerCommentError(null);
    try {
      const page = await listTierListComments({
        id: viewerDetail.id,
        cursor: viewerCommentsNextCursor,
      });
      if (viewerCommentsLoadGenRef.current !== loadGen) {
        return;
      }
      setViewerComments((current) => [...page.comments, ...current]);
      setViewerCommentsTotalCount(page.totalCount);
      setViewerCommentsHasMore(page.hasMore);
      setViewerCommentsNextCursor(page.nextCursor);
    } catch {
      if (viewerCommentsLoadGenRef.current !== loadGen) {
        return;
      }
      setViewerCommentError("Could not load older comments");
    } finally {
      if (viewerCommentsLoadGenRef.current === loadGen) {
        setViewerCommentsLoadingMore(false);
      }
    }
  }, [
    viewerCommentsHasMore,
    viewerCommentsLoadingMore,
    viewerCommentsNextCursor,
    viewerDetail,
  ]);

  useEffect(() => {
    if (!initialPublicTierListId || deepLinkHandledRef.current) {
      return;
    }

    deepLinkHandledRef.current = true;
    let cancelled = false;
    setViewerLoading(true);
    resetViewerCommentState();
    setView("viewer");
    syncLandingDeepLinkUrl({
      hub: "community",
      view: "tiers",
      post: null,
      tierList: initialPublicTierListId,
    });
    void fetchPublicTierList({
      id: initialPublicTierListId,
      viewerPlayerId: identity.playerId,
    }).then((detail) => {
      if (cancelled) {
        return;
      }
      if (!detail) {
        setViewerDetail(null);
        setViewerLoading(false);
        setView("public");
        syncLandingDeepLinkUrl({
          hub: "community",
          view: "tiers",
          post: null,
          tierList: null,
        });
        setStatusMessage("That shared tier list could not be found");
        return;
      }
      setViewerDetail(detail);
      setViewerLoading(false);
      setView("viewer");
      void loadViewerComments(detail.id);
    });

    return () => {
      cancelled = true;
    };
  }, [
    initialPublicTierListId,
    identity.playerId,
    loadViewerComments,
    resetViewerCommentState,
  ]);

  const handleSubmitViewerComment = async () => {
    if (!viewerDetail) {
      return;
    }
    const targetId = viewerDetail.id;
    if (accountLinked !== true) {
      setViewerCommentError(accountRequiredMessage(ACCOUNT_REQUIRED_TIER_LIST_COMMENT_MESSAGE));
      return;
    }

    const body = viewerCommentDraft.trim();
    if (!body) {
      return;
    }

    if (viewerCommentSubmittingRef.current || viewerCommentSubmitting) {
      return;
    }

    viewerCommentSubmittingRef.current = true;
    setViewerCommentSubmitting(true);
    setViewerCommentError(null);
    const submitGen = ++viewerCommentsLoadGenRef.current;

    try {
      const result = await createTierListComment({
        id: targetId,
        playerId: identity.playerId,
        authorName:
          authorName.trim() || `GM ${formatPublicTag(identity.publicTag)}`,
        authorTag: identity.publicTag,
        body,
      });

      if (viewerCommentsLoadGenRef.current !== submitGen) {
        return;
      }

      if (!result.ok) {
        setViewerCommentError(result.error);
        return;
      }

      if (result.comment.tierListId !== targetId) {
        return;
      }

      setViewerComments((current) => {
        if (current.some((entry) => entry.id === result.comment.id)) {
          return current;
        }
        return [...current, result.comment];
      });
      setViewerCommentsTotalCount((current) => current + 1);
      setViewerCommentDraft("");
    } finally {
      if (viewerCommentsLoadGenRef.current === submitGen) {
        viewerCommentSubmittingRef.current = false;
        setViewerCommentSubmitting(false);
      }
    }
  };

  const handleOpenReportDialog = () => {
    if (accountLinked !== true) {
      setStatusMessage(accountRequiredMessage(ACCOUNT_REQUIRED_TIER_LIST_REPORT_MESSAGE));
      return;
    }
    setReportError(null);
    setReportDialogOpen(true);
  };

  const handleSubmitTierListReport = async (reason: string) => {
    if (!viewerDetail || reportBusy) {
      return;
    }
    setReportBusy(true);
    setReportError(null);
    const result = await reportPublicTierList({
      id: viewerDetail.id,
      playerId: identity.playerId,
      reason,
    });
    setReportBusy(false);
    if (!result.ok) {
      setReportError(result.error);
      if (result.accountRequired) {
        setStatusMessage(result.error);
      }
      return;
    }
    setReportDialogOpen(false);
    setStatusMessage("Thanks — report submitted.");
  };

  const handleDeleteViewerComment = async (commentId: string) => {
    if (!viewerDetail) {
      return;
    }
    if (accountLinked !== true) {
      setViewerCommentError(accountRequiredMessage(ACCOUNT_REQUIRED_TIER_LIST_COMMENT_DELETE_MESSAGE));
      return;
    }

    const result = await deleteTierListComment({
      id: viewerDetail.id,
      commentId,
      playerId: identity.playerId,
    });
    if (!result.ok) {
      setViewerCommentError(result.error);
      return;
    }

    setViewerComments((current) =>
      current.filter((comment) => comment.id !== commentId),
    );
    setViewerCommentsTotalCount((current) => Math.max(0, current - 1));
    setViewerCommentError(null);
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

  const handleDeleteSaved = (documentId: string) => {
    setPendingConfirm({ kind: "deleteSaved", documentId });
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
    setViewerLoading(true);
    setViewerDetail(null);
    resetViewerCommentState();
    setView("viewer");
    syncLandingDeepLinkUrl({
      hub: "community",
      view: "tiers",
      post: null,
      tierList: id,
    });
    const detail = await fetchPublicTierList({
      id,
      viewerPlayerId: identity.playerId,
    });
    if (!detail) {
      setViewerLoading(false);
      setView("public");
      syncLandingDeepLinkUrl({
        hub: "community",
        view: "tiers",
        post: null,
        tierList: null,
      });
      setStatusMessage("Could not open that tier list");
      return;
    }
    setViewerDetail(detail);
    setViewerLoading(false);
    void loadViewerComments(detail.id);
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

  const handleUnpublishOwnedPublic = (id: string) => {
    setPendingConfirm({ kind: "unpublish", publishedId: id });
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
    if (accountLinked !== true) {
      setStatusMessage(accountRequiredMessage(ACCOUNT_REQUIRED_TIER_LIST_LIKE_MESSAGE));
      return;
    }
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

  const syncCommunityDeepLink = useCallback(
    (next: TierListView, postId: string | null = null, tierListId: string | null = null) => {
      if (next === "hub") {
        syncLandingDeepLinkUrl({
          hub: "community",
          view: null,
          post: null,
          tierList: null,
        });
        return;
      }
      if (next === "posts") {
        syncLandingDeepLinkUrl({
          hub: "community",
          view: "posts",
          post: postId,
          tierList: null,
        });
        return;
      }
      if (next === "viewer") {
        syncLandingDeepLinkUrl({
          hub: "community",
          view: "tiers",
          post: null,
          tierList: tierListId,
        });
        return;
      }
      if (
        next === "tiersHub" ||
        next === "mine" ||
        next === "public" ||
        next === "editor"
      ) {
        syncLandingDeepLinkUrl({
          hub: "community",
          view: "tiers",
          post: null,
          tierList: null,
        });
      }
    },
    [],
  );

  const handleBack = () => {
    const returnTo = readFeatureHistoryState()?.returnTo;
    if (
      isGameReturnPhase(returnTo) &&
      onBack &&
      (view === "posts" || view === "hub")
    ) {
      onBack();
      return;
    }

    if (view === "viewer") {
      setViewerDetail(null);
      setViewerLoading(false);
      resetViewerCommentState();
      setView("public");
      syncCommunityDeepLink("public");
      return;
    }
    if (view === "mine" || view === "public" || view === "editor") {
      setView("tiersHub");
      syncCommunityDeepLink("tiersHub");
      return;
    }
    if (view === "tiersHub" || view === "posts") {
      setView("hub");
      syncCommunityDeepLink("hub");
      return;
    }
    setView("hub");
    syncCommunityDeepLink("hub");
  };

  const openCommunityView = (next: TierListView) => {
    setView(next);
    if (next !== "posts") {
      setCommunityFocusPostId(null);
    }
    syncCommunityDeepLink(next, next === "posts" ? communityFocusPostId : null);
  };

  const returningToMatchResults = isGameReturnPhase(
    readFeatureHistoryState()?.returnTo,
  );

  const communityChrome = (() => {
    switch (view) {
      case "posts":
        return {
          title: "Posts",
          lede: "Anyone can read. Sign in to post",
          back: returningToMatchResults ? "Matchup results" : "Community",
        };
      case "tiersHub":
        return {
          title: "Tier lists",
          lede: "Browse public boards. Sign in to publish",
          back: "Community",
        };
      case "public":
        return {
          title: "Public tier lists",
          lede: "Browse and like community boards",
          back: "Tier lists",
        };
      case "mine":
        return {
          title: "My tier lists",
          lede: "Open or delete lists on this device",
          back: "Tier lists",
        };
      case "editor":
        return {
          title: "Create a list",
          lede: "Build a board, then publish when ready",
          back: "Tier lists",
        };
      case "viewer":
        return {
          title: "Public tier lists",
          lede: "Browse and like community boards",
          back: "Public lists",
        };
      default:
        return {
          title: "Community",
          lede: "Read takes, results, and public lists",
          back: "Back",
        };
    }
  })();

  useEffect(() => {
    if (view !== "posts" && view !== "hub") {
      return;
    }
    let cancelled = false;
    void fetchCommunityActivity().then((activity) => {
      if (!cancelled) {
        setCommunityPostsToday(activity.postsToday);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(() => {
    if (!initialCommunityPostId || postDeepLinkHandledRef.current) {
      return;
    }
    postDeepLinkHandledRef.current = true;
    setView("posts");
    setCommunityFocusPostId(initialCommunityPostId);
    syncLandingDeepLinkUrl({
      hub: "community",
      view: "posts",
      post: initialCommunityPostId,
    });
    void getCommunityPost({
      postId: initialCommunityPostId,
      playerId: identity.playerId,
    }).then((post) => {
      if (!post) {
        setStatusMessage("Post not found");
        return;
      }
      setCommunityPosts((current) => {
        if (current.some((entry) => entry.id === post.id)) {
          return current;
        }
        return [post, ...current];
      });
    });
  }, [identity.playerId, initialCommunityPostId]);

  const loadCommunityPosts = useCallback(async () => {
    const generation = communityPostsLoadGenRef.current + 1;
    communityPostsLoadGenRef.current = generation;
    if (communityPostsRef.current.length === 0) {
      const local = peekLocalCommunityPosts(communityPostSort);
      if (local.length > 0) {
        setCommunityPosts(local);
      } else {
        setCommunityPostsLoading(true);
      }
    }
    setCommunityPostError(null);
    setCommunityPostLikeError(null);
    try {
      const page = await listCommunityPosts({
        sort: communityPostSort,
        playerId: identity.playerId,
        offset: 0,
      });
      if (generation !== communityPostsLoadGenRef.current) {
        return;
      }
      setCommunityPosts((current) =>
        mergeCommunityPostsWithFocus(page.posts, current),
      );
      setCommunityPostsHasMore(page.hasMore);
      setCommunityPostsNextOffset(page.nextOffset);
      setCommunityPostsNextCursor(page.nextCursor);
    } finally {
      if (generation === communityPostsLoadGenRef.current) {
        setCommunityPostsLoading(false);
      }
    }
  }, [
    communityPostSort,
    identity.playerId,
    mergeCommunityPostsWithFocus,
  ]);

  const handleLoadMoreCommunityPosts = useCallback(async () => {
    if (communityPostsLoadingMore || !communityPostsHasMore) {
      return;
    }
    setCommunityPostsLoadingMore(true);
    try {
      const page = await listCommunityPosts({
        sort: communityPostSort,
        playerId: identity.playerId,
        offset: communityPostsNextOffset,
        cursor: communityPostsNextCursor,
      });
      setCommunityPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        return [
          ...current,
          ...page.posts.filter((post) => !seen.has(post.id)),
        ];
      });
      setCommunityPostsHasMore(page.hasMore);
      setCommunityPostsNextOffset(page.nextOffset);
      setCommunityPostsNextCursor(page.nextCursor);
    } finally {
      setCommunityPostsLoadingMore(false);
    }
  }, [
    communityPostSort,
    communityPostsHasMore,
    communityPostsLoadingMore,
    communityPostsNextCursor,
    communityPostsNextOffset,
    identity.playerId,
  ]);

  useEffect(() => {
    if (view !== "posts") {
      return;
    }
    const recent = loadCommunityShareables();
    const publishedLists = library.documents
      .filter((document) => Boolean(document.publishedId))
      .map((document) => ({
        kind: "tierList" as const,
        title: displayTierListTitle(document.title),
        publishedId: document.publishedId!,
        savedAt: new Date(document.savedAt).toISOString(),
      }));
    const merged = [
      ...publishedLists,
      ...recent.filter((entry) => entry.kind !== "tierList"),
    ];
    setCommunityShareables(merged);
    void loadCommunityPosts();
  }, [library.documents, loadCommunityPosts, view]);

  const handleCreateCommunityPost = async () => {
    if (accountLinked !== true) {
      setCommunityPostError(accountRequiredMessage(ACCOUNT_REQUIRED_COMMUNITY_POST_MESSAGE));
      return;
    }
    setCommunityPostSubmitting(true);
    setCommunityPostError(null);
    const classicElo = ensureClassicProfile().elo;
    const rankedElo = ensureCurrentRankedSeason().elo;
    const result = await createCommunityPost({
      playerId: identity.playerId,
      authorName,
      authorTag: identity.publicTag,
      body: communityPostDraft,
      attachment: communityAttachment,
      authorClassicElo: classicElo,
      authorRankedElo: rankedElo,
    });
    setCommunityPostSubmitting(false);

    if (!result.ok) {
      setCommunityPostError(result.error);
      return;
    }

    setCommunityPostDraft("");
    setCommunityAttachment(null);
    setCommunityPosts((current) => [
      result.post,
      ...current.filter((post) => post.id !== result.post.id),
    ]);
  };

  const handleToggleCommunityPostLike = async (
    postId: string,
    liked: boolean,
  ) => {
    if (accountLinked !== true) {
      setCommunityPostLikeError(accountRequiredMessage(ACCOUNT_REQUIRED_COMMUNITY_LIKE_MESSAGE));
      return;
    }
    setCommunityPostLikeError(null);
    const result = await setCommunityPostLike({
      playerId: identity.playerId,
      postId,
      liked,
    });
    if (!result.ok) {
      setCommunityPostLikeError(result.error);
      return;
    }
    setCommunityPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              likedByViewer: result.liked,
              likeCount: result.likeCount,
            }
          : post,
      ),
    );
  };

  const handleDeleteCommunityPost = (postId: string) => {
    setPendingConfirm({ kind: "deletePost", postId });
  };

  const runPendingConfirm = async () => {
    if (!pendingConfirm || confirmBusy) {
      return;
    }

    setConfirmBusy(true);
    try {
      if (pendingConfirm.kind === "deletePost") {
        setCommunityPostLikeError(null);
        const result = await deleteCommunityPost({
          playerId: identity.playerId,
          postId: pendingConfirm.postId,
        });
        if (!result.ok) {
          setCommunityPostLikeError(result.error);
          return;
        }
        setCommunityPosts((current) =>
          current.filter((post) => post.id !== pendingConfirm.postId),
        );
        if (communityFocusPostId === pendingConfirm.postId) {
          setCommunityFocusPostId(null);
        }
        setStatusMessage("Post deleted");
        setPendingConfirm(null);
        return;
      }

      if (pendingConfirm.kind === "unpublish") {
        const publishedId = pendingConfirm.publishedId;
        const result = await unpublishTierList({
          id: publishedId,
          playerId: identity.playerId,
        });

        if (!result.ok) {
          setStatusMessage(result.error);
          return;
        }

        if (state.publishedId === publishedId) {
          const nextState = setTierListPublishedId(state, null);
          const nextSaved = saveTierListToLibrary(nextState, library);
          setState(nextSaved.state);
          setLibrary(nextSaved.library);
        }

        setPublicLists((current) =>
          current.filter((entry) => entry.id !== publishedId),
        );
        if (viewerDetail?.id === publishedId) {
          setViewerDetail(null);
          resetViewerCommentState();
          setView("public");
          syncLandingDeepLinkUrl({
            hub: "community",
            view: "tiers",
            post: null,
            tierList: null,
          });
        }
        setStatusMessage("Removed from public tier lists");
        setPendingConfirm(null);
        return;
      }

      const document = library.documents.find(
        (entry) => entry.id === pendingConfirm.documentId,
      );
      const ok = await unpublishPublishedCopy(document?.publishedId);
      if (!ok) {
        return;
      }

      const nextLibrary = deleteTierListFromLibrary(
        pendingConfirm.documentId,
        library,
      );
      setLibrary(nextLibrary);

      if (state.id === pendingConfirm.documentId) {
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
      setPendingConfirm(null);
    } finally {
      setConfirmBusy(false);
    }
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
        <PlayerTeamIcon
          team={player.team}
          position={player.position}
          jerseyNumber={player.jerseyNumber}
          bbrPlayerId={player.bbrPlayerId}
          showJersey
          label={player.name}
        />
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

  const activeFilterCount = countActiveTierListFilters(filters);
  const activeFilterSummary =
    recommendTierListTitle(filters) || "All players";

  return (
    <HubPageChrome
      className="tier-list-page"
      title={communityChrome.title}
      lede={communityChrome.lede}
      onBack={view !== "hub" ? handleBack : undefined}
      backLabel={communityChrome.back}
    >
      {statusMessage ? (
        <p className="tier-list__status" role="status">
          {statusMessage}
        </p>
      ) : null}

      {view === "hub" ? (
        <TierListHubHome
          onOpenPosts={() => openCommunityView("posts")}
          onOpenTiers={() => openCommunityView("tiersHub")}
          postsToday={communityPostsToday}
          showNewHereStrip={showCommunityNewHereStrip}
        />
      ) : null}

      {view === "tiersHub" ? (
        <>
          <TierListTiersHub
            onCreate={() => void handleNew()}
            onOpenMine={() => openCommunityView("mine")}
            onOpenPublic={() => openCommunityView("public")}
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
          onCreate={() => void handleNew()}
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
          filters={publicFiltersDraft}
          onFiltersChange={setPublicFiltersDraft}
          onOpen={(id) => void handleOpenPublic(id)}
          onToggleLike={handleToggleLike}
          onLoadMore={() => void handleLoadMorePublic()}
          onEditOwned={(id) => void handleEditOwnedPublic(id)}
          onUnpublishOwned={(id) => void handleUnpublishOwnedPublic(id)}
          onClearFilters={() =>
            setPublicFiltersDraft(DEFAULT_PUBLIC_TIER_LIST_FILTERS)
          }
          onCreate={() => void handleNew()}
          accountLinked={accountLinked}
        />
      ) : null}

      {view === "viewer" && viewerLoading ? (
        <p className="hub-empty" role="status">
          Loading…
        </p>
      ) : null}

      {view === "viewer" && viewerDetail && !viewerLoading ? (
        <TierListPublicViewer
          detail={viewerDetail}
          playersById={playersById}
          onToggleLike={(liked) => handleToggleLike(viewerDetail.id, liked)}
          onCopyLink={() => void handleCopyPublicLink(viewerDetail.id)}
          onDownload={() => void handleDownloadPublic(viewerDetail)}
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
          accountLinked={accountLinked}
          comments={viewerComments}
          commentsTotalCount={viewerCommentsTotalCount}
          commentsHasMore={viewerCommentsHasMore}
          commentsLoading={viewerCommentsLoading}
          commentsLoadingMore={viewerCommentsLoadingMore}
          onLoadOlderComments={() => void loadOlderViewerComments()}
          commentDraft={viewerCommentDraft}
          onCommentDraftChange={setViewerCommentDraft}
          onSubmitComment={() => void handleSubmitViewerComment()}
          commentSubmitting={viewerCommentSubmitting}
          commentError={viewerCommentError}
          onSignIn={onOpenAccount}
          viewerPlayerId={identity.playerId}
          onDeleteComment={(commentId) =>
            void handleDeleteViewerComment(commentId)
          }
          onReport={
            viewerDetail.isOwner ? undefined : handleOpenReportDialog
          }
        />
      ) : null}

      {reportDialogOpen && viewerDetail ? (
        <ReportPostDialog
          postId={viewerDetail.id}
          busy={reportBusy}
          error={reportError}
          onSubmit={handleSubmitTierListReport}
          onClose={() => {
            if (reportBusy) {
              return;
            }
            setReportDialogOpen(false);
            setReportError(null);
          }}
        />
      ) : null}

      {view === "posts" ? (
        <CommunityPostsPanel
          posts={communityPosts}
          loading={communityPostsLoading}
          loadingMore={communityPostsLoadingMore}
          hasMore={communityPostsHasMore}
          onLoadMore={handleLoadMoreCommunityPosts}
          draft={communityPostDraft}
          onDraftChange={setCommunityPostDraft}
          submitting={communityPostSubmitting}
          error={communityPostError}
          likeError={communityPostLikeError}
          onSubmit={() => void handleCreateCommunityPost()}
          accountLinked={accountLinked}
          sort={communityPostSort}
          onSortChange={setCommunityPostSort}
          shareables={communityShareables}
          selectedAttachment={communityAttachment}
          onSelectAttachment={setCommunityAttachment}
          onToggleLike={(postId, liked) =>
            void handleToggleCommunityPostLike(postId, liked)
          }
          onDeletePost={(postId) => void handleDeleteCommunityPost(postId)}
          viewerPlayerId={identity.playerId}
          authorName={authorName}
          authorTag={identity.publicTag}
          onOpenTiers={() => openCommunityView("tiersHub")}
          onOpenPublishedTierList={(publishedId) =>
            void handleOpenPublic(publishedId)
          }
          playersById={playersById}
          focusPostId={communityFocusPostId}
          postsToday={communityPostsToday}
          onSignIn={onOpenAccount}
          onChallengeAuthor={onChallengeGm}
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

        <div className="tier-list__filter-bar">
          <button
            type="button"
            className="tier-list__filter-bar-button"
            aria-expanded={filtersOpen}
            aria-controls="tier-list-filters-sheet"
            onClick={() => setFiltersOpen(true)}
          >
            Filters
            {activeFilterCount > 0 ? (
              <span className="tier-list__filter-bar-count">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
          <p className="tier-list__filter-bar-summary">{activeFilterSummary}</p>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              className="tier-list__filter-bar-clear"
              onClick={() => setFilters(DEFAULT_TIER_LIST_FILTERS)}
            >
              Clear
            </button>
          ) : null}
        </div>

        {filtersOpen
          ? createPortal(
              <div
                className="tier-list__filter-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tier-list-filters-title"
                id="tier-list-filters-sheet"
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    closeFilters();
                  }
                }}
              >
            <div
              ref={filterSheetPanelRef}
              className="tier-list__filter-sheet__panel"
            >
              <div className="tier-list__filter-sheet__header">
                <h2 id="tier-list-filters-title">Player filters</h2>
                <button
                  type="button"
                  ref={filterSheetDoneRef}
                  className="secondary-button"
                  onClick={closeFilters}
                >
                  Done
                </button>
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
              <div className="tier-list__filter-sheet__footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setFilters(DEFAULT_TIER_LIST_FILTERS)}
                >
                  Reset filters
                </button>
                <button
                  type="button"
                  className="landing__primary-button"
                  onClick={closeFilters}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>,
              document.body,
            )
          : null}

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
              placeholder={recommendedTitle || DEFAULT_TIER_LIST_TITLE}
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
                  disabled={accountLinked !== true}
                  onClick={() => void handlePublish()}
                  title={
                    accountLinked === true
                      ? "Update the public copy with your latest edits"
                      : accountRequiredMessage(ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE)
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
                disabled={accountLinked !== true}
                onClick={() => void handlePublish()}
                title={
                  accountLinked === true
                    ? "Publish to public tier lists"
                    : accountRequiredMessage(ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE)
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
        {accountLinked === false && !state.publishedId ? (
          <AccountRequiredNote className="account-required-note--inline">
            {accountRequiredMessage(ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE)}
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

      {pendingConfirm ? (
        <ConfirmDialog
          title={
            pendingConfirm.kind === "deletePost"
              ? "Delete post?"
              : pendingConfirm.kind === "deleteSaved"
                ? library.documents.find(
                    (entry) => entry.id === pendingConfirm.documentId,
                  )?.publishedId
                  ? "Delete tier list?"
                  : "Delete saved list?"
                : "Unpublish tier list?"
          }
          message={
            pendingConfirm.kind === "deletePost"
              ? "This can’t be undone."
              : pendingConfirm.kind === "deleteSaved"
                ? library.documents.find(
                    (entry) => entry.id === pendingConfirm.documentId,
                  )?.publishedId
                  ? "Delete this tier list and remove its public copy?"
                  : "Delete this saved tier list?"
                : "Unpublish this tier list from Community?"
          }
          confirmLabel={
            pendingConfirm.kind === "deletePost"
              ? "Delete post"
              : pendingConfirm.kind === "deleteSaved"
                ? "Delete"
                : "Unpublish"
          }
          danger
          busy={confirmBusy}
          onConfirm={() => void runPendingConfirm()}
          onClose={() => {
            if (!confirmBusy) {
              setPendingConfirm(null);
            }
          }}
        />
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
          <PlayerTeamIcon
            team={draggingPlayer.team}
            position={draggingPlayer.position}
            jerseyNumber={draggingPlayer.jerseyNumber}
            bbrPlayerId={draggingPlayer.bbrPlayerId}
            showJersey
            label={draggingPlayer.name}
          />
          <span className="tier-list__player-copy">
            <strong>{draggingPlayer.name}</strong>
            <span>
              {draggingPlayer.team} · {draggingPlayer.position}
            </span>
          </span>
        </div>
      ) : null}
    </HubPageChrome>
  );
}
