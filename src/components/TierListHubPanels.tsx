import type { Player } from "../lib/types";
import {
  formatPublicTierListTime,
  type PublicTierListBrowseFilters,
  type PublicTierListDateWindow,
  type PublicTierListDetail,
  type PublicTierListSort,
  type PublicTierListSummary,
} from "../lib/tierListCommunity";
import { formatPublicTag } from "../lib/playerIdentity";
import type { TierListLibrary, TierListSavedDocument } from "../lib/tierList";
import {
  displayTierListTitle,
  sortTierListLibraryDocuments,
} from "../lib/tierList";
import { getTeamGlowColor } from "../lib/teamColors";
import type { CSSProperties } from "react";
import { PlayerTeamIcon } from "./PlayerTeamIcon";

const formatSavedAt = (savedAt: number) =>
  new Date(savedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

interface TierListHubHomeProps {
  onCreate: () => void;
  onOpenMine: () => void;
  onOpenPublic: () => void;
}

export function TierListHubHome({
  onCreate,
  onOpenMine,
  onOpenPublic,
}: TierListHubHomeProps) {
  return (
    <div className="landing-hub__links tier-list-hub__links">
      <button
        type="button"
        className="landing-hub__link-button hub-accent hub-accent--tiers"
        onClick={onCreate}
      >
        Create a new tier list
      </button>
      <button
        type="button"
        className="landing-hub__link-button hub-accent hub-accent--ranked"
        onClick={onOpenMine}
      >
        My tier lists
      </button>
      <button
        type="button"
        className="landing-hub__link-button hub-accent hub-accent--neutral"
        onClick={onOpenPublic}
      >
        Public tier lists
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
}

export function TierListMinePanel({
  library,
  sort,
  onSortChange,
  likeCountByPublishedId,
  onOpen,
  onDelete,
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
        <p className="tier-list__hint">
          No saved lists yet. Create one and tap Save to keep it here.
        </p>
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
}: TierListPublicPanelProps) {
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

      {loading ? (
        <p className="tier-list__hint">Loading public lists…</p>
      ) : lists.length === 0 ? (
        <p className="tier-list__hint">
          No public lists match these filters. Publish one from the editor to
          share it here.
        </p>
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
                    onClick={() => onToggleLike(entry.id, !entry.likedByViewer)}
                  >
                    {entry.likedByViewer ? "Liked" : "Like"}
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

const TIER_ACCENTS = [
  "#f59e0b",
  "#94a3b8",
  "#cd7f32",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
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
            {detail.likeCount} like{detail.likeCount === 1 ? "" : "s"}
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
              onClick={() => onToggleLike(!detail.likedByViewer)}
            >
              {detail.likedByViewer ? "Liked" : "Like"}
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
