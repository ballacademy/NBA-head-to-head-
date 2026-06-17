import type { Drafter, MatchupResult, Player } from "./types";
import { calculateLineupScore, getMatchupEffectiveTotal, getPlayersById } from "./scoring";

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
      const lineupA = getPlayersById(drafterA.lineup, pool);
      const lineupB = getPlayersById(drafterB.lineup, pool);
      const effectiveA = getMatchupEffectiveTotal(lineupA, scoreA.total);
      const effectiveB = getMatchupEffectiveTotal(lineupB, scoreB.total);
      const winnerId = effectiveA >= effectiveB ? drafterA.id : drafterB.id;

      results.push({
        id: `${roundIndex}-${index}`,
        round: roundNames[roundIndex] ?? `Round ${roundIndex + 1}`,
        drafterA: drafterA.id,
        drafterB: drafterB.id,
        scoreA,
        scoreB,
        winnerId,
        margin: Math.abs(effectiveA - effectiveB),
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
