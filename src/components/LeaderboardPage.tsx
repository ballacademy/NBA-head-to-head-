import { useMemo, useState } from "react";
import {
  formatLeaderboardLossStreak,
  formatLeaderboardRecord,
  formatLeaderboardWinPercentage,
  formatLeaderboardWinStreak,
  getLeaderboardFootnote,
  getTopLeaderboard,
  type LeaderboardSort,
} from "../lib/leaderboard";
import {
  formatRankedLeaderboardElo,
  formatRankedLeaderboardRecord,
  getRankedLeaderboardFootnote,
  getTopRankedLeaderboard,
} from "../lib/rankedLeaderboard";
import { getCurrentSeasonId } from "../lib/rankedSeason";
import { getOrCreatePlayerId } from "../lib/playerRecord";
import { GmIdentityBadge } from "./GmIdentityBadge";
import { RankedTierBadge } from "./RankedTierBadge";

interface LeaderboardPageProps {
  onBack: () => void;
}

type LeaderboardView = "classic" | "ranked";

export function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  const [view, setView] = useState<LeaderboardView>("ranked");
  const [sort, setSort] = useState<LeaderboardSort>("winStreak");
  const currentPlayerId = getOrCreatePlayerId();
  const seasonId = getCurrentSeasonId();
  const classicEntries = useMemo(() => getTopLeaderboard(sort), [sort]);
  const rankedEntries = useMemo(() => getTopRankedLeaderboard(), []);

  const metricColumnLabel =
    sort === "winStreak"
      ? "Win streak"
      : sort === "lossStreak"
        ? "Loss streak"
        : "Win %";

  const formatMetricValue = (entry: (typeof classicEntries)[number]) => {
    if (sort === "winStreak") {
      return formatLeaderboardWinStreak(entry);
    }

    if (sort === "lossStreak") {
      return formatLeaderboardLossStreak(entry);
    }

    return formatLeaderboardWinPercentage(entry);
  };

  return (
    <section className="leaderboard panel panel--compact feature-page feature-page--leaderboard">
      <div className="leaderboard__top">
        <div className="leaderboard__header">
          <div>
            <p className="eyebrow">Draft Day GM</p>
            <h1>Leaderboards</h1>
            <p className="leaderboard__subtitle">
              {view === "ranked"
                ? getRankedLeaderboardFootnote(seasonId)
                : getLeaderboardFootnote(sort)}
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={onBack}>
            Back to home
          </button>
        </div>

        <div className="leaderboard__tabs" role="tablist" aria-label="Leaderboard view">
          <button
            type="button"
            role="tab"
            aria-selected={view === "ranked"}
            className={view === "ranked" ? "is-active" : undefined}
            onClick={() => setView("ranked")}
          >
            Ranked Top 500
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "classic"}
            className={view === "classic" ? "is-active" : undefined}
            onClick={() => setView("classic")}
          >
            Classic Head to Head
          </button>
        </div>

        {view === "classic" ? (
          <div
            className="leaderboard__tabs leaderboard__tabs--secondary"
            role="tablist"
            aria-label="Classic leaderboard sort"
          >
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
        ) : null}
      </div>

      {view === "ranked" ? (
        rankedEntries.length > 0 ? (
          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Front Office</th>
                  <th scope="col">Tier</th>
                  <th scope="col">Elo</th>
                  <th scope="col">Record</th>
                </tr>
              </thead>
              <tbody>
                {rankedEntries.map((entry, index) => (
                  <tr
                    key={entry.playerId}
                    className={
                      entry.playerId === currentPlayerId
                        ? "leaderboard-table__row--you"
                        : undefined
                    }
                  >
                    <td>{index + 1}</td>
                    <td>
                      {entry.isNpc ? (
                        entry.name
                      ) : (
                        <GmIdentityBadge
                          name={entry.name}
                          publicTag={entry.publicTag}
                          playerId={entry.playerId}
                        />
                      )}
                    </td>
                    <td>
                      <RankedTierBadge tierLabel={entry.tierLabel} elo={entry.elo} compact />
                    </td>
                    <td>{formatRankedLeaderboardElo(entry)}</td>
                    <td>{formatRankedLeaderboardRecord(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="draft-empty">
            No ranked entries yet. Play a ranked matchup to join the ladder.
          </p>
        )
      ) : classicEntries.length > 0 ? (
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
              {classicEntries.map((entry, index) => (
                <tr
                  key={entry.playerId}
                  className={
                    entry.playerId === currentPlayerId
                      ? "leaderboard-table__row--you"
                      : undefined
                  }
                >
                  <td>{index + 1}</td>
                  <td>
                    <GmIdentityBadge
                      name={entry.name}
                      publicTag={entry.publicTag}
                      playerId={entry.playerId}
                    />
                  </td>
                  <td>{formatLeaderboardRecord(entry)}</td>
                  <td>{formatMetricValue(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="draft-empty">
          No classic entries yet. Play Classic Head to Head to claim the first spot.
        </p>
      )}
    </section>
  );
}
