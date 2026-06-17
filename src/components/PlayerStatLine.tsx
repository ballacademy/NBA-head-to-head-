import { PlayerDraftStats } from "./PlayerDraftStats";
import type { Player } from "../lib/types";
import { PlayerTeamIcon } from "./PlayerTeamIcon";

interface PlayerStatLineProps {
  player: Player;
  pickNumber?: number;
}

export function PlayerStatLine({ player, pickNumber }: PlayerStatLineProps) {
  return (
    <div className="player-stat-line">
      <PlayerTeamIcon
        team={player.team}
        position={player.position}
        jerseyNumber={player.jerseyNumber}
        showJersey
        label={`${player.name}, ${player.team} ${player.position}`}
      />
      <div>
        <strong>{player.name}</strong>
        <span className="player-stat-line__meta">
          {player.position} • {player.team}
          {pickNumber ? ` • Pick ${pickNumber}` : ""}
        </span>
        <PlayerDraftStats player={player} />
      </div>
    </div>
  );
}
