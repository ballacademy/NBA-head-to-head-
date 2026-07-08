import type { CSSProperties } from "react";
import { sortLineupByPosition } from "../lib/lineupOrder";
import { PlayerStatLine } from "./PlayerStatLine";
import { LineupChemistryBadges } from "./LineupChemistryBadges";
import { TeamNameWithStreak } from "./TeamNameWithStreak";
import type { Drafter, LineupScore, Player } from "../lib/types";

interface TeamLineupCardProps {
  drafter: Drafter;
  lineup: Player[];
  score: LineupScore;
  isWinner?: boolean;
  winStreak?: number;
  lossStreak?: number;
  showStreak?: boolean;
  compact?: boolean;
  showProjectedRecord?: boolean;
}

export function TeamLineupCard({
  drafter,
  lineup,
  score,
  isWinner = false,
  winStreak = 0,
  lossStreak = 0,
  showStreak = false,
  compact = false,
  showProjectedRecord = true,
}: TeamLineupCardProps) {
  const orderedLineup = sortLineupByPosition(lineup);

  return (
    <article
      className={`team-lineup-card ${compact ? "team-lineup-card--compact" : "panel"} ${isWinner ? "winner" : ""}`}
      style={{ "--accent": drafter.accent } as CSSProperties}
    >
      <div className="team-lineup-card__header">
        <div>
          <h3>
            {showStreak ? (
              <TeamNameWithStreak
                name={drafter.name}
                winStreak={winStreak}
                lossStreak={lossStreak}
              />
            ) : (
              drafter.name
            )}
          </h3>
          {showProjectedRecord ? (
            <p className="projected-record">{score.projectedRecord.formatted}</p>
          ) : null}
        </div>
        <div className={`score-orb${compact ? " score-orb--compact" : ""}`}>
          <div className="score-orb__content">
            <span>{score.total}</span>
            <small>OVR</small>
          </div>
        </div>
      </div>

      <LineupChemistryBadges lineup={lineup} />

      <div className="team-lineup-card__players">
        {orderedLineup.length > 0 ? (
          orderedLineup.map((player, index) => (
            <PlayerStatLine
              key={player.id}
              player={player}
              pickNumber={index + 1}
              compact={compact}
              allTimeMode={drafter.allTimeMode}
            />
          ))
        ) : (
          <p className="draft-empty">No players drafted.</p>
        )}
      </div>
    </article>
  );
}
