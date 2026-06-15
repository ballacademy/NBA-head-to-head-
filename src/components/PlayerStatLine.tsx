import { formatPlayerDraftStats } from "../lib/defenseGrade";
import type { Player } from "../lib/types";

interface PlayerStatLineProps {
  player: Player;
  pickNumber?: number;
}

export function PlayerStatLine({ player, pickNumber }: PlayerStatLineProps) {
  const stats = formatPlayerDraftStats(player);

  return (
    <div className="player-stat-line">
      {pickNumber ? <span className="pick-number">{pickNumber}</span> : null}
      <div>
        <strong>{player.name}</strong>
        <span className="player-stat-line__meta">
          {player.position} • {player.team}
        </span>
        <span className="player-stat-line__stats">{stats.summary}</span>
      </div>
    </div>
  );
}
