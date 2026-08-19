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
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CollectionSort>("name");
  const initialFocusRef = players.length > 0 ? searchRef : closeRef;
  const { containerRef } = useDialogA11y({
    onClose,
    initialFocusRef,
    lockScroll: true,
  });

  const label = COLLECTION_TIER_LABELS[tier];
  const trimmedQuery = query.trim();
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
        <header className="collection-tier-modal__header">
          <div className="collection-tier-modal__heading">
            <p className="eyebrow">Collection</p>
            <h2 id="collection-tier-title">{label}</h2>
          </div>
          <p className="collection-tier-modal__summary">
            <span className="collection-tier-modal__summary-count">
              {players.length}
            </span>
            <span className="collection-tier-modal__summary-sep">/</span>
            <span>{total}</span>
            <span className="collection-tier-modal__summary-label">
              unlocked
            </span>
          </p>
        </header>

        {players.length > 0 ? (
          <div className="collection-tier-modal__toolbar">
            <input
              ref={searchRef}
              className="collection-tier-modal__search"
              type="search"
              value={query}
              placeholder="Search name, team, position…"
              aria-label="Search players"
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="collection-tier-modal__sort"
              value={sort}
              aria-label="Sort players"
              onChange={(event) =>
                setSort(event.target.value as CollectionSort)
              }
            >
              <option value="name">Name</option>
              <option value="team">Team</option>
            </select>
          </div>
        ) : null}

        {players.length > 0 && trimmedQuery ? (
          <p className="collection-tier-modal__count" aria-live="polite">
            {filteredPlayers.length} match
            {filteredPlayers.length === 1 ? "" : "es"}
          </p>
        ) : null}

        <div className="collection-tier-modal__body-scroll">
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
                    <div className="collection-tier-modal__copy">
                      <strong className="collection-tier-modal__name">
                        {player.name}
                      </strong>
                      <span className="collection-tier-modal__meta">
                        {player.team} ·{" "}
                        {formatPlayerPositions(player.positions)}
                      </span>
                    </div>
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
        </div>

        <footer className="collection-tier-modal__footer">
          <button
            type="button"
            ref={closeRef}
            className="secondary-button collection-tier-modal__close"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
