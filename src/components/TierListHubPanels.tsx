import type { Player } from "../lib/types";
import {
  formatPublicTierListTime,
  TIER_LIST_COMMENT_BODY_MAX,
  type PublicTierListBrowseFilters,
  type PublicTierListDateWindow,
  type PublicTierListDetail,
  type PublicTierListSort,
  type PublicTierListSummary,
  type TierListComment,
} from "../lib/tierListCommunity";
import {
  COMMUNITY_POST_BODY_MAX,
  COMMUNITY_REPLY_BODY_MAX,
  createCommunityPostReply,
  deleteCommunityReply,
  formatCommunityPostTime,
  listCommunityPostReplies,
  reportCommunityPost,
  type CommunityPost,
  type CommunityPostReply,
  type CommunityPostSort,
} from "../lib/communityPosts";
import {
  loadMutedPlayerIds,
  mutePlayerId,
} from "../lib/communityMute";
import {
  buildMatchupShareCardInputsFromAttachment,
  buildShareCardInputFromAttachment,
  communityMatchupAttachmentViewLabel,
  communityMatchupViewerToggleLabel,
  formatCommunityActivityStrip,
  formatCommunityAttachmentChip,
  formatCommunityAttachmentSummary,
  formatCommunityMatchupDetails,
  formatMissingPlayersShareWarning,
  type CommunityPostAttachment,
} from "../lib/communityShareables";
import {
  createLineupShareCardBlob,
  createMatchupShareCardBlob,
} from "../lib/lineupShareCard";
import { buildCommunityPostShareUrl } from "../lib/landingHub";
import { copyToClipboard } from "../lib/copyToClipboard";
import {
  ACCOUNT_REQUIRED_COMMUNITY_ENGAGE_MESSAGE,
  ACCOUNT_REQUIRED_TIER_LIST_COMMENT_MESSAGE,
} from "../lib/accountGate";
import { formatPublicTag } from "../lib/playerIdentity";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { EmptyState } from "./EmptyState";
import { ReportPostDialog } from "./ReportPostDialog";
import type { TierListLibrary, TierListSavedDocument } from "../lib/tierList";
import {
  displayTierListTitle,
  sortTierListLibraryDocuments,
} from "../lib/tierList";
import { getTeamGlowColor } from "../lib/teamColors";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { PlayerTeamIcon } from "./PlayerTeamIcon";
import { RankedTierBadge } from "./RankedTierBadge";

const formatSavedAt = (savedAt: number) =>
  new Date(savedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

interface TierListHubHomeProps {
  onOpenPosts: () => void;
  onOpenTiers: () => void;
  postsToday?: number | null;
}

export function TierListHubHome({
  onOpenPosts,
  onOpenTiers,
  postsToday = null,
}: TierListHubHomeProps) {
  return (
    <div className="tier-list-hub__home">
      {postsToday != null && postsToday > 0 ? (
        <p className="community-activity-strip" role="status">
          <strong>{formatCommunityActivityStrip(postsToday)}</strong>
        </p>
      ) : null}
      <div className="play-hub-chooser tier-list-hub__chooser" role="list">
        <button
          type="button"
          className="play-hub-chooser__option hub-accent hub-accent--community"
          role="listitem"
          onClick={onOpenPosts}
        >
          <span className="play-hub-chooser__copy">
            <span className="play-hub-chooser__label">Posts</span>
            <span className="play-hub-chooser__meta">
              Anyone can read. Sign in to post takes and results.
            </span>
          </span>
          <span className="play-hub-chooser__chevron" aria-hidden="true">
            ›
          </span>
        </button>
        <button
          type="button"
          className="play-hub-chooser__option hub-accent hub-accent--community"
          role="listitem"
          onClick={onOpenTiers}
        >
          <span className="play-hub-chooser__copy">
            <span className="play-hub-chooser__label">Tier lists</span>
            <span className="play-hub-chooser__meta">
              Browse public boards. Sign in to publish.
            </span>
          </span>
          <span className="play-hub-chooser__chevron" aria-hidden="true">
            ›
          </span>
        </button>
      </div>
    </div>
  );
}

interface TierListTiersHubProps {
  onCreate: () => void;
  onOpenMine: () => void;
  onOpenPublic: () => void;
}

export function TierListTiersHub({
  onCreate,
  onOpenMine,
  onOpenPublic,
}: TierListTiersHubProps) {
  return (
    <div className="play-hub-chooser tier-list-hub__chooser" role="list">
      <button
        type="button"
        className="play-hub-chooser__option hub-accent hub-accent--community"
        role="listitem"
        onClick={onOpenPublic}
      >
        <span className="play-hub-chooser__copy">
          <span className="play-hub-chooser__label">Public tier lists</span>
          <span className="play-hub-chooser__meta">
            Browse and like lists shared by the community
          </span>
        </span>
        <span className="play-hub-chooser__chevron" aria-hidden="true">
          ›
        </span>
      </button>
      <button
        type="button"
        className="play-hub-chooser__option hub-accent hub-accent--community"
        role="listitem"
        onClick={onOpenMine}
      >
        <span className="play-hub-chooser__copy">
          <span className="play-hub-chooser__label">My tier lists</span>
          <span className="play-hub-chooser__meta">
            Open or delete lists saved on this device
          </span>
        </span>
        <span className="play-hub-chooser__chevron" aria-hidden="true">
          ›
        </span>
      </button>
      <button
        type="button"
        className="play-hub-chooser__option hub-accent hub-accent--community"
        role="listitem"
        onClick={onCreate}
      >
        <span className="play-hub-chooser__copy">
          <span className="play-hub-chooser__label">Create a list</span>
          <span className="play-hub-chooser__meta">
            Build a board and publish it when you are ready
          </span>
        </span>
        <span className="play-hub-chooser__chevron" aria-hidden="true">
          ›
        </span>
      </button>
    </div>
  );
}

interface TierListMinePanelProps {
  library: TierListLibrary;
  sort: PublicTierListSort;
  onSortChange: (sort: PublicTierListSort) => void;
  likeCountByPublishedId: Record<string, number>;
  onOpen: (documentId: string) => void;
  onDelete: (documentId: string) => void;
  onCreate: () => void;
}

export function TierListMinePanel({
  library,
  sort,
  onSortChange,
  likeCountByPublishedId,
  onOpen,
  onDelete,
  onCreate,
}: TierListMinePanelProps) {
  const documents = sortTierListLibraryDocuments(
    library.documents,
    sort,
    likeCountByPublishedId,
  );

  return (
    <div className="tier-list-hub__panel" aria-label="My tier lists">
      <div className="tier-list-hub__panel-header">
        <h2>My tier lists</h2>
        <label className="tier-list-hub__sort">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) =>
              onSortChange(event.target.value as PublicTierListSort)
            }
          >
            <option value="recent">Most recent</option>
            <option value="likes">Most liked</option>
          </select>
        </label>
      </div>

      {documents.length === 0 ? (
        <div className="hub-empty">
          <p>No saved lists yet.</p>
          <div className="hub-empty__actions">
            <button type="button" className="hub-cta" onClick={onCreate}>
              Create a list
            </button>
          </div>
        </div>
      ) : (
        <ul className="tier-list__library-list">
          {documents.map((document: TierListSavedDocument) => {
            const likes = document.publishedId
              ? (likeCountByPublishedId[document.publishedId] ?? 0)
              : null;

            return (
              <li key={document.id} className="tier-list__library-item">
                <div className="tier-list__library-copy">
                  <strong>{displayTierListTitle(document.title)}</strong>
                  <span>
                    Saved {formatSavedAt(document.savedAt)}
                    {document.publishedId
                      ? ` · Published · ${likes ?? 0} like${
                          (likes ?? 0) === 1 ? "" : "s"
                        }`
                      : ""}
                  </span>
                </div>
                <div className="tier-list__library-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onOpen(document.id)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onDelete(document.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface TierListPublicPanelProps {
  lists: PublicTierListSummary[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  sort: PublicTierListSort;
  onSortChange: (sort: PublicTierListSort) => void;
  filters: PublicTierListBrowseFilters;
  onFiltersChange: (filters: PublicTierListBrowseFilters) => void;
  onOpen: (id: string) => void;
  onToggleLike: (id: string, liked: boolean) => void;
  onLoadMore: () => void;
  onEditOwned: (id: string) => void;
  onUnpublishOwned: (id: string) => void;
  onClearFilters?: () => void;
  onCreate?: () => void;
  accountLinked?: boolean | null;
}

export function TierListPublicPanel({
  lists,
  loading,
  loadingMore,
  hasMore,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  onOpen,
  onToggleLike,
  onLoadMore,
  onEditOwned,
  onUnpublishOwned,
  onClearFilters,
  onCreate,
  accountLinked = null,
}: TierListPublicPanelProps) {
  const accountReady = accountLinked === true;
  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.mineOnly ||
    filters.likedByMe ||
    filters.minLikes > 0 ||
    filters.dateWindow !== "all";

  return (
    <div className="tier-list-hub__panel" aria-label="Public tier lists">
      <div className="tier-list-hub__panel-header">
        <h2>Public tier lists</h2>
        <label className="tier-list-hub__sort">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) =>
              onSortChange(event.target.value as PublicTierListSort)
            }
          >
            <option value="recent">Most recent</option>
            <option value="likes">Most liked</option>
          </select>
        </label>
      </div>

      <div className="tier-list-hub__browse-filters" aria-label="Public list filters">
        <label className="tier-list__search tier-list-hub__browse-search">
          <span>Search</span>
          <input
            type="search"
            value={filters.query}
            placeholder="Title or author"
            onChange={(event) =>
              onFiltersChange({ ...filters, query: event.target.value })
            }
          />
        </label>

        <div className="tier-list__chips">
          <button
            type="button"
            className={`tier-list__chip${filters.mineOnly ? " is-active" : ""}`}
            aria-pressed={filters.mineOnly}
            onClick={() =>
              onFiltersChange({ ...filters, mineOnly: !filters.mineOnly })
            }
          >
            Mine only
          </button>
          <button
            type="button"
            className={`tier-list__chip${filters.likedByMe ? " is-active" : ""}`}
            aria-pressed={filters.likedByMe}
            onClick={() =>
              onFiltersChange({ ...filters, likedByMe: !filters.likedByMe })
            }
          >
            Liked by me
          </button>
        </div>

        <label className="tier-list-hub__browse-select">
          <span>Min likes</span>
          <select
            value={String(filters.minLikes)}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                minLikes: Number(event.target.value) || 0,
              })
            }
          >
            <option value="0">Any</option>
            <option value="1">1+</option>
            <option value="3">3+</option>
            <option value="5">5+</option>
            <option value="10">10+</option>
          </select>
        </label>

        <label className="tier-list-hub__browse-select">
          <span>When</span>
          <select
            value={filters.dateWindow}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                dateWindow: event.target.value as PublicTierListDateWindow,
              })
            }
          >
            <option value="all">All time</option>
            <option value="week">Past week</option>
            <option value="month">Past month</option>
          </select>
        </label>
      </div>

      {loading && lists.length === 0 ? (
        <p className="hub-empty" role="status">
          Loading…
        </p>
      ) : lists.length === 0 ? (
        <div className="hub-empty">
          <p>
            {hasActiveFilters
              ? "No public lists match these filters."
              : "No public lists yet. Publish one from the editor to share it here."}
          </p>
          <div className="hub-empty__actions">
            {hasActiveFilters && onClearFilters ? (
              <button
                type="button"
                className="secondary-button"
                onClick={onClearFilters}
              >
                Clear filters
              </button>
            ) : null}
            {onCreate ? (
              <button type="button" className="hub-cta" onClick={onCreate}>
                Create a list
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <ul className="tier-list__library-list">
          {lists.map((entry) => (
            <li key={entry.id} className="tier-list__library-item">
              <div className="tier-list__library-copy">
                <strong>{entry.title}</strong>
                <span>
                  {entry.authorName} · {formatPublicTag(entry.authorTag)} ·{" "}
                  {formatPublicTierListTime(entry.publishedAt)} ·{" "}
                  {entry.likeCount} like{entry.likeCount === 1 ? "" : "s"}
                  {entry.isOwner ? " · Yours" : ""}
                </span>
              </div>
              <div className="tier-list__library-actions">
                {entry.isOwner ? (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onEditOwned(entry.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onUnpublishOwned(entry.id)}
                    >
                      Unpublish
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className={`secondary-button${
                    entry.likedByViewer ? " is-active-like" : ""
                  }`}
                  aria-pressed={entry.likedByViewer}
                  disabled={!accountReady}
                  title={
                    accountReady
                      ? undefined
                      : accountLinked === null
                        ? "Checking account"
                        : "Create an account to like"
                  }
                  onClick={() => onToggleLike(entry.id, !entry.likedByViewer)}
                >
                  {entry.likedByViewer ? "Liked" : "Like"} · {entry.likeCount}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onOpen(entry.id)}
                >
                  View
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {loading && lists.length > 0 ? (
        <p className="tier-list__hint" role="status">
          Updating…
        </p>
      ) : null}

      {hasMore && !loading ? (
        <button
          type="button"
          className="secondary-button tier-list-hub__load-more"
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}

interface CommunityPostsPanelProps {
  posts: CommunityPost[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  draft: string;
  onDraftChange: (value: string) => void;
  submitting: boolean;
  error: string | null;
  likeError?: string | null;
  onSubmit: () => void;
  accountLinked: boolean | null;
  sort: CommunityPostSort;
  onSortChange: (sort: CommunityPostSort) => void;
  shareables: CommunityPostAttachment[];
  selectedAttachment: CommunityPostAttachment | null;
  onSelectAttachment: (attachment: CommunityPostAttachment | null) => void;
  onToggleLike: (postId: string, liked: boolean) => void;
  onDeletePost?: (postId: string) => void;
  onMuteAuthor?: (playerId: string) => void;
  viewerPlayerId?: string;
  authorName: string;
  authorTag: string;
  onOpenTiers?: () => void;
  onOpenPublishedTierList?: (publishedId: string) => void;
  playersById: Map<string, Player>;
  focusPostId?: string | null;
  postsToday?: number | null;
  onSignIn?: () => void;
  onChallengeAuthor?: (
    mode: "classic" | "ranked",
    target?: { playerId: string; displayName?: string } | null,
  ) => void;
}

const TrashIcon = () => (
  <svg
    className="community-posts-panel__icon"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="currentColor"
      d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9zm-1 12h12a1 1 0 0 0 1-1V7H5v13a1 1 0 0 0 1 1z"
    />
  </svg>
);

const LikeIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg
    className="community-posts-panel__icon"
    viewBox="0 0 24 24"
    width="15"
    height="15"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      d="M12 20s-7-4.35-7-9.2A3.8 3.8 0 0 1 12 7.2 3.8 3.8 0 0 1 19 10.8C19 15.65 12 20 12 20z"
    />
  </svg>
);

const ReplyIcon = () => (
  <svg
    className="community-posts-panel__icon"
    viewBox="0 0 24 24"
    width="15"
    height="15"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H11l-4 3v-3H5A1.5 1.5 0 0 1 3.5 15V8A1.5 1.5 0 0 1 5 6.5z"
    />
  </svg>
);

export function CommunityPostsPanel({
  posts,
  loading,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  draft,
  onDraftChange,
  submitting,
  error,
  likeError = null,
  onSubmit,
  accountLinked,
  sort,
  onSortChange,
  shareables,
  selectedAttachment,
  onSelectAttachment,
  onToggleLike,
  onDeletePost,
  onMuteAuthor,
  viewerPlayerId = "",
  authorName,
  authorTag,
  onOpenTiers,
  onOpenPublishedTierList,
  playersById,
  focusPostId = null,
  postsToday = null,
  onSignIn,
  onChallengeAuthor,
}: CommunityPostsPanelProps) {
  const accountReady = accountLinked === true;
  const accountBlocked = accountLinked === false;
  const remaining = COMMUNITY_POST_BODY_MAX - draft.length;
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);
  const [viewingAttachment, setViewingAttachment] =
    useState<CommunityPostAttachment | null>(null);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [viewBusy, setViewBusy] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [showMatchupDetails, setShowMatchupDetails] = useState(false);
  const [showingFullMatchup, setShowingFullMatchup] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<string | null>(null);
  const [repliesByPost, setRepliesByPost] = useState<
    Record<string, CommunityPostReply[]>
  >({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyBusy, setReplyBusy] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [muteEpoch, setMuteEpoch] = useState(0);
  const [expandedAuthorId, setExpandedAuthorId] = useState<string | null>(null);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<
    "all" | "mine" | "matchup" | "lineup" | "tierList" | "text"
  >("all");
  const viewerCloseRef = useRef<HTMLButtonElement | null>(null);
  const viewerPanelRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const focusRef = useRef<HTMLLIElement | null>(null);
  const viewRequestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (viewImageUrl) {
        URL.revokeObjectURL(viewImageUrl);
      }
    };
  }, [viewImageUrl]);

  useEffect(() => {
    return () => {
      // Invalidate in-flight image renders on unmount.
      viewRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!focusPostId || !focusRef.current) {
      return;
    }
    focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusPostId, posts]);

  useEffect(() => {
    if (!hasMore || !onLoadMore || loading || loadingMore) {
      return;
    }
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, onLoadMore, posts.length]);

  const closeAttachmentViewer = useCallback(() => {
    viewRequestIdRef.current += 1;
    setViewingPostId(null);
    setViewingAttachment(null);
    setShowMatchupDetails(false);
    setShowingFullMatchup(false);
    setViewBusy(false);
    setViewError(null);
    setViewImageUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, []);

  useDialogA11y({
    open: Boolean(viewingPostId),
    onClose: closeAttachmentViewer,
    initialFocusRef: viewerCloseRef,
    containerRef: viewerPanelRef as RefObject<HTMLElement | null>,
    lockScroll: true,
  });

  const renderShareImage = useCallback(
    async (
      attachment: CommunityPostAttachment,
      mode: "lineup" | "matchup",
    ): Promise<{ blob: Blob; missingPlayerCount: number } | null> => {
      if (attachment.kind === "tierList") {
        return null;
      }
      if (mode === "matchup" && attachment.kind === "matchup") {
        const inputs = buildMatchupShareCardInputsFromAttachment(
          attachment,
          playersById,
        );
        if (!inputs) {
          return null;
        }
        return {
          blob: await createMatchupShareCardBlob(inputs),
          missingPlayerCount: inputs.missingPlayerCount,
        };
      }
      const input = buildShareCardInputFromAttachment(attachment, playersById);
      if (!input) {
        return null;
      }
      const { missingPlayerCount, ...cardInput } = input;
      return {
        blob: await createLineupShareCardBlob(cardInput),
        missingPlayerCount,
      };
    },
    [playersById],
  );

  const handleViewAttachment = async (
    postId: string,
    attachment: CommunityPostAttachment,
  ) => {
    if (attachment.kind === "tierList") {
      onOpenPublishedTierList?.(attachment.publishedId);
      return;
    }

    const requestId = ++viewRequestIdRef.current;
    setViewingPostId(postId);
    setViewingAttachment(attachment);
    setShowMatchupDetails(false);
    setShowingFullMatchup(false);
    setViewBusy(true);
    setViewError(null);
    setViewImageUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });

    try {
      const rendered = await renderShareImage(attachment, "lineup");
      if (requestId !== viewRequestIdRef.current) {
        return;
      }
      if (!rendered) {
        setViewError("Could not rebuild that lineup image.");
        setViewBusy(false);
        return;
      }
      setViewImageUrl(URL.createObjectURL(rendered.blob));
      setViewError(
        formatMissingPlayersShareWarning(rendered.missingPlayerCount),
      );
    } catch {
      if (requestId !== viewRequestIdRef.current) {
        return;
      }
      setViewError("Could not open that lineup image.");
    } finally {
      if (requestId === viewRequestIdRef.current) {
        setViewBusy(false);
      }
    }
  };

  const handleToggleFullMatchup = async () => {
    if (!viewingAttachment || viewingAttachment.kind !== "matchup" || viewBusy) {
      return;
    }
    const next = !showingFullMatchup;
    const requestId = ++viewRequestIdRef.current;
    setShowingFullMatchup(next);
    setShowMatchupDetails(next);
    setViewBusy(true);
    setViewError(null);
    setViewImageUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    try {
      const rendered = await renderShareImage(
        viewingAttachment,
        next ? "matchup" : "lineup",
      );
      if (requestId !== viewRequestIdRef.current) {
        return;
      }
      if (!rendered) {
        setViewError(
          next
            ? "Could not rebuild that matchup image."
            : "Could not rebuild that lineup image.",
        );
        setViewBusy(false);
        return;
      }
      setViewImageUrl(URL.createObjectURL(rendered.blob));
      setViewError(
        formatMissingPlayersShareWarning(rendered.missingPlayerCount),
      );
    } catch {
      if (requestId !== viewRequestIdRef.current) {
        return;
      }
      setViewError("Could not update the matchup image.");
    } finally {
      if (requestId === viewRequestIdRef.current) {
        setViewBusy(false);
      }
    }
  };

  const handleToggleReplies = async (postId: string) => {
    if (expandedReplies === postId) {
      setExpandedReplies(null);
      return;
    }
    setExpandedReplies(postId);
    setReplyError(null);
    if (repliesByPost[postId]) {
      return;
    }
    const replies = await listCommunityPostReplies({ postId });
    setRepliesByPost((current) => ({ ...current, [postId]: replies }));
  };

  const handleSubmitReply = async (postId: string) => {
    const body = (replyDrafts[postId] ?? "").trim();
    if (!body || replyBusy) {
      return;
    }
    setReplyBusy(postId);
    setReplyError(null);
    const result = await createCommunityPostReply({
      playerId: viewerPlayerId,
      postId,
      authorName,
      authorTag,
      body,
    });
    setReplyBusy(null);
    if (!result.ok) {
      setReplyError(result.error);
      return;
    }
    setReplyDrafts((current) => ({ ...current, [postId]: "" }));
    setRepliesByPost((current) => ({
      ...current,
      [postId]: [...(current[postId] ?? []), result.reply],
    }));
  };

  const handleDeleteReply = async (postId: string, replyId: string) => {
    if (!accountReady || actionBusy) {
      return;
    }
    setActionBusy(replyId);
    setReplyError(null);
    const result = await deleteCommunityReply({
      playerId: viewerPlayerId,
      replyId,
    });
    setActionBusy(null);
    if (!result.ok) {
      setReplyError(result.error);
      return;
    }
    setRepliesByPost((current) => ({
      ...current,
      [postId]: (current[postId] ?? []).filter((reply) => reply.id !== replyId),
    }));
  };

  const handleReport = async (postId: string) => {
    if (!accountReady || actionBusy) {
      return;
    }
    setReportError(null);
    setReportPostId(postId);
    setOpenMenuPostId(null);
  };

  const handleSubmitReport = async (reason: string) => {
    if (!reportPostId || actionBusy) {
      return;
    }
    setActionBusy(reportPostId);
    setReportError(null);
    const result = await reportCommunityPost({
      playerId: viewerPlayerId,
      postId: reportPostId,
      reason,
    });
    setActionBusy(null);
    if (!result.ok) {
      setReportError(result.error);
      return;
    }
    setReportPostId(null);
    setReportStatus("Thanks — report submitted.");
    window.setTimeout(() => setReportStatus(null), 2500);
  };

  const handleMute = (playerId: string) => {
    if (!playerId || playerId === viewerPlayerId) {
      return;
    }
    mutePlayerId(playerId);
    setMuteEpoch((value) => value + 1);
    setOpenMenuPostId(null);
    onMuteAuthor?.(playerId);
  };

  const handleCopyPostLink = async (postId: string) => {
    const ok = await copyToClipboard(buildCommunityPostShareUrl(postId));
    setOpenMenuPostId(null);
    if (!ok) {
      setReplyError("Could not copy link.");
      return;
    }
    setCopiedPostId(postId);
    window.setTimeout(() => {
      setCopiedPostId((current) => (current === postId ? null : current));
    }, 2000);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const attachmentKey = (entry: CommunityPostAttachment) =>
    entry.kind === "tierList"
      ? `${entry.kind}:${entry.publishedId}`
      : `${entry.kind}:${entry.savedAt}`;

  const muted = new Set(loadMutedPlayerIds());
  void muteEpoch;
  const isFeedFiltered = feedFilter !== "all";
  const visiblePosts = posts
    .filter((post) => !muted.has(post.playerId))
    .filter((post) => {
      if (feedFilter === "all") {
        return true;
      }
      if (feedFilter === "mine") {
        return post.playerId === viewerPlayerId;
      }
      if (feedFilter === "text") {
        return !post.attachment;
      }
      if (feedFilter === "matchup") {
        return post.attachment?.kind === "matchup";
      }
      if (feedFilter === "lineup") {
        return post.attachment?.kind === "lineup";
      }
      if (feedFilter === "tierList") {
        return post.attachment?.kind === "tierList";
      }
      return true;
    });

  const feedFilterOptions: Array<{
    value: typeof feedFilter;
    label: string;
  }> = [
    { value: "all", label: "All" },
    { value: "mine", label: "Mine" },
    { value: "matchup", label: "Matchups" },
    { value: "lineup", label: "Lineups" },
    { value: "tierList", label: "Tier lists" },
    { value: "text", label: "Text only" },
  ];

  return (
    <div
      className="tier-list-hub__panel community-posts-panel hub-accent hub-accent--community"
      aria-label="Community posts"
    >
      <div className="tier-list-hub__panel-header">
        <h2>Posts</h2>
        <label className="tier-list-hub__sort community-posts-panel__sort">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(event) =>
              onSortChange(event.target.value as CommunityPostSort)
            }
          >
            <option value="recent">Most recent</option>
            <option value="popular">Most liked</option>
          </select>
        </label>
      </div>

      <div className="community-posts-panel__main">
        <div className="community-posts-panel__feed">
          <div
            className="community-posts-panel__filters"
            role="toolbar"
            aria-label="Filter posts"
          >
            {feedFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`community-posts-panel__filter-chip${
                  feedFilter === option.value ? " is-active" : ""
                }`}
                aria-pressed={feedFilter === option.value}
                onClick={() => setFeedFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {postsToday != null && postsToday > 0 ? (
            <p className="community-activity-strip" role="status">
              <strong>{formatCommunityActivityStrip(postsToday)}</strong>
            </p>
          ) : null}

      {likeError || replyError ? (
        <p className="form-error community-posts-panel__like-error" role="alert">
          {likeError || replyError}
        </p>
      ) : null}

      {reportStatus ? (
        <p className="tier-list__status" role="status">
          {reportStatus}
        </p>
      ) : null}

      {loading && visiblePosts.length === 0 ? (
        <EmptyState message="Loading…" loading />
      ) : visiblePosts.length === 0 ? (
        <EmptyState
          message={
            isFeedFiltered
              ? "No posts match this filter."
              : accountReady
                ? "No posts yet. Be the first to share something short."
                : "No posts yet. Sign in to start the conversation."
          }
          actions={
            isFeedFiltered ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setFeedFilter("all")}
              >
                Show all posts
              </button>
            ) : !accountReady && onSignIn ? (
              <button
                type="button"
                className="secondary-button"
                onClick={onSignIn}
              >
                Sign in to post
              </button>
            ) : onOpenTiers ? (
              <button
                type="button"
                className="secondary-button"
                onClick={onOpenTiers}
              >
                Browse tier lists
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="tier-list__library-list community-posts-panel__list">
          {visiblePosts.map((post) => {
            const isOwn = Boolean(
              viewerPlayerId && post.playerId === viewerPlayerId,
            );
            const replyCount = Math.max(
              post.replyCount,
              (repliesByPost[post.id] ?? []).length,
            );
            const replyRemaining =
              COMMUNITY_REPLY_BODY_MAX - (replyDrafts[post.id]?.length ?? 0);
            return (
              <li
                key={post.id}
                ref={focusPostId === post.id ? focusRef : undefined}
                className={`tier-list__library-item community-posts-panel__item${
                  focusPostId === post.id
                    ? " community-posts-panel__item--focus"
                    : ""
                }`}
              >
                <div className="community-posts-panel__card">
                  <div className="community-posts-panel__card-top">
                    <div className="community-posts-panel__author">
                      <button
                        type="button"
                        className="community-posts-panel__author-button"
                        aria-expanded={expandedAuthorId === post.id}
                        onClick={() =>
                          setExpandedAuthorId((current) =>
                            current === post.id ? null : post.id,
                          )
                        }
                      >
                        <strong>
                          {post.authorName} · {formatPublicTag(post.authorTag)}
                        </strong>
                      </button>
                      <span className="community-posts-panel__author-meta">
                        {formatCommunityPostTime(post.createdAt)}
                      </span>
                      {expandedAuthorId === post.id &&
                      (post.authorRankedElo != null ||
                        post.authorClassicElo != null) ? (
                        <span className="community-posts-panel__flair">
                          {post.authorRankedElo != null ? (
                            <RankedTierBadge
                              elo={post.authorRankedElo}
                              compact
                            />
                          ) : null}
                          {post.authorClassicElo != null ? (
                            <RankedTierBadge
                              elo={post.authorClassicElo}
                              tierLabel="Casual"
                              compact
                            />
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                    {onDeletePost && isOwn ? (
                      <button
                        type="button"
                        className="community-posts-panel__delete"
                        aria-label="Delete post"
                        title="Delete post"
                        onClick={() => onDeletePost(post.id)}
                      >
                        <TrashIcon />
                      </button>
                    ) : null}
                  </div>

                  <p className="community-posts-panel__body">{post.body}</p>
                  {post.quote ? (
                    <blockquote className="community-posts-panel__quote">
                      <span>
                        {post.quote.authorName} ·{" "}
                        {formatPublicTag(post.quote.authorTag)}
                      </span>
                      <p>{post.quote.bodyPreview}</p>
                    </blockquote>
                  ) : null}
                  {post.attachment ? (
                    <div className="community-posts-panel__attachment">
                      <p className="community-posts-panel__attachment-chip">
                        {formatCommunityAttachmentChip(post.attachment)}
                      </p>
                      {post.attachment.kind === "matchup" ||
                      post.attachment.kind === "lineup" ? (
                        <button
                          type="button"
                          className="secondary-button community-posts-panel__view-attach"
                          onClick={() => {
                            if (!post.attachment) {
                              return;
                            }
                            void handleViewAttachment(post.id, post.attachment);
                          }}
                        >
                          {communityMatchupAttachmentViewLabel(post.attachment.kind)}
                        </button>
                      ) : null}
                      {post.attachment.kind === "tierList" ? (
                        <button
                          type="button"
                          className="secondary-button community-posts-panel__view-attach"
                          onClick={() => {
                            if (
                              !post.attachment ||
                              post.attachment.kind !== "tierList"
                            ) {
                              return;
                            }
                            onOpenPublishedTierList?.(
                              post.attachment.publishedId,
                            );
                          }}
                        >
                          View tier list
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="community-posts-panel__engagement">
                    <button
                      type="button"
                      className={`community-posts-panel__stat${
                        post.likedByViewer ? " is-active" : ""
                      }`}
                      aria-pressed={post.likedByViewer}
                      disabled={!accountReady}
                      title={
                        accountReady
                          ? "Like"
                          : "Sign in to like"
                      }
                      onClick={() =>
                        onToggleLike(post.id, !post.likedByViewer)
                      }
                    >
                      <span aria-hidden="true">
                        <LikeIcon filled={post.likedByViewer} />
                      </span>
                      <span>{post.likeCount}</span>
                      <span className="community-posts-panel__stat-label">
                        {post.likeCount === 1 ? "like" : "likes"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`community-posts-panel__stat${
                        expandedReplies === post.id ? " is-active" : ""
                      }`}
                      aria-expanded={expandedReplies === post.id}
                      title="Replies"
                      onClick={() => void handleToggleReplies(post.id)}
                    >
                      <span aria-hidden="true">
                        <ReplyIcon />
                      </span>
                      <span>{replyCount}</span>
                      <span className="community-posts-panel__stat-label">
                        {replyCount === 1 ? "reply" : "replies"}
                      </span>
                    </button>
                    <div className="community-posts-panel__more">
                      <details
                        className="community-posts-panel__menu"
                        open={openMenuPostId === post.id}
                        onToggle={(event) => {
                          const details = event.currentTarget as HTMLDetailsElement;
                          const open = details.open;
                          setOpenMenuPostId(open ? post.id : null);
                          if (!open) {
                            details.classList.remove("is-up");
                            return;
                          }
                          requestAnimationFrame(() => {
                            const panel = details.querySelector(
                              ".community-posts-panel__menu-panel",
                            ) as HTMLElement | null;
                            if (!panel) {
                              return;
                            }
                            const panelRect = panel.getBoundingClientRect();
                            const scrollParent = details.closest(
                              ".landing-hub-scroll",
                            );
                            const boundsBottom = scrollParent
                              ? scrollParent.getBoundingClientRect().bottom
                              : window.innerHeight;
                            if (panelRect.bottom > boundsBottom) {
                              details.classList.add("is-up");
                            } else {
                              details.classList.remove("is-up");
                            }
                          });
                        }}
                      >
                        <summary
                          className="community-posts-panel__menu-trigger"
                          aria-label="More actions"
                        >
                          …
                        </summary>
                        <div className="community-posts-panel__menu-panel">
                          <button
                            type="button"
                            className="community-posts-panel__text-action"
                            onClick={() => void handleCopyPostLink(post.id)}
                          >
                            {copiedPostId === post.id
                              ? "Link copied"
                              : "Copy link"}
                          </button>
                          {!isOwn ? (
                            <>
                              {onChallengeAuthor ? (
                                <button
                                  type="button"
                                  className="community-posts-panel__text-action"
                                  disabled={!accountReady}
                                  title={
                                    accountReady
                                      ? undefined
                                      : "Create an account to challenge another GM."
                                  }
                                  onClick={() => {
                                    if (!accountReady) {
                                      onSignIn?.();
                                      return;
                                    }
                                    setOpenMenuPostId(null);
                                    onChallengeAuthor("classic", {
                                      playerId: post.playerId,
                                      displayName:
                                        post.authorName?.trim() ||
                                        formatPublicTag(post.authorTag),
                                    });
                                  }}
                                >
                                  Challenge
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="community-posts-panel__text-action"
                                disabled={
                                  !accountReady || actionBusy === post.id
                                }
                                onClick={() => void handleReport(post.id)}
                              >
                                Report
                              </button>
                              <button
                                type="button"
                                className="community-posts-panel__text-action"
                                onClick={() => handleMute(post.playerId)}
                              >
                                Mute
                              </button>
                            </>
                          ) : null}
                        </div>
                      </details>
                    </div>
                  </div>

                  {expandedReplies === post.id ? (
                    <div className="community-posts-panel__replies">
                      {(repliesByPost[post.id] ?? []).length === 0 ? (
                        <p className="community-posts-panel__replies-empty">
                          Be the first to reply
                        </p>
                      ) : (
                        <ul className="community-posts-panel__replies-list">
                          {(repliesByPost[post.id] ?? []).map((reply) => (
                            <li key={reply.id}>
                              <div className="community-posts-panel__reply-meta">
                                <strong>
                                  {reply.authorName} ·{" "}
                                  {formatPublicTag(reply.authorTag)}
                                </strong>
                                <span>
                                  {formatCommunityPostTime(reply.createdAt)}
                                </span>
                                {accountReady &&
                                reply.playerId === viewerPlayerId ? (
                                  <button
                                    type="button"
                                    className="community-posts-panel__text-action"
                                    disabled={actionBusy === reply.id}
                                    onClick={() =>
                                      void handleDeleteReply(post.id, reply.id)
                                    }
                                  >
                                    Delete
                                  </button>
                                ) : null}
                              </div>
                              <p>{reply.body}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                      {accountReady ? (
                        <div className="community-posts-panel__reply-compose">
                          <textarea
                            rows={2}
                            maxLength={COMMUNITY_REPLY_BODY_MAX}
                            value={replyDrafts[post.id] ?? ""}
                            placeholder={
                              (repliesByPost[post.id] ?? []).length === 0
                                ? "Be the first to reply…"
                                : "Write a reply…"
                            }
                            onChange={(event) =>
                              setReplyDrafts((current) => ({
                                ...current,
                                [post.id]: event.target.value,
                              }))
                            }
                            disabled={replyBusy === post.id}
                          />
                          <div className="community-posts-panel__compose-meta">
                            <span
                              className={
                                replyRemaining < 40 ? "is-tight" : undefined
                              }
                            >
                              {replyRemaining} left
                            </span>
                            <button
                              type="button"
                              className="secondary-button"
                              disabled={
                                replyBusy === post.id ||
                                !(replyDrafts[post.id] ?? "").trim()
                              }
                              onClick={() => void handleSubmitReply(post.id)}
                            >
                              {replyBusy === post.id ? "Sending…" : "Reply"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}


      {isFeedFiltered && visiblePosts.length === 0 && hasMore && !loading ? (
        <p className="tier-list__hint community-posts-panel__filter-hint" role="status">
          Scroll for more — older posts may match this filter.
        </p>
      ) : null}

      {loading && visiblePosts.length > 0 ? (
        <p className="tier-list__hint" role="status">
          Updating…
        </p>
      ) : null}

      {hasMore ? (
        <div
          ref={sentinelRef}
          className="community-posts-panel__sentinel"
          aria-hidden="true"
        >
          {loadingMore ? (
            <p className="tier-list__hint" role="status">
              Loading more…
            </p>
          ) : null}
        </div>
      ) : null}
        </div>

        <div className="community-posts-panel__composer">
          {accountBlocked ? (
            <div className="community-posts-panel__signin">
              <p className="community-posts-panel__signin-copy">
                {ACCOUNT_REQUIRED_COMMUNITY_ENGAGE_MESSAGE}
              </p>
              {onSignIn ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={onSignIn}
                >
                  Sign in to post
                </button>
              ) : null}
            </div>
          ) : null}

          {accountReady ? (
            <form
              className="community-posts-panel__compose"
              onSubmit={handleSubmit}
            >
              <label className="tier-list__search community-posts-panel__field">
                <span>New post</span>
                <textarea
                  value={draft}
                  maxLength={COMMUNITY_POST_BODY_MAX}
                  rows={3}
                  placeholder="Share a short take (tier lists, Daily, matchups…)"
                  onChange={(event) => onDraftChange(event.target.value)}
                  disabled={!accountReady || submitting}
                />
              </label>

              <label className="tier-list-hub__sort community-posts-panel__attach">
                <span>Attach a recent result or list</span>
                <select
                  value={
                    selectedAttachment ? attachmentKey(selectedAttachment) : ""
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    const match = shareables.find(
                      (entry) => attachmentKey(entry) === value,
                    );
                    onSelectAttachment(match ?? null);
                  }}
                  disabled={
                    !accountReady || submitting || shareables.length === 0
                  }
                >
                  <option value="">No attachment</option>
                  {shareables.map((entry) => (
                    <option
                      key={attachmentKey(entry)}
                      value={attachmentKey(entry)}
                    >
                      {formatCommunityAttachmentChip(entry)}
                    </option>
                  ))}
                </select>
              </label>
              {shareables.length === 0 ? (
                <p className="community-posts-panel__attach-hint">
                  Finish a Daily, H2H, Events, or All-Time matchup, or publish a
                  tier list, to attach it here.
                </p>
              ) : null}

              {selectedAttachment ? (
                <div
                  className="community-posts-panel__attach-preview-card"
                  role="status"
                >
                  <div className="community-posts-panel__attach-preview-top">
                    <span className="community-posts-panel__attachment-chip">
                      {formatCommunityAttachmentChip(selectedAttachment)}
                    </span>
                    <button
                      type="button"
                      className="community-posts-panel__text-action"
                      onClick={() => onSelectAttachment(null)}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="community-posts-panel__attach-preview-summary">
                    {formatCommunityAttachmentSummary(selectedAttachment)}
                  </p>
                  {selectedAttachment.kind === "matchup" ? (
                    <p className="community-posts-panel__attach-preview-meta">
                      {[
                        selectedAttachment.userRecord
                          ? `Projected ${selectedAttachment.userRecord}`
                          : null,
                        selectedAttachment.userLineupNames
                          .slice(0, 5)
                          .join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  {selectedAttachment.kind === "lineup" ? (
                    <p className="community-posts-panel__attach-preview-meta">
                      {selectedAttachment.lineupNames.slice(0, 5).join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="community-posts-panel__compose-meta">
                <span className={remaining < 40 ? "is-tight" : undefined}>
                  {remaining} left
                </span>
                <button
                  type="submit"
                  className="hub-cta"
                  disabled={
                    !accountReady || submitting || draft.trim().length === 0
                  }
                >
                  {submitting ? "Posting…" : "Post"}
                </button>
              </div>
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>

      {viewingPostId
        ? createPortal(
            <div
              className="community-posts-panel__viewer"
              role="dialog"
              aria-modal="true"
              aria-label="Attached lineup"
              onClick={closeAttachmentViewer}
            >
          <div
            ref={viewerPanelRef}
            className="community-posts-panel__viewer-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="community-posts-panel__viewer-header">
              <h3>
                {showingFullMatchup ? "Shared matchup" : "Shared lineup"}
              </h3>
              <button
                type="button"
                ref={viewerCloseRef}
                className="secondary-button"
                onClick={closeAttachmentViewer}
              >
                Close
              </button>
            </div>
            {viewBusy ? (
              <EmptyState message="Loading…" loading />
            ) : null}
            {viewError ? (
              <p className="form-error" role="alert">
                {viewError}
              </p>
            ) : null}
            {viewImageUrl ? (
              <img
                className="community-posts-panel__viewer-image"
                src={viewImageUrl}
                alt={showingFullMatchup ? "Shared matchup" : "Shared lineup"}
              />
            ) : null}
            {viewingAttachment?.kind === "matchup" ? (
              <div className="community-posts-panel__matchup-details">
                <button
                  type="button"
                  className="secondary-button"
                  aria-expanded={showingFullMatchup}
                  onClick={() => void handleToggleFullMatchup()}
                  disabled={viewBusy}
                >
                  {communityMatchupViewerToggleLabel(showingFullMatchup)}
                </button>
                {showMatchupDetails ? (
                  (() => {
                    const details = formatCommunityMatchupDetails(
                      viewingAttachment,
                    );
                    return (
                      <div className="community-posts-panel__matchup-copy">
                        <strong>{details.headline}</strong>
                        <span>{details.score}</span>
                        {details.record ? <span>{details.record}</span> : null}
                        <span>Your five: {details.yourFive}</span>
                        <span>Their five: {details.theirFive}</span>
                      </div>
                    );
                  })()
                ) : null}
              </div>
            ) : null}
          </div>
        </div>,
            document.body,
          )
        : null}

      {reportPostId ? (
        <ReportPostDialog
          postId={reportPostId}
          busy={actionBusy === reportPostId}
          error={reportError}
          onSubmit={handleSubmitReport}
          onClose={() => {
            if (actionBusy === reportPostId) {
              return;
            }
            setReportPostId(null);
            setReportError(null);
          }}
        />
      ) : null}
    </div>
  );
}

const TIER_ACCENTS = [
  "#f59e0b",
  "#94a3b8",
  "#cd7f32",
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#84cc16",
];

const TIER_METAL_BY_NAME: Record<string, string> = {
  S: "#d4af37",
  A: "#c0c0c0",
  B: "#cd7f32",
};

function accentForTier(index: number, name: string): string {
  const metal = TIER_METAL_BY_NAME[name.trim().toUpperCase()];
  if (metal) return metal;
  return TIER_ACCENTS[index % TIER_ACCENTS.length]!;
}

interface TierListPublicViewerProps {
  detail: PublicTierListDetail;
  playersById: Map<string, Player>;
  onToggleLike: (liked: boolean) => void;
  onCopyLink: () => void;
  onDownload: () => void;
  onEditOwned?: () => void;
  onUnpublishOwned?: () => void;
  accountLinked?: boolean | null;
  comments: TierListComment[];
  commentsLoading: boolean;
  commentDraft: string;
  onCommentDraftChange: (value: string) => void;
  onSubmitComment: () => void;
  commentSubmitting: boolean;
  commentError: string | null;
  onSignIn?: () => void;
  viewerPlayerId?: string;
  onDeleteComment?: (commentId: string) => void;
  onReport?: () => void;
}

export function TierListPublicViewer({
  detail,
  playersById,
  onToggleLike,
  onCopyLink,
  onDownload,
  onEditOwned,
  onUnpublishOwned,
  accountLinked = null,
  comments,
  commentsLoading,
  commentDraft,
  onCommentDraftChange,
  onSubmitComment,
  commentSubmitting,
  commentError,
  onSignIn,
  viewerPlayerId,
  onDeleteComment,
  onReport,
}: TierListPublicViewerProps) {
  const accountReady = accountLinked === true;
  const commentRemaining = TIER_LIST_COMMENT_BODY_MAX - commentDraft.length;

  return (
    <div className="tier-list-hub__panel tier-list-hub__viewer">
      <div className="tier-list-hub__panel-header">
        <div className="tier-list__library-copy">
          <h2>{displayTierListTitle(detail.title)}</h2>
          <span>
            {detail.authorName} · {formatPublicTag(detail.authorTag)} ·{" "}
            {formatPublicTierListTime(detail.publishedAt)} ·{" "}
            {detail.likeCount} like{detail.likeCount === 1 ? "" : "s"}
            {detail.isOwner ? " · Yours" : ""}
          </span>
        </div>
        <div className="tier-list-hub__viewer-actions">
          <button
            type="button"
            className={`secondary-button${
              detail.likedByViewer ? " is-active-like" : ""
            }`}
            aria-pressed={detail.likedByViewer}
            disabled={!accountReady}
            title={
              accountReady
                ? undefined
                : accountLinked === null
                  ? "Checking account"
                  : "Create an account to like"
            }
            onClick={() => onToggleLike(!detail.likedByViewer)}
          >
            {detail.likedByViewer ? "Liked" : "Like"} · {detail.likeCount}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onDownload}
          >
            Download
          </button>
          <button type="button" className="secondary-button" onClick={onCopyLink}>
            Copy link
          </button>
          {!detail.isOwner && onReport ? (
            <button
              type="button"
              className="secondary-button"
              onClick={onReport}
            >
              Report
            </button>
          ) : null}
          {detail.isOwner && onEditOwned ? (
            <button
              type="button"
              className="secondary-button"
              onClick={onEditOwned}
            >
              Edit
            </button>
          ) : null}
          {detail.isOwner && onUnpublishOwned ? (
            <button
              type="button"
              className="secondary-button"
              onClick={onUnpublishOwned}
            >
              Unpublish
            </button>
          ) : null}
        </div>
      </div>

      <div className="tier-list__board">
        {detail.tiers.map((tier, index) => {
          const accent = accentForTier(index, tier.name);
          const tierPlayers = tier.playerIds
            .map((playerId) => playersById.get(playerId))
            .filter((player): player is Player => player != null);

          return (
            <div
              key={tier.id}
              className="tier-list__row"
              style={{ "--tier-accent": accent } as CSSProperties}
            >
              <div className="tier-list__tier-label tier-list__tier-label--readonly">
                <span className="tier-list__tier-name tier-list__tier-name--readonly">
                  {tier.name}
                </span>
              </div>
              <div className="tier-list__tier-drop">
                {tierPlayers.length > 0 ? (
                  tierPlayers.map((player) => (
                    <span
                      key={player.id}
                      className="tier-list__player tier-list__player--readonly"
                      style={
                        {
                          "--team-primary": getTeamGlowColor(player.team),
                        } as CSSProperties
                      }
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
                        </span>
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="tier-list__empty">Empty tier</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section className="tier-list-hub__comments" aria-label="Comments">
        <div className="tier-list-hub__comments-header">
          <h3>Comments</h3>
          <span>
            {comments.length} comment{comments.length === 1 ? "" : "s"}
          </span>
        </div>

        {commentsLoading ? (
          <p className="tier-list__hint" role="status">
            Loading comments…
          </p>
        ) : comments.length === 0 ? (
          <p className="tier-list-hub__comments-empty">
            Be the first to comment
          </p>
        ) : (
          <ul className="tier-list-hub__comments-list">
            {comments.map((comment) => {
              const isOwnComment = Boolean(
                viewerPlayerId && comment.playerId === viewerPlayerId,
              );
              return (
                <li key={comment.id}>
                  <div className="tier-list-hub__comment-meta">
                    <strong>
                      {comment.authorName} · {formatPublicTag(comment.authorTag)}
                    </strong>
                    <span>{formatPublicTierListTime(comment.createdAt)}</span>
                    {onDeleteComment && isOwnComment ? (
                      <button
                        type="button"
                        className="tier-list-hub__comment-delete"
                        aria-label="Delete comment"
                        title="Delete comment"
                        onClick={() => onDeleteComment(comment.id)}
                      >
                        <TrashIcon />
                      </button>
                    ) : null}
                  </div>
                  <p>{comment.body}</p>
                </li>
              );
            })}
          </ul>
        )}

        {accountLinked === null ? (
          <p className="tier-list__hint" role="status">
            Checking account…
          </p>
        ) : accountReady ? (
          <form
            className="tier-list-hub__comment-compose"
            onSubmit={(event) => {
              event.preventDefault();
              if (commentSubmitting || !commentDraft.trim()) {
                return;
              }
              onSubmitComment();
            }}
          >
            <textarea
              rows={2}
              maxLength={TIER_LIST_COMMENT_BODY_MAX}
              value={commentDraft}
              placeholder="Add a comment…"
              aria-label="Comment"
              onChange={(event) => onCommentDraftChange(event.target.value)}
            />
            <div className="tier-list-hub__comment-compose-actions">
              <span
                className={
                  commentRemaining <= 20
                    ? "tier-list-hub__comment-remaining is-tight"
                    : "tier-list-hub__comment-remaining"
                }
              >
                {commentRemaining}
              </span>
              <button
                type="submit"
                className="secondary-button"
                disabled={commentSubmitting || !commentDraft.trim()}
              >
                {commentSubmitting ? "Posting…" : "Comment"}
              </button>
            </div>
            {commentError ? (
              <p className="tier-list-hub__comment-error" role="alert">
                {commentError}
              </p>
            ) : null}
          </form>
        ) : (
          <div className="tier-list-hub__comment-signin">
            <p>{ACCOUNT_REQUIRED_TIER_LIST_COMMENT_MESSAGE}</p>
            {onSignIn ? (
              <button
                type="button"
                className="secondary-button"
                onClick={onSignIn}
              >
                Sign in
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
