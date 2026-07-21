import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  COLLECTION_TIER_LABELS,
  type CollectionTier,
} from "../lib/playerCollection";
import type { Player } from "../lib/types";
import { formatPlayerPositions } from "../lib/playerPool";
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
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const label = COLLECTION_TIER_LABELS[tier];

  const modal = (
    <div
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
          <p className="collection-tier-modal__empty">
            No unlocked {label.toLowerCase()} yet.
          </p>
        )}

        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
