import { PlayerDraftStats } from "./PlayerDraftStats";
import type { DailyDraftGoal } from "../lib/dailyDraftGoals";
import { formatPlayerGoalStat } from "../lib/dailyGoalScoring";
import type { Player } from "../lib/types";
import { PlayerTeamIcon } from "./PlayerTeamIcon";

interface PlayerStatLineProps {
  player: Player;
  pickNumber?: number;
  compact?: boolean;
  dailyGoal?: DailyDraftGoal;
}

export function PlayerStatLine({
  player,
  pickNumber,
  compact = false,
  dailyGoal,
}: PlayerStatLineProps) {
  const goalStat = dailyGoal ? formatPlayerGoalStat(player, dailyGoal) : null;

  return (
    <div className={`player-stat-line${compact ? " player-stat-line--compact" : ""}`}>
      <PlayerTeamIcon
        team={player.team}
        position={player.position}
        jerseyNumber={player.jerseyNumber}
        showJersey
        label={`${player.name}, ${player.team} ${player.position}`}
      />
      <div>
        <strong>
          {player.name}
          {goalStat ? (
            <span className="player-stat-line__goal-stat"> · {goalStat}</span>
          ) : null}
        </strong>
        <span className="player-stat-line__meta">
          {player.position} • {player.team}
          {pickNumber ? ` • Pick ${pickNumber}` : ""}
        </span>
        {dailyGoal ? null : <PlayerDraftStats player={player} />}
      </div>
    </div>
  );
}
