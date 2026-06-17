import type { Drafter, LineupScore, Player } from "../lib/types";
import { getMatchupEffectiveTotal } from "../lib/scoring";

interface ScoreBoardProps {
  drafterA: Drafter;
  drafterB: Drafter;
  lineupA: Player[];
  lineupB: Player[];
  scoreA: LineupScore;
  scoreB: LineupScore;
}

function ScoreColumn({
  drafter,
  score,
  isWinner,
}: {
  drafter: Drafter;
  score: LineupScore;
  isWinner: boolean;
}) {
  return (
    <article className={`score-column ${isWinner ? "winner" : ""}`}>
      <div className="score-column__header">
        <div>
          <p>{drafter.city}</p>
          <h3>{drafter.name}</h3>
          <p className="projected-record">{score.projectedRecord.formatted}</p>
        </div>
        <strong>{score.total}</strong>
      </div>

      <div className="category-list">
        {score.categories.map((category) => (
          <div className="category" key={category.label}>
            <div>
              <span>{category.label}</span>
              <small>{category.note}</small>
            </div>
            <strong>{category.value}</strong>
          </div>
        ))}
      </div>

      <div className="fit-notes">
        {score.strengths.map((strength) => (
          <p className="positive" key={strength}>
            + {strength}
          </p>
        ))}
        {score.warnings.map((warning) => (
          <p className="warning" key={warning}>
            - {warning}
          </p>
        ))}
      </div>
    </article>
  );
}

export function ScoreBoard({
  drafterA,
  drafterB,
  lineupA,
  lineupB,
  scoreA,
  scoreB,
}: ScoreBoardProps) {
  const isAWinner =
    getMatchupEffectiveTotal(lineupA, scoreA.total) >=
    getMatchupEffectiveTotal(lineupB, scoreB.total);

  return (
    <section className="panel score-board" aria-labelledby="score-heading">
      <div className="section-heading">
        <p className="eyebrow">Current head-to-head</p>
        <h2 id="score-heading">
          {drafterA.name} vs {drafterB.name}
        </h2>
        <p>
          Scores combine production, true shooting, three-point value, defense,
          and team fit.
        </p>
      </div>

      <div className="score-grid">
        <ScoreColumn
          drafter={drafterA}
          score={scoreA}
          isWinner={isAWinner}
        />
        <ScoreColumn
          drafter={drafterB}
          score={scoreB}
          isWinner={!isAWinner}
        />
      </div>
    </section>
  );
}
