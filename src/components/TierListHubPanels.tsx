import type { Player } from "../lib/types";
import {
  formatPublicTierListTime,
  type PublicTierListDetail,
  type PublicTierListSort,
  type PublicTierListSummary,
} from "../lib/tierListCommunity";
import { formatPublicTag } from "../lib/playerIdentity";
import type { TierListLibrary, TierListSavedDocument } from "../lib/tierList";
import { displayTierListTitle } from "../lib/tierList";
import { getTeamGlowColor } from "../lib/teamColors";
import type { CSSProperties } from "react";

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
        className="landing-hub__link-button"
        onClick={onCreate}
      >
        Create a new tier list
      </button>
      <button
        type="button"
        className="landing-hub__link-button"
        onClick={onOpenMine}
      >
        My tier lists
      </button>
      <button
        type="button"
        className="landing-hub__link-button"
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
  onOpen: (documentId: string) => void;
  onDelete: (documentId: string) => void;
}

export function TierListMinePanel({
  library,
  sort,
  onSortChange,
  onOpen,
  onDelete,
}: TierListMinePanelProps) {
  const documents = [...library.documents].sort((left, right) => {
    if (sort === "likes") {
      // Local library has no likes — fall back to recency.
      return right.savedAt - left.savedAt;
    }
    return right.savedAt - left.savedAt;
  });

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
          {documents.map((document: TierListSavedDocument) => (
            <li key={document.id} className="tier-list__library-item">
              <div className="tier-list__library-copy">
                <strong>{displayTierListTitle(document.title)}</strong>
                <span>
                  Saved {formatSavedAt(document.savedAt)}
                  {document.publishedId ? " · Published" : ""}
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
          ))}
        </ul>
      )}
    </div>
  );
}

interface TierListPublicPanelProps {
  lists: PublicTierListSummary[];
  loading: boolean;
  sort: PublicTierListSort;
  onSortChange: (sort: PublicTierListSort) => void;
  onOpen: (id: string) => void;
  onToggleLike: (id: string, liked: boolean) => void;
}

export function TierListPublicPanel({
  lists,
  loading,
  sort,
  onSortChange,
  onOpen,
  onToggleLike,
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

      {loading ? (
        <p className="tier-list__hint">Loading public lists…</p>
      ) : lists.length === 0 ? (
        <p className="tier-list__hint">
          No public lists yet. Publish one from the editor to share it here.
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
                <button
                  type="button"
                  className={`secondary-button${
                    entry.likedByViewer ? " is-active-like" : ""
                  }`}
                  onClick={() => onToggleLike(entry.id, !entry.likedByViewer)}
                >
                  {entry.likedByViewer ? "Liked" : "Like"}
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
}

export function TierListPublicViewer({
  detail,
  playersById,
  onToggleLike,
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
        <button
          type="button"
          className={`secondary-button${
            detail.likedByViewer ? " is-active-like" : ""
          }`}
          onClick={() => onToggleLike(!detail.likedByViewer)}
        >
          {detail.likedByViewer ? "Liked" : "Like"}
        </button>
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
