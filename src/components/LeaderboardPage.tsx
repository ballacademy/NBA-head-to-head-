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
import {
  formatTierBannerRange,
  RANKED_TIERS,
  RATING_LABEL,
} from "../lib/rankedElo";
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
import { ModeCardInfo } from "./ModeCardInfo";
import { RankedTierBadge } from "./RankedTierBadge";

interface LeaderboardPageProps {
  onBack: () => void;
}

type LeaderboardView = "classic" | "ranked";
type BoardSort = LeaderboardSort | RankedLeaderboardSort;

type BoardEntry = ReturnType<typeof getTopLeaderboard>[number];

const SORT_TABS: { id: BoardSort; label: string }[] = [
  { id: "elo", label: `Most ${RATING_LABEL}` },
  { id: "winStreak", label: "Win streak" },
  { id: "lossStreak", label: "Loss streak" },
];

const TIER_RANGE_DETAILS = RANKED_TIERS.map(
  (tier) => `${tier.label}: ${formatTierBannerRange(tier)}`,
);

interface LeaderboardBoardProps {
  entries: BoardEntry[];
  metricColumnLabel: string;
  formatMetric: (entry: BoardEntry) => string;
  formatRecord: (entry: BoardEntry) => string;
  currentPlayerId: string;
  viewKey: string;
}

function LeaderboardBoard({
  entries,
  metricColumnLabel,
  formatMetric,
  formatRecord,
  currentPlayerId,
  viewKey,
}: LeaderboardBoardProps) {
  return (
    <>
      <div
        className="leaderboard-table-wrap leaderboard-table-wrap--desktop"
        key={`leaderboard-table-${viewKey}`}
      >
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
                <td>{formatRecord(entry)}</td>
                <td>{formatMetric(entry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className="leaderboard-cards leaderboard-cards--mobile" key={`leaderboard-cards-${viewKey}`}>
        {entries.map((entry, index) => (
          <li
            key={entry.playerId}
            className={`leaderboard-card${
              entry.playerId === currentPlayerId ? " leaderboard-card--you" : ""
            }`}
          >
            <div className="leaderboard-card__top">
              <span className="leaderboard-card__rank">#{index + 1}</span>
              <GmIdentityBadge
                name={entry.name}
                publicTag={entry.publicTag}
                playerId={entry.playerId}
              />
            </div>
            <div className="leaderboard-card__metrics">
              <div>
                <span className="leaderboard-card__label">Tier</span>
                <RankedTierBadge tierLabel={entry.tierLabel} elo={entry.elo} compact />
              </div>
              <div>
                <span className="leaderboard-card__label">Record</span>
                <strong>{formatRecord(entry)}</strong>
              </div>
              <div>
                <span className="leaderboard-card__label">{metricColumnLabel}</span>
                <strong>{formatMetric(entry)}</strong>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

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

  const formatClassicMetric = (entry: BoardEntry) => {
    if (sort === "winStreak") {
      return formatLeaderboardWinStreak(entry);
    }

    if (sort === "lossStreak") {
      return formatLeaderboardLossStreak(entry);
    }

    return formatLeaderboardElo(entry);
  };

  const formatRankedMetric = (entry: BoardEntry) => {
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
          {view === "ranked" ? (
            <span className="leaderboard__tier-info">
              Tier ranges
              <ModeCardInfo details={TIER_RANGE_DETAILS} />
            </span>
          ) : null}
        </div>
      </div>

      {view === "ranked" ? (
        rankedEntries.length > 0 ? (
          <LeaderboardBoard
            entries={rankedEntries}
            metricColumnLabel={metricColumnLabel}
            formatMetric={formatRankedMetric}
            formatRecord={formatRankedLeaderboardRecord}
            currentPlayerId={currentPlayerId}
            viewKey={`${view}-${sort}`}
          />
        ) : (
          <p className="draft-empty">
            No {PRO_HEAD_TO_HEAD_LABEL} entries yet. Play a matchup to join the ladder.
          </p>
        )
      ) : classicEntries.length > 0 ? (
        <LeaderboardBoard
          entries={classicEntries}
          metricColumnLabel={metricColumnLabel}
          formatMetric={formatClassicMetric}
          formatRecord={formatLeaderboardRecord}
          currentPlayerId={currentPlayerId}
          viewKey={`${view}-${sort}`}
        />
      ) : (
        <p className="draft-empty">
          No classic entries yet. Play {CLASSIC_HEAD_TO_HEAD_LABEL} to claim the first spot.
        </p>
      )}
    </section>
  );
}
