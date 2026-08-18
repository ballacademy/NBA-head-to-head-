import { PlayerDraftStats } from "./PlayerDraftStats";
import { LimitedSampleBadge } from "./LimitedSampleBadge";
import { PlayerRarityBadge } from "./PlayerRarityBadge";
import type { DailyDraftGoal } from "../lib/dailyDraftGoals";
import { formatPlayerGoalStat } from "../lib/dailyGoalScoring";
import { formatPlayerPositions } from "../lib/playerPool";
import type { Player, Position } from "../lib/types";
import { PlayerTeamIcon } from "./PlayerTeamIcon";

interface PlayerStatLineProps {
  player: Player;
  pickNumber?: number;
  compact?: boolean;
  /** When false, hide PTS/REB/… draft stats (used for mobile compare). */
  showDraftStats?: boolean;
  dailyGoal?: DailyDraftGoal;
  allTimeMode?: boolean;
  /** Unique PG–C slot on matchup results; listed eligibility stays elsewhere. */
  lineupSlot?: Position;
}

export function PlayerStatLine({
  player,
  pickNumber,
  compact = false,
  showDraftStats = true,
  dailyGoal,
  allTimeMode = false,
  lineupSlot,
}: PlayerStatLineProps) {
  const goalStat = dailyGoal ? formatPlayerGoalStat(player, dailyGoal) : null;
  const isDaily = Boolean(dailyGoal);
  const displayPosition = lineupSlot ?? player.position;
  const positions = lineupSlot ?? formatPlayerPositions(player.positions);
  const meta = `${player.team} · ${positions}${
    pickNumber ? ` · Pick ${pickNumber}` : ""
  }`;

  return (
    <div
      className={`player-stat-line${compact ? " player-stat-line--compact" : ""}${
        isDaily ? " player-stat-line--daily" : ""
      }${!showDraftStats ? " player-stat-line--stats-collapsed" : ""}`}
    >
      <PlayerTeamIcon
        team={player.team}
        position={displayPosition}
        jerseyNumber={player.jerseyNumber}
        bbrPlayerId={player.bbrPlayerId}
        showJersey
        label={`${player.name}, ${player.team} ${displayPosition}`}
      />
      <div className="player-stat-line__content">
        {isDaily ? (
          <>
            <strong className="player-stat-line__name player-stat-line__name--full">
              {player.name}
            </strong>
            <span className="player-stat-line__meta player-stat-line__meta--block">
              {meta}
            </span>
            <div className="player-stat-line__facts">
              {goalStat ? (
                <span className="player-stat-line__goal-stat">{goalStat}</span>
              ) : null}
              <span className="player-stat-line__badges">
                <LimitedSampleBadge player={player} compact={compact} />
                <PlayerRarityBadge
                  player={player}
                  allTimeMode={allTimeMode}
                  compact={compact}
                />
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="player-stat-line__title-row">
              <strong className="player-stat-line__name">
                {player.name}
                <span className="player-stat-line__meta"> {meta}</span>
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
            {showDraftStats ? (
              <PlayerDraftStats
                player={player}
                variant={compact ? "inline" : "pills"}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
