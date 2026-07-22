import { useMemo } from "react";
import { createPortal } from "react-dom";
import { PlayerDraftStats } from "./PlayerDraftStats";
import { isSuperstarPlayer } from "../lib/allStars";
import { playersById } from "../lib/playerPool";
import type { UnlockOffer } from "../lib/playerCollection";
import { isSuperScrubPlayer } from "../lib/playerTiers";
import { PlayerTeamIcon } from "./PlayerTeamIcon";
import { PlayerRarityBadge } from "./PlayerRarityBadge";

interface PlayerUnlockModalProps {
  offer: UnlockOffer;
  onSelect: (playerId: string) => void;
  variant?: "full" | "compact";
}

export function PlayerUnlockModal({
  offer,
  onSelect,
  variant = "full",
}: PlayerUnlockModalProps) {
  const options = useMemo(() => {
    const uniqueIds = [...new Set([offer.optionA, offer.optionB])];

    return uniqueIds
      .map((playerId) => playersById.get(playerId))
      .filter((player): player is NonNullable<typeof player> => Boolean(player));
  }, [offer.optionA, offer.optionB]);

  const isWinOffer = offer.kind === "win";
  const isCompact = variant === "compact";

  const modal = (
    <div
      className={`unlock-modal${isCompact ? " unlock-modal--compact" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-title"
    >
      <div className={`unlock-modal__panel panel${isCompact ? " unlock-modal__panel--compact" : ""}`}>
        <p className="eyebrow">
          {isWinOffer ? "New star unlocked" : "New Scrub unlocked"}
        </p>
        <h2 id="unlock-title">
          {isCompact
            ? isWinOffer
              ? "Choose your star"
              : "Choose your Scrub"
            : isWinOffer
              ? "Choose one All-Star for your collection"
              : "Choose one Scrub for your collection"}
        </h2>
        <p className="unlock-modal__copy">
          {isCompact
            ? "Pick one player to add to your collection before drafting again."
            : isWinOffer
              ? "Pick a 2026 All-Star or recent All-Star (2023–2025) to add to your draft pool. Superstar cards are extra rare — grab them when they appear. You need to choose before drafting again."
              : "Pick a player to add to your draft pool. Super Scrub cards are extra rare — embrace the chaos when they appear. You need to choose before drafting again."}
        </p>

        <div className="unlock-modal__options">
          {options.map((player) => {
            const premium = isWinOffer
              ? isSuperstarPlayer(player)
              : isSuperScrubPlayer(player);

            return (
              <button
                type="button"
                key={player.id}
                className={`unlock-option${
                  isCompact ? " unlock-option--compact" : ""
                }${
                  premium
                    ? isWinOffer
                      ? " unlock-option--superstar"
                      : " unlock-option--super-scrub"
                    : ""
                }`}
                onClick={() => onSelect(player.id)}
              >
                <PlayerTeamIcon
                  team={player.team}
                  position={player.position}
                  jerseyNumber={player.jerseyNumber}
                  showJersey={!isCompact}
                  label={player.name}
                />
                <div className="unlock-option__body">
                  <div className="unlock-option__title-row">
                    <strong className="unlock-option__name">{player.name}</strong>
                    <PlayerRarityBadge player={player} />
                  </div>
                  <span className="unlock-option__meta">
                    {player.team} • {player.position}
                  </span>
                  {isCompact ? null : <PlayerDraftStats player={player} />}
                </div>
                {premium ? (
                  <span className="unlock-option__glow" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
