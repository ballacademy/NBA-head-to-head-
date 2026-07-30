import type { CSSProperties } from "react";
import { sortLineupByPosition } from "../lib/lineupOrder";
import { buildLineupScoreContext } from "../lib/scoring";
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
  showScoreContext?: boolean;
  onNameClick?: () => void;
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
  showScoreContext = false,
  onNameClick,
}: TeamLineupCardProps) {
  const orderedLineup = sortLineupByPosition(lineup);
  const scoreContext = showScoreContext
    ? buildLineupScoreContext(score)
    : null;

  const nameContent = showStreak ? (
    <TeamNameWithStreak
      name={drafter.name}
      winStreak={winStreak}
      lossStreak={lossStreak}
      compact={compact}
    />
  ) : (
    drafter.name
  );

  return (
    <article
      className={`team-lineup-card ${compact ? "team-lineup-card--compact" : "panel"} ${isWinner ? "winner" : ""}`}
      style={{ "--accent": drafter.accent } as CSSProperties}
    >
      <div className="team-lineup-card__header">
        <div>
          <h3>
            {onNameClick ? (
              <button
                type="button"
                className="team-lineup-card__name-button"
                onClick={onNameClick}
              >
                {nameContent}
              </button>
            ) : (
              nameContent
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

      {scoreContext ? (
        <p className="team-lineup-card__score-context">{scoreContext}</p>
      ) : null}

      <LineupChemistryBadges lineup={lineup} />

      <div className="team-lineup-card__players">
        {orderedLineup.length > 0 ? (
          orderedLineup.map((player) => (
            <PlayerStatLine
              key={player.id}
              player={player}
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
