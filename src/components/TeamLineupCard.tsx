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
  /** Match outcome for this card — drives WIN/LOSS/TIE badge + color. */
  outcome?: "win" | "loss" | "tie";
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
  outcome,
  winStreak = 0,
  lossStreak = 0,
  showStreak = false,
  compact = false,
  showProjectedRecord = true,
  showScoreContext = false,
  onNameClick,
}: TeamLineupCardProps) {
  const resolvedOutcome = outcome ?? (isWinner ? "win" : undefined);
  const orderedLineup = sortLineupByPosition(lineup);
  const scoreContext = showScoreContext
    ? buildLineupScoreContext(score)
    : null;
  const insights = showScoreContext ? buildLineupScoreInsights(score) : null;
  const hasInsights =
    Boolean(insights) &&
    ((insights?.boosts.length ?? 0) > 0 ||
      (insights?.detractors.length ?? 0) > 0);
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
      className={[
        "team-lineup-card",
        compact ? "team-lineup-card--compact" : "panel",
        resolvedOutcome === "win" || isWinner ? "winner" : "",
        resolvedOutcome === "loss" ? "team-lineup-card--loss" : "",
        resolvedOutcome === "tie" ? "team-lineup-card--tie" : "",
        resolvedOutcome ? `team-lineup-card--outcome-${resolvedOutcome}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--accent": drafter.accent } as CSSProperties}
    >
      <div className="team-lineup-card__header">
        <div>
          {resolvedOutcome ? (
            <p
              className={`team-lineup-card__outcome team-lineup-card__outcome--${resolvedOutcome}`}
            >
              {resolvedOutcome === "win"
                ? "Win"
                : resolvedOutcome === "loss"
                  ? "Loss"
                  : "Tie"}
            </p>
          ) : null}
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
          }${
            resolvedOutcome === "win"
              ? " score-orb--win"
              : resolvedOutcome === "loss"
                ? " score-orb--loss"
                : ""
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
            Boosts & detractors
            <span aria-hidden="true">{breakdownOpen ? "−" : "+"}</span>
          </button>
          {breakdownOpen ? (
            <div id={breakdownId} className="score-breakdown__panels">
              {insights.boosts.length > 0 ? (
                <div className="score-breakdown__group">
                  <h4 className="score-breakdown__group-title score-breakdown__group-title--boost">
                    Boosts
                  </h4>
                  <ul className="score-breakdown__insights">
                    {insights.boosts.map((note) => (
                      <li
                        key={`boost-${note}`}
                        className="score-breakdown__insight score-breakdown__insight--boost"
                      >
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {insights.detractors.length > 0 ? (
                <div className="score-breakdown__group">
                  <h4 className="score-breakdown__group-title score-breakdown__group-title--drag">
                    Detractors
                  </h4>
                  <ul className="score-breakdown__insights">
                    {insights.detractors.map((note) => (
                      <li
                        key={`drag-${note}`}
                        className="score-breakdown__insight score-breakdown__insight--drag"
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
