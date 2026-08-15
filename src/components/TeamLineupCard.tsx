import { useId, useState, type CSSProperties } from "react";
import { formatUsername } from "../lib/accountCredentials";
import { sortLineupByPosition } from "../lib/lineupOrder";
import {
  buildLineupScoreContext,
  buildLineupScoreInsights,
  formatLineupOvrDisplay,
} from "../lib/scoring";
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
  const insights = showScoreContext ? buildLineupScoreInsights(score) : null;
  const hasInsights =
    Boolean(insights) &&
    ((insights?.helped.length ?? 0) > 0 || (insights?.hurt.length ?? 0) > 0);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const breakdownId = useId();
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

      {hasInsights && insights ? (
        <div className="score-breakdown">
          <button
            type="button"
            className="score-breakdown__toggle"
            aria-expanded={breakdownOpen}
            aria-controls={breakdownId}
            onClick={() => setBreakdownOpen((open) => !open)}
          >
            What helped / hurt
            <span aria-hidden="true">{breakdownOpen ? "−" : "+"}</span>
          </button>
          {breakdownOpen ? (
            <div id={breakdownId} className="score-breakdown__panels">
              {insights.helped.length > 0 ? (
                <div className="score-breakdown__group">
                  <h4 className="score-breakdown__group-title score-breakdown__group-title--helped">
                    Helped
                  </h4>
                  <ul className="score-breakdown__insights">
                    {insights.helped.map((note) => (
                      <li
                        key={`helped-${note}`}
                        className="score-breakdown__insight score-breakdown__insight--helped"
                      >
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {insights.hurt.length > 0 ? (
                <div className="score-breakdown__group">
                  <h4 className="score-breakdown__group-title score-breakdown__group-title--hurt">
                    Hurt
                  </h4>
                  <ul className="score-breakdown__insights">
                    {insights.hurt.map((note) => (
                      <li
                        key={`hurt-${note}`}
                        className="score-breakdown__insight score-breakdown__insight--hurt"
                      >
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
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
