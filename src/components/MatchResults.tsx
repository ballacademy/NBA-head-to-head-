import { ScoreBoard } from "./ScoreBoard";
import { TeamLineupCard } from "./TeamLineupCard";
import { calculateLineupScore } from "../lib/scoring";
import type { Drafter, Player } from "../lib/types";

interface MatchResultsProps {
  user: Drafter;
  opponent: Drafter;
  userLineup: Player[];
  opponentLineup: Player[];
  onPlayAgain: () => void;
}

export function MatchResults({
  user,
  opponent,
  userLineup,
  opponentLineup,
  onPlayAgain,
}: MatchResultsProps) {
  const userScore = calculateLineupScore(userLineup);
  const opponentScore = calculateLineupScore(opponentLineup);
  const userWon = userScore.total >= opponentScore.total;

  return (
    <section className="match-results">
      <div className="panel match-results__header">
        <p className="eyebrow">Matchup results</p>
        <h2>
          {userWon ? "You won the matchup" : `${opponent.name} won the matchup`}
        </h2>
        <p>
          Margin: {Math.abs(userScore.total - opponentScore.total).toFixed(1)}{" "}
          points
        </p>
        <button type="button" onClick={onPlayAgain}>
          Draft another team
        </button>
      </div>

      <div className="match-results__lineups">
        <TeamLineupCard
          drafter={user}
          lineup={userLineup}
          score={userScore}
          isWinner={userWon}
        />
        <TeamLineupCard
          drafter={opponent}
          lineup={opponentLineup}
          score={opponentScore}
          isWinner={!userWon}
        />
      </div>

      <ScoreBoard
        drafterA={user}
        drafterB={opponent}
        scoreA={userScore}
        scoreB={opponentScore}
      />
    </section>
  );
}
