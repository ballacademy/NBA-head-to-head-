import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  COLLECTION_TIER_LABELS,
  type CollectionTier,
} from "../lib/playerCollection";
import type { Player } from "../lib/types";
import { formatPlayerPositions } from "../lib/playerPool";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { EmptyState } from "./EmptyState";
import { PlayerRarityBadge } from "./PlayerRarityBadge";
import { PlayerTeamIcon } from "./PlayerTeamIcon";

interface CollectionTierModalProps {
  tier: CollectionTier;
  players: Player[];
  total: number;
  onClose: () => void;
}

type CollectionSort = "name" | "team";

const matchesQuery = (player: Player, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const positions = formatPlayerPositions(player.positions).toLowerCase();
  return (
    player.name.toLowerCase().includes(normalized) ||
    player.team.toLowerCase().includes(normalized) ||
    positions.includes(normalized)
  );
};

const sortPlayers = (players: Player[], sort: CollectionSort) => {
  const next = [...players];
  next.sort((left, right) => {
    if (sort === "team") {
      const teamCompare = left.team.localeCompare(right.team);
      if (teamCompare !== 0) {
        return teamCompare;
      }
    }
    return left.name.localeCompare(right.name);
  });
  return next;
};

export function CollectionTierModal({
  tier,
  players,
  total,
  onClose,
}: CollectionTierModalProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CollectionSort>("name");
  const { containerRef } = useDialogA11y({
    onClose,
    initialFocusRef: closeRef,
  });

  const label = COLLECTION_TIER_LABELS[tier];
  const filteredPlayers = useMemo(() => {
    const matched = players.filter((player) => matchesQuery(player, query));
    return sortPlayers(matched, sort);
  }, [players, query, sort]);

  const modal = (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className="unlock-modal collection-tier-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-tier-title"
      onClick={onClose}
    >
      <div
        className="unlock-modal__panel panel collection-tier-modal__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Collection</p>
        <h2 id="collection-tier-title">{label}</h2>
        <p className="collection-tier-modal__summary">
          {players.length} unlocked · {total} in pool
        </p>

        {players.length > 0 ? (
          <div className="collection-tier-modal__filters">
            <div className="collection-tier-modal__search-row">
              <label className="collection-tier-modal__search">
                <span>Search</span>
                <input
                  type="search"
                  value={query}
                  placeholder="Name, team, position…"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="collection-tier-modal__sort">
                <span>Sort</span>
                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as CollectionSort)
                  }
                >
                  <option value="name">Name</option>
                  <option value="team">Team</option>
                </select>
              </label>
            </div>
            <p className="collection-tier-modal__count">
              Showing {filteredPlayers.length} of {players.length}
            </p>
          </div>
        ) : null}

        {players.length > 0 ? (
          filteredPlayers.length > 0 ? (
            <ul className="collection-tier-modal__list">
              {filteredPlayers.map((player) => (
                <li key={player.id} className="collection-tier-modal__row">
                  <PlayerTeamIcon
                    team={player.team}
                    position={player.position}
                    jerseyNumber={player.jerseyNumber}
                    bbrPlayerId={player.bbrPlayerId}
                    showJersey
                    label={player.name}
                  />
                  <div className="collection-tier-modal__body">
                    <strong className="collection-tier-modal__name">
                      {player.name}
                    </strong>
                    <span className="collection-tier-modal__meta">
                      {player.team} · {formatPlayerPositions(player.positions)}
                    </span>
                  </div>
                  <PlayerRarityBadge player={player} compact />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="collection-tier-modal__empty"
              message="No players match your search."
            />
          )
        ) : (
          <EmptyState
            className="collection-tier-modal__empty"
            message={`No unlocked ${label} yet.`}
          />
        )}

        <button
          type="button"
          ref={closeRef}
          className="secondary-button"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
