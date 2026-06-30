import { useEffect, useMemo, useState } from "react";
import {
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
import { formatPublicTag } from "../lib/playerIdentity";
import { getOrCreatePlayerId } from "../lib/playerRecord";
import {
  CLASSIC_HEAD_TO_HEAD_LABEL,
  PRO_HEAD_TO_HEAD_LABEL,
} from "../lib/modeLabels";
import { DraftDayGmLogo } from "./DraftDayGmLogo";
import { ModeCardInfo } from "./ModeCardInfo";
import { RankedTierBadge } from "./RankedTierBadge";

interface LeaderboardPageProps {
  onBack: () => void;
}

type LeaderboardView = "classic" | "ranked";
type RankedSort = RankedLeaderboardSort;
type ClassicSort = Exclude<LeaderboardSort, "elo">;
type BoardSort = RankedSort | ClassicSort;

type BoardEntry = ReturnType<typeof getTopLeaderboard>[number];

const SORT_OPTIONS: {
  id: BoardSort;
  label: string;
  views: LeaderboardView[];
}[] = [
  { id: "elo", label: RATING_LABEL, views: ["ranked"] },
  { id: "winStreak", label: "Win streak", views: ["ranked", "classic"] },
  { id: "lossStreak", label: "Loss streak", views: ["ranked", "classic"] },
];

const TIER_RANGE_DETAILS = RANKED_TIERS.map(
  (tier) => `${tier.label}: ${formatTierBannerRange(tier)}`,
);

interface LeaderboardBoardProps {
  entries: BoardEntry[];
  formatMetric: (entry: BoardEntry) => string;
  formatRecord: (entry: BoardEntry) => string;
  currentPlayerId: string;
  viewKey: string;
  showTier: boolean;
}

function LeaderboardEntryRow({
  entry,
  rank,
  formatMetric,
  formatRecord,
  currentPlayerId,
  showTier,
}: {
  entry: BoardEntry;
  rank: number;
  formatMetric: (entry: BoardEntry) => string;
  formatRecord: (entry: BoardEntry) => string;
  currentPlayerId: string;
  showTier: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isYou = entry.playerId === currentPlayerId;

  return (
    <li
      className={`leaderboard-row${
        isYou ? " leaderboard-row--you" : ""
      }${expanded ? " leaderboard-row--expanded" : ""}`}
    >
      <button
        type="button"
        className="leaderboard-row__main"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="leaderboard-row__rank">{rank}</span>
        <span className="leaderboard-row__name">{entry.name}</span>
        <span className="leaderboard-row__tag">{formatPublicTag(entry.publicTag)}</span>
        <span className="leaderboard-row__metric">
          <strong>{formatMetric(entry)}</strong>
        </span>
      </button>
      {expanded ? (
        <div className="leaderboard-row__details">
          <div className="leaderboard-row__detail">
            <span className="leaderboard-row__detail-label">Record</span>
            <strong>{formatRecord(entry)}</strong>
          </div>
          {showTier ? (
            <div className="leaderboard-row__detail">
              <span className="leaderboard-row__detail-label">Tier</span>
              <RankedTierBadge tierLabel={entry.tierLabel} elo={entry.elo} compact />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function LeaderboardBoard({
  entries,
  formatMetric,
  formatRecord,
  currentPlayerId,
  viewKey,
  showTier,
}: LeaderboardBoardProps) {
  return (
    <ol className="leaderboard-rows" key={`leaderboard-rows-${viewKey}`}>
      {entries.map((entry, index) => (
        <LeaderboardEntryRow
          key={entry.playerId}
          entry={entry}
          rank={index + 1}
          formatMetric={formatMetric}
          formatRecord={formatRecord}
          currentPlayerId={currentPlayerId}
          showTier={showTier}
        />
      ))}
    </ol>
  );
}

export function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  const [view, setView] = useState<LeaderboardView>("ranked");
  const [rankedSort, setRankedSort] = useState<RankedSort>("elo");
  const [classicSort, setClassicSort] = useState<ClassicSort>("winStreak");
  const [refreshTick, setRefreshTick] = useState(0);
  const currentPlayerId = getOrCreatePlayerId();
  const seasonId = getCurrentSeasonId();
  const sort: BoardSort = view === "ranked" ? rankedSort : classicSort;

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
    () => getTopLeaderboard(classicSort),
    [classicSort, refreshTick],
  );
  const rankedEntries = useMemo(
    () => getTopRankedLeaderboard(rankedSort),
    [rankedSort, refreshTick],
  );

  const formatClassicMetric = (entry: BoardEntry) => {
    if (sort === "winStreak") {
      return formatLeaderboardWinStreak(entry);
    }

    return formatLeaderboardLossStreak(entry);
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

  const showTierInfo = view === "ranked" && rankedSort === "elo";

  const handleSortChange = (nextSort: BoardSort) => {
    if (view === "ranked") {
      setRankedSort(nextSort as RankedSort);
      return;
    }

    if (nextSort !== "elo") {
      setClassicSort(nextSort as ClassicSort);
    }
  };

  return (
    <section className="leaderboard panel panel--compact feature-page feature-page--leaderboard">
      <div className="leaderboard__top">
        <div className="leaderboard__header">
          <div className="leaderboard__title-block">
            <div className="leaderboard__brand">
              <DraftDayGmLogo className="leaderboard__logo" />
            </div>
            <h1>Leaderboards</h1>
          </div>
          <button type="button" className="secondary-button" onClick={onBack}>
            Back to home
          </button>
        </div>

        <p className="leaderboard__subtitle">
          {view === "ranked"
            ? getRankedLeaderboardFootnote(rankedSort, seasonId)
            : getLeaderboardFootnote(classicSort)}
        </p>

        <div
          className="leaderboard__tabs leaderboard__tabs--views"
          role="tablist"
          aria-label="Leaderboard view"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "ranked"}
            className={view === "ranked" ? "is-active" : undefined}
            onClick={() => setView("ranked")}
          >
            {PRO_HEAD_TO_HEAD_LABEL}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "classic"}
            className={view === "classic" ? "is-active" : undefined}
            onClick={() => setView("classic")}
          >
            {CLASSIC_HEAD_TO_HEAD_LABEL}
          </button>
        </div>

        <div className="leaderboard__toolbar">
          <div
            className="leaderboard__sort-grid"
            role="tablist"
            aria-label="Leaderboard sort"
          >
            {SORT_OPTIONS.filter((option) => option.views.includes(view)).map(
              (option) => {
                const isActive = sort === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={isActive ? "is-active" : undefined}
                    onClick={() => handleSortChange(option.id)}
                  >
                    {option.label}
                  </button>
                );
              },
            )}
          </div>
        </div>
      </div>

      {showTierInfo ? (
        <div className="leaderboard-tier-guide">
          <div className="leaderboard-tier-guide__header">
            <p className="leaderboard-tier-guide__title">Banner tier ranges</p>
            <ModeCardInfo
              details={TIER_RANGE_DETAILS}
              variant="corner"
              popoverAlign="start"
              ariaLabel="Banner tier ranges"
            />
          </div>
          <ul className="leaderboard-tier-guide__list">
            {RANKED_TIERS.map((tier) => (
              <li key={tier.id} className="leaderboard-tier-guide__item">
                <RankedTierBadge tier={tier} compact />
                <span className="leaderboard-tier-guide__range">
                  {formatTierBannerRange(tier)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {view === "ranked" ? (
        rankedEntries.length > 0 ? (
          <LeaderboardBoard
            entries={rankedEntries}
            formatMetric={formatRankedMetric}
            formatRecord={formatRankedLeaderboardRecord}
            currentPlayerId={currentPlayerId}
            viewKey={`${view}-${sort}`}
            showTier
          />
        ) : (
          <p className="draft-empty">
            No {PRO_HEAD_TO_HEAD_LABEL} entries yet. Play a matchup to join the ladder.
          </p>
        )
      ) : classicEntries.length > 0 ? (
        <LeaderboardBoard
          entries={classicEntries}
          formatMetric={formatClassicMetric}
          formatRecord={formatLeaderboardRecord}
          currentPlayerId={currentPlayerId}
          viewKey={`${view}-${sort}`}
          showTier={false}
        />
      ) : (
        <p className="draft-empty">
          No casual entries yet. Play {CLASSIC_HEAD_TO_HEAD_LABEL} to claim the first spot.
        </p>
      )}
    </section>
  );
}
