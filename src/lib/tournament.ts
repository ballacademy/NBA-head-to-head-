import type { Drafter, MatchupResult, Player } from "./types";
import { calculateLineupScore, getPlayersById, resolveHeadToHeadResult } from "./scoring";

const roundNames = ["Quarterfinals", "Semifinals", "Final"];

export const buildTournament = (
  drafters: Drafter[],
  pool: Player[],
): MatchupResult[][] => {
  const rounds: MatchupResult[][] = [];
  let contenders = [...drafters];

  for (let roundIndex = 0; contenders.length > 1; roundIndex += 1) {
    const results: MatchupResult[] = [];

    for (let index = 0; index < contenders.length; index += 2) {
      const drafterA = contenders[index];
      const drafterB = contenders[index + 1];
      const scoreA = calculateLineupScore(
        getPlayersById(drafterA.lineup, pool),
      );
      const scoreB = calculateLineupScore(
        getPlayersById(drafterB.lineup, pool),
      );
      const winnerId =
        resolveHeadToHeadResult(scoreA.preciseTotal, scoreB.preciseTotal) === "win"
          ? drafterA.id
          : drafterB.id;

      results.push({
        id: `${roundIndex}-${index}`,
        round: roundNames[roundIndex] ?? `Round ${roundIndex + 1}`,
        drafterA: drafterA.id,
        drafterB: drafterB.id,
        scoreA,
        scoreB,
        winnerId,
        margin: Math.abs(scoreA.total - scoreB.total),
      });
    }

    rounds.push(results);
    contenders = results
      .map((result) =>
        contenders.find((drafter) => drafter.id === result.winnerId),
      )
      .filter((drafter): drafter is Drafter => Boolean(drafter));
  }

  return rounds;
};
