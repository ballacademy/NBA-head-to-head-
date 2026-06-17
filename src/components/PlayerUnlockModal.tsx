import { useMemo } from "react";
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
}

export function PlayerUnlockModal({ offer, onSelect }: PlayerUnlockModalProps) {
  const options = useMemo(() => {
    const uniqueIds = [...new Set([offer.optionA, offer.optionB])];

    return uniqueIds
      .map((playerId) => playersById.get(playerId))
      .filter((player): player is NonNullable<typeof player> => Boolean(player));
  }, [offer.optionA, offer.optionB]);

  const isWinOffer = offer.kind === "win";

  return (
    <div className="unlock-modal" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
      <div className="unlock-modal__panel panel">
        <p className="eyebrow">
          {isWinOffer ? "New star unlocked" : "New scrub unlocked"}
        </p>
        <h2 id="unlock-title">
          {isWinOffer
            ? "Choose one All-Star for your collection"
            : "Choose one Scrub for your collection"}
        </h2>
        <p className="unlock-modal__copy">
          {isWinOffer
            ? "Pick a 2026 All-Star or recent All-Star (2023–2025) to add to your draft pool. Superstar cards are extra rare — grab them when they appear."
            : "Pick a player to add to your draft pool. Super Scrub cards are extra rare — embrace the chaos when they appear."}
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
                  showJersey
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
                  <PlayerDraftStats player={player} />
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
}
