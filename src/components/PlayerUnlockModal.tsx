import { useMemo } from "react";
import { isSuperstarPlayer } from "../lib/allStars";
import { formatPlayerDraftStats } from "../lib/defenseGrade";
import { playersById } from "../lib/playerPool";
import type { UnlockOffer } from "../lib/playerCollection";
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

  return (
    <div className="unlock-modal" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
      <div className="unlock-modal__panel panel">
        <p className="eyebrow">New player unlocked</p>
        <h2 id="unlock-title">Choose one All-Star for your collection</h2>
        <p className="unlock-modal__copy">
          Pick a player to add to your draft pool. Superstar cards are rare —
          grab them when they appear.
        </p>

        <div className="unlock-modal__options">
          {options.map((player) => {
            const stats = formatPlayerDraftStats(player);
            const superstar = isSuperstarPlayer(player);

            return (
              <button
                type="button"
                key={player.id}
                className={`unlock-option${superstar ? " unlock-option--superstar" : ""}`}
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
                    <strong>{player.name}</strong>
                    <PlayerRarityBadge player={player} />
                  </div>
                  <span className="unlock-option__meta">
                    {player.team} • {player.position}
                  </span>
                  <span className="unlock-option__stats">{stats.summary}</span>
                </div>
                {superstar ? (
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
