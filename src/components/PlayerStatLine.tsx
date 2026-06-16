import { formatPlayerDraftStats } from "../lib/defenseGrade";
import type { Player } from "../lib/types";
import { PlayerTeamIcon } from "./PlayerTeamIcon";

interface PlayerStatLineProps {
  player: Player;
  pickNumber?: number;
}

export function PlayerStatLine({ player, pickNumber }: PlayerStatLineProps) {
  const stats = formatPlayerDraftStats(player);

  return (
    <div className="player-stat-line">
      <PlayerTeamIcon
        team={player.team}
        position={player.position}
        label={`${player.name}, ${player.team} ${player.position}`}
      />
      <div>
        <strong>{player.name}</strong>
        <span className="player-stat-line__meta">
          {player.position} • {player.team}
          {pickNumber ? ` • Pick ${pickNumber}` : ""}
        </span>
        <span className="player-stat-line__stats">{stats.summary}</span>
      </div>
    </div>
  );
}
