import { useEffect, useMemo, useState } from "react";
import {
  formatLeaderboardElo,
  formatLeaderboardLossStreak,
  formatLeaderboardRecord,
  formatLeaderboardWinStreak,
  getLeaderboardFootnote,
  getTopLeaderboard,
  LEADERBOARD_LIMIT,
  type LeaderboardSort,
} from "../lib/leaderboard";
import {
  formatRankedLeaderboardElo,
  formatRankedLeaderboardLossStreak,
  formatRankedLeaderboardRecord,
  formatRankedLeaderboardWinStreak,
  getRankedLeaderboardFootnote,
  getTopRankedLeaderboard,
  RANKED_LEADERBOARD_LIMIT,
  type RankedLeaderboardSort,
} from "../lib/rankedLeaderboard";
import { refreshLeaderboardFromApi } from "../lib/leaderboardRemote";
import { RATING_LABEL } from "../lib/rankedElo";
import { getCurrentSeasonId } from "../lib/rankedSeason";
import { getOrCreatePlayerId } from "../lib/playerRecord";
import {
  CLASSIC_LEADERBOARD_LABEL,
  CLASSIC_HEAD_TO_HEAD_LABEL,
  PRO_HEAD_TO_HEAD_LABEL,
  PRO_LEADERBOARD_LABEL,
} from "../lib/modeLabels";
import { DraftDayGmLogo } from "./DraftDayGmLogo";
import { GmIdentityBadge } from "./GmIdentityBadge";
import { RankedTierBadge } from "./RankedTierBadge";

interface LeaderboardPageProps {
  onBack: () => void;
}

type LeaderboardView = "classic" | "ranked";
type BoardSort = LeaderboardSort | RankedLeaderboardSort;

const SORT_TABS: { id: BoardSort; label: string }[] = [
  { id: "elo", label: `Most ${RATING_LABEL}` },
  { id: "winStreak", label: "Win streak" },
  { id: "lossStreak", label: "Loss streak" },
];

export function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  const [view, setView] = useState<LeaderboardView>("ranked");
  const [sort, setSort] = useState<BoardSort>("elo");
  const [refreshTick, setRefreshTick] = useState(0);
  const currentPlayerId = getOrCreatePlayerId();
  const seasonId = getCurrentSeasonId();

  useEffect(() => {
    const refresh = async () => {
      await refreshLeaderboardFromApi({
        mode: view,
        sort: sort as LeaderboardSort,
        limit: view === "ranked" ? RANKED_LEADERBOARD_LIMIT : LEADERBOARD_LIMIT,
        seasonId: view === "ranked" ? seasonId : "",
      });
      setRefreshTick((current) => current + 1);
    };

    void refresh();
  }, [seasonId, sort, view]);

  const classicEntries = useMemo(
    () => getTopLeaderboard(sort as LeaderboardSort),
    [refreshTick, sort],
  );
  const rankedEntries = useMemo(
    () => getTopRankedLeaderboard(sort as RankedLeaderboardSort),
    [refreshTick, sort],
  );

  const metricColumnLabel =
    sort === "winStreak"
      ? "Win streak"
      : sort === "lossStreak"
        ? "Loss streak"
        : RATING_LABEL;

  const formatClassicMetric = (entry: (typeof classicEntries)[number]) => {
    if (sort === "winStreak") {
      return formatLeaderboardWinStreak(entry);
    }

    if (sort === "lossStreak") {
      return formatLeaderboardLossStreak(entry);
    }

    return formatLeaderboardElo(entry);
  };

  const formatRankedMetric = (entry: (typeof rankedEntries)[number]) => {
    if (sort === "winStreak") {
      return formatRankedLeaderboardWinStreak(entry);
    }

    if (sort === "lossStreak") {
      return formatRankedLeaderboardLossStreak(entry);
    }

    return formatRankedLeaderboardElo(entry);
  };

  return (
    <section className="leaderboard panel panel--compact feature-page feature-page--leaderboard">
      <div className="leaderboard__top">
        <div className="leaderboard__header">
          <div>
            <div className="leaderboard__brand">
              <DraftDayGmLogo className="leaderboard__logo" />
            </div>
            <h1>Leaderboards</h1>
            <p className="leaderboard__subtitle">
              {view === "ranked"
                ? getRankedLeaderboardFootnote(sort as RankedLeaderboardSort, seasonId)
                : getLeaderboardFootnote(sort as LeaderboardSort)}
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
            {PRO_LEADERBOARD_LABEL}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "classic"}
            className={view === "classic" ? "is-active" : undefined}
            onClick={() => setView("classic")}
          >
            {CLASSIC_LEADERBOARD_LABEL}
          </button>
        </div>

        <div
          className="leaderboard__tabs leaderboard__tabs--secondary"
          role="tablist"
          aria-label="Leaderboard sort"
        >
          {SORT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={sort === tab.id}
              className={sort === tab.id ? "is-active" : undefined}
              onClick={() => setSort(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {view === "ranked" ? (
        rankedEntries.length > 0 ? (
          <div className="leaderboard-table-wrap" key={`leaderboard-${view}-${sort}`}>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Team</th>
                  <th scope="col">Tier</th>
                  <th scope="col">Record</th>
                  <th scope="col">{metricColumnLabel}</th>
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
                      <GmIdentityBadge
                        name={entry.name}
                        publicTag={entry.publicTag}
                        playerId={entry.playerId}
                      />
                    </td>
                    <td>
                      <RankedTierBadge tierLabel={entry.tierLabel} elo={entry.elo} compact />
                    </td>
                    <td>{formatRankedLeaderboardRecord(entry)}</td>
                    <td>{formatRankedMetric(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="draft-empty">
            No {PRO_HEAD_TO_HEAD_LABEL} entries yet. Play a matchup to join the ladder.
          </p>
        )
      ) : classicEntries.length > 0 ? (
        <div className="leaderboard-table-wrap" key={`leaderboard-${view}-${sort}`}>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Team</th>
                <th scope="col">Tier</th>
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
                  <td>
                    <RankedTierBadge tierLabel={entry.tierLabel} elo={entry.elo} compact />
                  </td>
                  <td>{formatLeaderboardRecord(entry)}</td>
                  <td>{formatClassicMetric(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="draft-empty">
          No classic entries yet. Play {CLASSIC_HEAD_TO_HEAD_LABEL} to claim the first spot.
        </p>
      )}
    </section>
  );
}
