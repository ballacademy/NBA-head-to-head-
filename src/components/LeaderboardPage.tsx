import { useMemo, useState } from "react";
import {
  formatLeaderboardRecord,
  formatLeaderboardTeam,
  formatLeaderboardWinPercentage,
  getLeaderboardFootnote,
  getTopLeaderboard,
  type LeaderboardSort,
} from "../lib/leaderboard";
import { getOrCreatePlayerId } from "../lib/playerRecord";

interface LeaderboardPageProps {
  onBack: () => void;
}

export function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  const [sort, setSort] = useState<LeaderboardSort>("wins");
  const currentPlayerId = getOrCreatePlayerId();
  const entries = useMemo(() => getTopLeaderboard(sort), [sort]);

  return (
    <section className="leaderboard panel">
      <div className="leaderboard__header">
        <div>
          <p className="eyebrow">NBA Head-to-Head</p>
          <h1>Leaderboard</h1>
          <p>Top {100} players by wins and win percentage.</p>
        </div>
        <button type="button" className="secondary-button" onClick={onBack}>
          Back to home
        </button>
      </div>

      <div className="leaderboard__tabs" role="tablist" aria-label="Leaderboard sort">
        <button
          type="button"
          role="tab"
          aria-selected={sort === "wins"}
          className={sort === "wins" ? "is-active" : undefined}
          onClick={() => setSort("wins")}
        >
          Most wins
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
      </div>

      <p className="leaderboard__note">{getLeaderboardFootnote(sort)}</p>

      {entries.length > 0 ? (
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Team</th>
                <th scope="col">Record</th>
                <th scope="col">Win %</th>
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
                  <td>{formatLeaderboardWinPercentage(entry)}</td>
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
