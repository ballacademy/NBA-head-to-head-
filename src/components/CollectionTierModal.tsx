import { useRef } from "react";
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

export function CollectionTierModal({
  tier,
  players,
  total,
  onClose,
}: CollectionTierModalProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { containerRef } = useDialogA11y({
    onClose,
    initialFocusRef: closeRef,
  });

  const label = COLLECTION_TIER_LABELS[tier];

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
          <ul className="collection-tier-modal__list">
            {players.map((player) => (
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
