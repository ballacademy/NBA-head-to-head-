import { useId, useState, type CSSProperties } from "react";
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

const formatLayerValue = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  if (rounded > 0) {
    return `+${rounded}`;
  }
  return String(rounded);
};

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
  const layers = showScoreContext
    ? (score.layers ?? []).filter(
        (layer) => layer.id === "baseStats" || layer.value !== 0,
      )
    : [];
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

      {layers.length > 0 ? (
        <div className="score-breakdown">
          <button
            type="button"
            className="score-breakdown__toggle"
            aria-expanded={breakdownOpen}
            aria-controls={breakdownId}
            onClick={() => setBreakdownOpen((open) => !open)}
          >
            Score breakdown
            <span aria-hidden="true">{breakdownOpen ? "−" : "+"}</span>
          </button>
          {breakdownOpen ? (
            <ul id={breakdownId} className="score-breakdown__list">
              {layers.map((layer) => (
                <li key={layer.id} className="score-breakdown__row">
                  <span className="score-breakdown__label">{layer.label}</span>
                  <span
                    className={`score-breakdown__value${
                      layer.value > 0
                        ? " score-breakdown__value--pos"
                        : layer.value < 0
                          ? " score-breakdown__value--neg"
                          : ""
                    }`}
                  >
                    {formatLayerValue(layer.value)}
                  </span>
                </li>
              ))}
            </ul>
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
