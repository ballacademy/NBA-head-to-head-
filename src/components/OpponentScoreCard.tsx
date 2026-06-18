import type { CSSProperties } from "react";
import type { Drafter, LineupScore } from "../lib/types";

interface OpponentScoreCardProps {
  drafter: Drafter;
  score: LineupScore;
  isWinner?: boolean;
}

export function OpponentScoreCard({
  drafter,
  score,
  isWinner = false,
}: OpponentScoreCardProps) {
  return (
    <article
      className={`panel opponent-score-card ${isWinner ? "winner" : ""}`}
      style={{ "--accent": drafter.accent } as CSSProperties}
    >
      <div className="opponent-score-card__header">
        <div>
          <p className="eyebrow">{drafter.city}</p>
          <h3>{drafter.name}</h3>
          <p className="projected-record">{score.projectedRecord.formatted}</p>
        </div>
        <div className="score-orb score-orb--compact">
          <div className="score-orb__content">
            <span>{score.total}</span>
            <small>OVR</small>
          </div>
        </div>
      </div>

      <div className="category-list category-list--compact">
        {score.categories.map((category) => (
          <div className="category category--compact" key={category.label}>
            <div>
              <span>{category.label}</span>
              <small>{category.note}</small>
            </div>
            <strong>{category.value}</strong>
          </div>
        ))}
      </div>

      <div className="fit-notes fit-notes--compact">
        {score.strengths.slice(0, 2).map((strength) => (
          <p className="positive" key={strength}>
            + {strength}
          </p>
        ))}
        {score.warnings.slice(0, 2).map((warning) => (
          <p className="warning" key={warning}>
            - {warning}
          </p>
        ))}
      </div>
    </article>
  );
}
