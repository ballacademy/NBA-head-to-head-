import type { Drafter, MatchupResult } from "../lib/types";
import { formatLineupOvrDisplay } from "../lib/scoring";

interface TournamentBracketProps {
  rounds: MatchupResult[][];
  draftersById: Map<string, Drafter>;
  activeMatchupId: string;
  onSelectMatchup: (matchupId: string) => void;
}

export function TournamentBracket({
  rounds,
  draftersById,
  activeMatchupId,
  onSelectMatchup,
}: TournamentBracketProps) {
  return (
    <section className="panel bracket" aria-labelledby="bracket-heading">
      <div className="section-heading">
        <p className="eyebrow">Eight-person pool</p>
        <h2 id="bracket-heading">Winner advances bracket</h2>
        <p>
          Each matchup crowns the higher-scoring lineup and sends that drafter
          into the next round. Overflow past 100 OVR counts.
        </p>
      </div>

      <div className="bracket-grid">
        {rounds.map((round) => (
          <div className="round" key={round[0]?.round ?? "round"}>
            <h3>{round[0]?.round}</h3>
            {round.map((matchup) => {
              const drafterA = draftersById.get(matchup.drafterA);
              const drafterB = draftersById.get(matchup.drafterB);
              const winner = draftersById.get(matchup.winnerId);

              if (!drafterA || !drafterB || !winner) {
                return null;
              }

              return (
                <button
                  className={`matchup-card ${
                    activeMatchupId === matchup.id ? "active" : ""
                  }`}
                  key={matchup.id}
                  type="button"
                  onClick={() => onSelectMatchup(matchup.id)}
                >
                  <span>
                    {drafterA.name}
                    <strong>{formatLineupOvrDisplay(matchup.scoreA)}</strong>
                  </span>
                  <span>
                    {drafterB.name}
                    <strong>{formatLineupOvrDisplay(matchup.scoreB)}</strong>
                  </span>
                  <small>
                    Winner: {winner.name} by {matchup.margin.toFixed(1)}
                  </small>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
