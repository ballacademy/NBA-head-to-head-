import { PlayerDraftStats } from "./PlayerDraftStats";
import { LimitedSampleBadge } from "./LimitedSampleBadge";
import { PlayerRarityBadge } from "./PlayerRarityBadge";
import type { DailyDraftGoal } from "../lib/dailyDraftGoals";
import { formatPlayerGoalStat } from "../lib/dailyGoalScoring";
import { formatPlayerPositions } from "../lib/playerPool";
import type { Player } from "../lib/types";
import { PlayerTeamIcon } from "./PlayerTeamIcon";

interface PlayerStatLineProps {
  player: Player;
  pickNumber?: number;
  compact?: boolean;
  dailyGoal?: DailyDraftGoal;
  allTimeMode?: boolean;
}

export function PlayerStatLine({
  player,
  pickNumber,
  compact = false,
  dailyGoal,
  allTimeMode = false,
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
      <div className="player-stat-line__content">
        <div className="player-stat-line__title-row">
          <strong className="player-stat-line__name">
            {player.name}
            <span className="player-stat-line__meta">
              {" "}
              {player.team} · {formatPlayerPositions(player.positions)}
              {pickNumber ? ` · Pick ${pickNumber}` : ""}
            </span>
            {goalStat ? (
              <span className="player-stat-line__goal-stat"> · {goalStat}</span>
            ) : null}
          </strong>
          <span className="player-stat-line__badges">
            <LimitedSampleBadge player={player} compact={compact} />
            <PlayerRarityBadge
              player={player}
              allTimeMode={allTimeMode}
              compact={compact}
            />
          </span>
        </div>
        {dailyGoal ? null : (
          <PlayerDraftStats player={player} variant={compact ? "inline" : "pills"} />
        )}
      </div>
    </div>
  );
}
