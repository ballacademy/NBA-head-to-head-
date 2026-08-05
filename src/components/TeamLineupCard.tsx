import type { CSSProperties } from "react";
import { formatUsername } from "../lib/accountCredentials";
import { sortLineupByPosition } from "../lib/lineupOrder";
import { buildLineupScoreContext, formatLineupOvrDisplay } from "../lib/scoring";
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
  /** Opens the same GM profile modal as leaderboard username clicks. */
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
  const teamName = drafter.name.trim() || "Opponent";
  const username = drafter.username?.trim() || undefined;

  const nameLabel = showStreak ? (
    <TeamNameWithStreak
      name={teamName}
      winStreak={winStreak}
      lossStreak={lossStreak}
      compact={compact}
    />
  ) : (
    teamName
  );

  return (
    <article
      className={`team-lineup-card ${compact ? "team-lineup-card--compact" : "panel"} ${isWinner ? "winner" : ""}`}
      style={{ "--accent": drafter.accent } as CSSProperties}
    >
      <div className="team-lineup-card__header">
        <div>
          <h3>
            <span className="team-lineup-card__identity">
              {onNameClick ? (
                <button
                  type="button"
                  className="team-lineup-card__name-button"
                  onClick={onNameClick}
                  aria-label={`View profile for ${teamName}`}
                >
                  {nameLabel}
                </button>
              ) : (
                nameLabel
              )}
              {username ? (
                onNameClick ? (
                  <button
                    type="button"
                    className="team-lineup-card__username-button"
                    onClick={onNameClick}
                    aria-label={`View profile for ${formatUsername(username)}`}
                  >
                    {formatUsername(username)}
                  </button>
                ) : (
                  <span className="team-lineup-card__username">
                    {formatUsername(username)}
                  </span>
                )
              ) : null}
            </span>
          </h3>
          {showProjectedRecord ? (
            <p className="projected-record">{score.projectedRecord.formatted}</p>
          ) : null}
        </div>
        <div
          className={`score-orb${compact ? " score-orb--compact" : ""}${
            score.ovrOverflow > 0 ? " score-orb--overflow" : ""
          }`}
        >
          <div className="score-orb__content">
            <span>{formatLineupOvrDisplay(score)}</span>
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
