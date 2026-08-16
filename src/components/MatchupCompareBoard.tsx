import { useId, useState, type CSSProperties } from "react";
import { formatUsername } from "../lib/accountCredentials";
import { pairLineupsByPosition } from "../lib/lineupOrder";
import { formatCompactPlayerName } from "../lib/playerPool";
import {
  buildLineupScoreContext,
  buildLineupScoreInsights,
  formatLineupOvrDisplay,
} from "../lib/scoring";
import { PlayerDraftStats } from "./PlayerDraftStats";
import { LineupChemistryBadges } from "./LineupChemistryBadges";
import { TeamNameWithStreak } from "./TeamNameWithStreak";
import type { Drafter, LineupScore, Player } from "../lib/types";

interface MatchupCompareBoardProps {
  user: Drafter;
  opponent: Drafter;
  userLineup: Player[];
  opponentLineup: Player[];
  userScore: LineupScore;
  opponentScore: LineupScore;
  userOutcome: "win" | "loss" | "tie";
  opponentOutcome: "win" | "loss" | "tie";
  winStreak?: number;
  lossStreak?: number;
  showStreak?: boolean;
  onOpponentNameClick?: () => void;
}

function TeamHeader({
  drafter,
  score,
  outcome,
  winStreak = 0,
  lossStreak = 0,
  showStreak = false,
  onNameClick,
}: {
  drafter: Drafter;
  score: LineupScore;
  outcome: "win" | "loss" | "tie";
  winStreak?: number;
  lossStreak?: number;
  showStreak?: boolean;
  onNameClick?: () => void;
}) {
  const teamName = drafter.name.trim() || "Opponent";
  const username = drafter.username?.trim() || undefined;
  const nameLabel = showStreak ? (
    <TeamNameWithStreak
      name={teamName}
      winStreak={winStreak}
      lossStreak={lossStreak}
      compact
    />
  ) : (
    teamName
  );

  return (
    <div
      className={`matchup-compare__team-header matchup-compare__team-header--${outcome}`}
      style={{ "--accent": drafter.accent } as CSSProperties}
    >
      <div className="matchup-compare__team-copy">
        <p className={`matchup-compare__outcome matchup-compare__outcome--${outcome}`}>
          {outcome === "win" ? "Win" : outcome === "loss" ? "Loss" : "Tie"}
        </p>
        <h3>
          {onNameClick ? (
            <button
              type="button"
              className="matchup-compare__name-button"
              onClick={onNameClick}
              aria-label={`View profile for ${teamName}`}
            >
              {nameLabel}
            </button>
          ) : (
            nameLabel
          )}
        </h3>
        {username ? (
          <p className="matchup-compare__username">{formatUsername(username)}</p>
        ) : null}
      </div>
      <div
        className={`score-orb score-orb--compact${
          score.ovrOverflow > 0 ? " score-orb--overflow" : ""
        }${
          outcome === "win"
            ? " score-orb--win"
            : outcome === "loss"
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
  );
}

function ComparePlayerCell({
  player,
  statsOpen,
  allTimeMode,
  align,
}: {
  player: Player | null;
  statsOpen: boolean;
  allTimeMode?: boolean;
  align: "left" | "right";
}) {
  if (!player) {
    return (
      <div
        className={`matchup-compare__player matchup-compare__player--empty matchup-compare__player--${align}`}
      >
        —
      </div>
    );
  }

  return (
    <div
      className={`matchup-compare__player matchup-compare__player--${align}`}
    >
      <p className="matchup-compare__player-name" title={player.name}>
        {formatCompactPlayerName(player.name)}
      </p>
      <p className="matchup-compare__player-meta">{player.team}</p>
      {statsOpen ? (
        <PlayerDraftStats player={player} variant="inline" />
      ) : null}
      {statsOpen && allTimeMode ? (
        <span className="matchup-compare__era-note">All-Time pool</span>
      ) : null}
    </div>
  );
}

function TeamDetails({
  lineup,
  score,
}: {
  lineup: Player[];
  score: LineupScore;
}) {
  const scoreContext = buildLineupScoreContext(score);
  const insights = buildLineupScoreInsights(score);
  const hasInsights =
    insights.boosts.length > 0 || insights.detractors.length > 0;
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const breakdownId = useId();

  return (
    <div className="matchup-compare__details-team">
      {scoreContext ? (
        <p className="matchup-compare__score-context">{scoreContext}</p>
      ) : null}
      <LineupChemistryBadges lineup={lineup} />
      {hasInsights ? (
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
    </div>
  );
}

/** Mobile matchup board: position-aligned rows + shared stats toggle. */
export function MatchupCompareBoard({
  user,
  opponent,
  userLineup,
  opponentLineup,
  userScore,
  opponentScore,
  userOutcome,
  opponentOutcome,
  winStreak = 0,
  lossStreak = 0,
  showStreak = false,
  onOpponentNameClick,
}: MatchupCompareBoardProps) {
  const [statsOpen, setStatsOpen] = useState(false);
  const statsId = useId();
  const pairs = pairLineupsByPosition(userLineup, opponentLineup);

  return (
    <div className="matchup-compare">
      <div className="matchup-compare__headers">
        <TeamHeader
          drafter={user}
          score={userScore}
          outcome={userOutcome}
          winStreak={winStreak}
          lossStreak={lossStreak}
          showStreak={showStreak}
        />
        <TeamHeader
          drafter={opponent}
          score={opponentScore}
          outcome={opponentOutcome}
          onNameClick={onOpponentNameClick}
        />
      </div>

      <div className="matchup-compare__rows" id={statsId}>
        {pairs.map((pair, index) => (
          <div className="matchup-compare__row" key={`slot-${index}`}>
            <ComparePlayerCell
              player={pair.left}
              statsOpen={statsOpen}
              allTimeMode={user.allTimeMode}
              align="left"
            />
            <span className="matchup-compare__slot" aria-hidden="true">
              {pair.position}
            </span>
            <ComparePlayerCell
              player={pair.right}
              statsOpen={statsOpen}
              allTimeMode={opponent.allTimeMode}
              align="right"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="matchup-compare__stats-toggle"
        aria-expanded={statsOpen}
        aria-controls={statsId}
        onClick={() => setStatsOpen((open) => !open)}
      >
        {statsOpen ? "Hide player stats" : "Show player stats"}
        <span aria-hidden="true">{statsOpen ? "−" : "+"}</span>
      </button>

      {statsOpen ? (
        <div className="matchup-compare__details">
          <TeamDetails lineup={userLineup} score={userScore} />
          <TeamDetails lineup={opponentLineup} score={opponentScore} />
        </div>
      ) : null}
    </div>
  );
}
