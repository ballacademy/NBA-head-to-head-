import { useMemo, useState } from "react";
import {
  formatLeaderboardLossStreak,
  formatLeaderboardRecord,
  formatLeaderboardTeam,
  formatLeaderboardWinPercentage,
  formatLeaderboardWinStreak,
  getLeaderboardFootnote,
  getTopLeaderboard,
  type LeaderboardSort,
} from "../lib/leaderboard";
import { getOrCreatePlayerId } from "../lib/playerRecord";

interface LeaderboardPageProps {
  onBack: () => void;
}

export function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  const [sort, setSort] = useState<LeaderboardSort>("winStreak");
  const currentPlayerId = getOrCreatePlayerId();
  const entries = useMemo(() => getTopLeaderboard(sort), [sort]);

  const metricColumnLabel =
    sort === "winStreak"
      ? "Win streak"
      : sort === "lossStreak"
        ? "Loss streak"
        : "Win %";

  const formatMetricValue = (entry: (typeof entries)[number]) => {
    if (sort === "winStreak") {
      return formatLeaderboardWinStreak(entry);
    }

    if (sort === "lossStreak") {
      return formatLeaderboardLossStreak(entry);
    }

    return formatLeaderboardWinPercentage(entry);
  };

  return (
    <section className="leaderboard panel panel--compact">
      <div className="leaderboard__top">
        <div className="leaderboard__header">
          <div>
            <p className="eyebrow">Draft Day GM</p>
            <h1>Leaderboard</h1>
            <p className="leaderboard__subtitle">{getLeaderboardFootnote(sort)}</p>
          </div>
          <button type="button" className="secondary-button" onClick={onBack}>
            Back to home
          </button>
        </div>

        <div className="leaderboard__tabs" role="tablist" aria-label="Leaderboard sort">
          <button
            type="button"
            role="tab"
            aria-selected={sort === "winStreak"}
            className={sort === "winStreak" ? "is-active" : undefined}
            onClick={() => setSort("winStreak")}
          >
            Win streak
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sort === "winPct"}
            className={sort === "winPct" ? "is-active" : undefined}
            onClick={() => setSort("winPct")}
          >
            Highest win %
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sort === "lossStreak"}
            className={sort === "lossStreak" ? "is-active" : undefined}
            onClick={() => setSort("lossStreak")}
          >
            Loss streak
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sort === "lowestWinPct"}
            className={sort === "lowestWinPct" ? "is-active" : undefined}
            onClick={() => setSort("lowestWinPct")}
          >
            Lowest win %
          </button>
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Team</th>
                <th scope="col">Record</th>
                <th scope="col">{metricColumnLabel}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={entry.playerId}
                  className={
                    entry.playerId === currentPlayerId
                      ? "leaderboard-table__row--you"
                      : undefined
                  }
                >
                  <td>{index + 1}</td>
                  <td>{formatLeaderboardTeam(entry)}</td>
                  <td>{formatLeaderboardRecord(entry)}</td>
                  <td>{formatMetricValue(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="draft-empty">
          No leaderboard entries yet. Play a matchup to claim the first spot.
        </p>
      )}
    </section>
  );
}
