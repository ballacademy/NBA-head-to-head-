import type { CSSProperties } from "react";
import { sortLineupByPosition } from "../lib/lineupOrder";
import { PlayerStatLine } from "./PlayerStatLine";
import type { Drafter, LineupScore, Player } from "../lib/types";

interface TeamLineupCardProps {
  drafter: Drafter;
  lineup: Player[];
  score: LineupScore;
  isWinner?: boolean;
}

export function TeamLineupCard({
  drafter,
  lineup,
  score,
  isWinner = false,
}: TeamLineupCardProps) {
  const orderedLineup = sortLineupByPosition(lineup);

  return (
    <article
      className={`panel team-lineup-card ${isWinner ? "winner" : ""}`}
      style={{ "--accent": drafter.accent } as CSSProperties}
    >
      <div className="team-lineup-card__header">
        <div>
          <p className="eyebrow">{drafter.city}</p>
          <h3>{drafter.name}</h3>
          <p className="projected-record">{score.projectedRecord.formatted}</p>
        </div>
        <div className="score-orb">
          <div className="score-orb__content">
            <span>{score.total}</span>
            <small>OVR</small>
          </div>
        </div>
      </div>

      <div className="team-lineup-card__players">
        {orderedLineup.length > 0 ? (
          orderedLineup.map((player, index) => (
            <PlayerStatLine
              key={player.id}
              player={player}
              pickNumber={index + 1}
            />
          ))
        ) : (
          <p className="draft-empty">No players drafted.</p>
        )}
      </div>
    </article>
  );
}
