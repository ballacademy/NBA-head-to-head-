import type { Player } from "../lib/types";
import {
  formatPublicTierListTime,
  type PublicTierListBrowseFilters,
  type PublicTierListDateWindow,
  type PublicTierListDetail,
  type PublicTierListSort,
  type PublicTierListSummary,
} from "../lib/tierListCommunity";
import {
  COMMUNITY_POST_BODY_MAX,
  formatCommunityPostTime,
  type CommunityPost,
  type CommunityPostSort,
} from "../lib/communityPosts";
import {
  buildShareCardInputFromAttachment,
  formatCommunityAttachmentSummary,
  formatCommunityMatchupDetails,
  type CommunityPostAttachment,
} from "../lib/communityShareables";
import { createLineupShareCardBlob } from "../lib/lineupShareCard";
import { formatPublicTag } from "../lib/playerIdentity";
import type { TierListLibrary, TierListSavedDocument } from "../lib/tierList";
import {
  displayTierListTitle,
  sortTierListLibraryDocuments,
} from "../lib/tierList";
import { getTeamGlowColor } from "../lib/teamColors";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { PlayerTeamIcon } from "./PlayerTeamIcon";
import { AccountRequiredNote } from "./AccountRequiredNote";

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
}

export function TierListHubHome({
  onOpenPosts,
  onOpenTiers,
}: TierListHubHomeProps) {
  return (
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
            Share takes and attach recent results or published lists
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
            Browse public boards, open yours, or create a new list
          </span>
        </span>
        <span className="play-hub-chooser__chevron" aria-hidden="true">
          ›
        </span>
      </button>
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
}: TierListPublicPanelProps) {
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
                ) : (
                  <button
                    type="button"
                    className={`secondary-button${
                      entry.likedByViewer ? " is-active-like" : ""
                    }`}
                    aria-pressed={entry.likedByViewer}
                    onClick={() => onToggleLike(entry.id, !entry.likedByViewer)}
                  >
                    {entry.likedByViewer ? "Liked" : "Like"} · {entry.likeCount}
                  </button>
                )}
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
  accountLinked: boolean;
  sort: CommunityPostSort;
  onSortChange: (sort: CommunityPostSort) => void;
  shareables: CommunityPostAttachment[];
  selectedAttachment: CommunityPostAttachment | null;
  onSelectAttachment: (attachment: CommunityPostAttachment | null) => void;
  onToggleLike: (postId: string, liked: boolean) => void;
  onDeletePost?: (postId: string) => void;
  viewerPlayerId?: string;
  onOpenTiers?: () => void;
  playersById: Map<string, Player>;
}

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
  viewerPlayerId = "",
  onOpenTiers,
  playersById,
}: CommunityPostsPanelProps) {
  const remaining = COMMUNITY_POST_BODY_MAX - draft.length;
  const [viewingPostId, setViewingPostId] = useState<string | null>(null);
  const [viewingAttachment, setViewingAttachment] =
    useState<CommunityPostAttachment | null>(null);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [viewBusy, setViewBusy] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [showMatchupDetails, setShowMatchupDetails] = useState(false);

  useEffect(() => {
    return () => {
      if (viewImageUrl) {
        URL.revokeObjectURL(viewImageUrl);
      }
    };
  }, [viewImageUrl]);

  const closeAttachmentViewer = () => {
    setViewingPostId(null);
    setViewingAttachment(null);
    setShowMatchupDetails(false);
    setViewBusy(false);
    setViewError(null);
    setViewImageUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  };

  const handleViewAttachment = async (
    postId: string,
    attachment: CommunityPostAttachment,
  ) => {
    if (attachment.kind === "tierList") {
      return;
    }

    setViewingPostId(postId);
    setViewingAttachment(attachment);
    setShowMatchupDetails(false);
    setViewBusy(true);
    setViewError(null);
    setViewImageUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });

    try {
      const input = buildShareCardInputFromAttachment(attachment, playersById);
      if (!input) {
        setViewError("Could not rebuild that lineup image.");
        setViewBusy(false);
        return;
      }
      const blob = await createLineupShareCardBlob(input);
      setViewImageUrl(URL.createObjectURL(blob));
    } catch {
      setViewError("Could not open that lineup image.");
    } finally {
      setViewBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const attachmentKey = (entry: CommunityPostAttachment) =>
    entry.kind === "tierList"
      ? `${entry.kind}:${entry.publishedId}`
      : `${entry.kind}:${entry.savedAt}`;

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

      {!accountLinked ? (
        <AccountRequiredNote className="account-required-note--inline">
          Create an account to post or like. Anyone can browse.
        </AccountRequiredNote>
      ) : null}

      <form className="community-posts-panel__compose" onSubmit={handleSubmit}>
        <label className="tier-list__search community-posts-panel__field">
          <span>New post</span>
          <textarea
            value={draft}
            maxLength={COMMUNITY_POST_BODY_MAX}
            rows={3}
            placeholder="Share a short take (tier lists, Daily, matchups…)"
            onChange={(event) => onDraftChange(event.target.value)}
            disabled={!accountLinked || submitting}
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
            disabled={!accountLinked || submitting || shareables.length === 0}
          >
            <option value="">No attachment</option>
            {shareables.map((entry) => (
              <option key={attachmentKey(entry)} value={attachmentKey(entry)}>
                {formatCommunityAttachmentSummary(entry)}
              </option>
            ))}
          </select>
        </label>
        {shareables.length === 0 ? (
          <p className="community-posts-panel__attach-hint">
            Finish a Daily or H2H matchup, or publish a tier list, to attach it
            here.
          </p>
        ) : null}

        {selectedAttachment ? (
          <p className="community-posts-panel__attachment-preview" role="status">
            Attaching: {formatCommunityAttachmentSummary(selectedAttachment)}
          </p>
        ) : null}

        <div className="community-posts-panel__compose-meta">
          <span className={remaining < 40 ? "is-tight" : undefined}>
            {remaining} left
          </span>
          <button
            type="submit"
            className="hub-cta"
            disabled={!accountLinked || submitting || draft.trim().length === 0}
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

      {likeError ? (
        <p className="form-error community-posts-panel__like-error" role="alert">
          {likeError}
        </p>
      ) : null}

      {loading && posts.length === 0 ? (
        <p className="hub-empty" role="status">
          Loading…
        </p>
      ) : posts.length === 0 ? (
        <div className="hub-empty">
          <p>No posts yet. Be the first to share something short.</p>
          {onOpenTiers ? (
            <div className="hub-empty__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={onOpenTiers}
              >
                Browse tier lists
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="tier-list__library-list community-posts-panel__list">
          {posts.map((post) => (
            <li key={post.id} className="tier-list__library-item community-posts-panel__item">
              <div className="tier-list__library-copy">
                <strong>
                  {post.authorName} · {formatPublicTag(post.authorTag)}
                </strong>
                <span>{formatCommunityPostTime(post.createdAt)}</span>
                <p className="community-posts-panel__body">{post.body}</p>
                {post.attachment ? (
                  <div className="community-posts-panel__attachment">
                    <p className="community-posts-panel__attachment-summary">
                      {formatCommunityAttachmentSummary(post.attachment)}
                    </p>
                    {post.attachment.kind === "matchup" ||
                    post.attachment.kind === "lineup" ? (
                      <button
                        type="button"
                        className="secondary-button community-posts-panel__view-attach"
                        onClick={() =>
                          void handleViewAttachment(post.id, post.attachment!)
                        }
                      >
                        View lineup
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="tier-list__library-actions">
                <button
                  type="button"
                  className={`secondary-button${
                    post.likedByViewer ? " is-active-like" : ""
                  }`}
                  aria-pressed={post.likedByViewer}
                  disabled={!accountLinked}
                  title={
                    accountLinked ? undefined : "Create an account to like"
                  }
                  onClick={() => onToggleLike(post.id, !post.likedByViewer)}
                >
                  {post.likedByViewer ? "Liked" : "Like"} · {post.likeCount}
                </button>
                {onDeletePost &&
                viewerPlayerId &&
                post.playerId === viewerPlayerId ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onDeletePost(post.id)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {loading && posts.length > 0 ? (
        <p className="tier-list__hint" role="status">
          Updating…
        </p>
      ) : null}

      {hasMore && onLoadMore && !loading ? (
        <button
          type="button"
          className="secondary-button"
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}

      {viewingPostId ? (
        <div
          className="community-posts-panel__viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Attached lineup"
          onClick={closeAttachmentViewer}
        >
          <div
            className="community-posts-panel__viewer-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="community-posts-panel__viewer-header">
              <h3>Shared lineup</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={closeAttachmentViewer}
              >
                Close
              </button>
            </div>
            {viewBusy ? (
              <p className="hub-empty" role="status">
                Loading…
              </p>
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
                alt="Shared lineup"
              />
            ) : null}
            {viewingAttachment?.kind === "matchup" ? (
              <div className="community-posts-panel__matchup-details">
                <button
                  type="button"
                  className="secondary-button"
                  aria-expanded={showMatchupDetails}
                  onClick={() => setShowMatchupDetails((current) => !current)}
                >
                  {showMatchupDetails ? "Hide matchup" : "Show matchup"}
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
                        <span>Your five: {details.yourFive}</span>
                        <span>Their five: {details.theirFive}</span>
                      </div>
                    );
                  })()
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
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
  onEditOwned?: () => void;
  onUnpublishOwned?: () => void;
}

export function TierListPublicViewer({
  detail,
  playersById,
  onToggleLike,
  onCopyLink,
  onEditOwned,
  onUnpublishOwned,
}: TierListPublicViewerProps) {
  return (
    <div className="tier-list-hub__panel tier-list-hub__viewer">
      <div className="tier-list-hub__panel-header">
        <div className="tier-list__library-copy">
          <h2>{detail.title}</h2>
          <span>
            {detail.authorName} · {formatPublicTag(detail.authorTag)} ·{" "}
            {formatPublicTierListTime(detail.publishedAt)} ·{" "}
            {detail.likeCount} like{detail.likeCount === 1 ? "" : "s"}
            {detail.isOwner ? " · Yours" : ""}
          </span>
        </div>
        <div className="tier-list__library-actions">
          <button type="button" className="secondary-button" onClick={onCopyLink}>
            Copy link
          </button>
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
          {!detail.isOwner ? (
            <button
              type="button"
              className={`secondary-button${
                detail.likedByViewer ? " is-active-like" : ""
              }`}
              aria-pressed={detail.likedByViewer}
              onClick={() => onToggleLike(!detail.likedByViewer)}
            >
              {detail.likedByViewer ? "Liked" : "Like"} · {detail.likeCount}
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
    </div>
  );
}
