import { useEffect, useMemo, useState } from "react";
import { formatUsername } from "../lib/accountCredentials";
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
import { formatPublicTag } from "../lib/playerIdentity";
import { getOrCreatePlayerId } from "../lib/playerRecord";
import {
  CLASSIC_HEAD_TO_HEAD_LABEL,
  PRO_HEAD_TO_HEAD_LABEL,
} from "../lib/modeLabels";
import {
  reconcileLocalClassicLeaderboardFromRemote,
  reconcileLocalRankedLeaderboardFromRemote,
} from "../lib/reconcileLeaderboardSelf";
import { GmProfileModal } from "./GmProfileModal";
import { AccountRequiredNote } from "./AccountRequiredNote";
import { ModeCardInfo } from "./ModeCardInfo";
import { RankedTierBadge } from "./RankedTierBadge";

type LeaderboardView = "classic" | "ranked";
type RankedSort = RankedLeaderboardSort;
type ClassicSort = LeaderboardSort;
type BoardSort = RankedSort | ClassicSort;

type BoardEntry = ReturnType<typeof getTopLeaderboard>[number];

const SORT_OPTIONS: {
  id: BoardSort;
  label: string;
  views: LeaderboardView[];
}[] = [
  { id: "elo", label: RATING_LABEL, views: ["ranked", "classic"] },
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
  profileMode: "classic" | "ranked";
}

function LeaderboardEntryRow({
  entry,
  rank,
  formatMetric,
  formatRecord,
  currentPlayerId,
  showTier,
  profileMode,
}: {
  entry: BoardEntry;
  rank: number;
  formatMetric: (entry: BoardEntry) => string;
  formatRecord: (entry: BoardEntry) => string;
  currentPlayerId: string;
  showTier: boolean;
  profileMode: "classic" | "ranked";
}) {
  const [expanded, setExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isYou = entry.isYou === true || entry.playerId === currentPlayerId;

  return (
    <li
      className={`leaderboard-row${
        isYou ? " leaderboard-row--you" : ""
      }${expanded ? " leaderboard-row--expanded" : ""}`}
    >
      <div className="leaderboard-row__main">
        <button
          type="button"
          className="leaderboard-row__rank-button"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Show"} details for ${entry.name}`}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className="leaderboard-row__rank">{rank}</span>
        </button>
        <div className="leaderboard-row__identity">
          <button
            type="button"
            className="leaderboard-row__name"
            aria-label={`Open profile for ${entry.name}`}
            onClick={() => setProfileOpen(true)}
          >
            {entry.name}
          </button>
          {entry.username ? (
            <button
              type="button"
              className="leaderboard-row__username"
              aria-label={`Open profile for ${formatUsername(entry.username)}`}
              onClick={() => setProfileOpen(true)}
            >
              {formatUsername(entry.username)}
            </button>
          ) : null}
          <button
            type="button"
            className="leaderboard-row__tag"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} details for ${formatPublicTag(entry.publicTag)}`}
            onClick={() => setExpanded((current) => !current)}
          >
            {formatPublicTag(entry.publicTag)}
          </button>
        </div>
        <button
          type="button"
          className="leaderboard-row__metric"
          aria-expanded={expanded}
          aria-label={`${expanded ? "Hide" : "Show"} details for ${entry.name}, ${formatRecord(entry)}, ${formatMetric(entry)}`}
          onClick={() => setExpanded((current) => !current)}
        >
          <span className="leaderboard-row__record">{formatRecord(entry)}</span>
          <strong>{formatMetric(entry)}</strong>
        </button>
      </div>
      {expanded ? (
        <div className="leaderboard-row__details">
          {showTier ? (
            <div className="leaderboard-row__detail">
              <span className="leaderboard-row__detail-label">Tier</span>
              <RankedTierBadge tierLabel={entry.tierLabel} elo={entry.elo} compact />
            </div>
          ) : (
            <div className="leaderboard-row__detail">
              <span className="leaderboard-row__detail-label">Record</span>
              <strong>{formatRecord(entry)}</strong>
            </div>
          )}
        </div>
      ) : null}
      {profileOpen ? (
        <GmProfileModal
          playerId={entry.playerId}
          name={entry.name}
          publicTag={entry.publicTag}
          username={entry.username}
          wins={entry.wins}
          losses={entry.losses}
          winStreak={entry.winStreak}
          lossStreak={entry.lossStreak}
          elo={entry.elo}
          tierLabel={entry.tierLabel}
          profileMode={profileMode}
          onClose={() => setProfileOpen(false)}
        />
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
  profileMode,
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
          profileMode={profileMode}
        />
      ))}
    </ol>
  );
}

export function LeaderboardPage() {
  const [view, setView] = useState<LeaderboardView>("ranked");
  const [rankedSort, setRankedSort] = useState<RankedSort>("elo");
  const [classicSort, setClassicSort] = useState<ClassicSort>("elo");
  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const currentPlayerId = getOrCreatePlayerId();
  const seasonId = getCurrentSeasonId();
  const sort: BoardSort = view === "ranked" ? rankedSort : classicSort;

  const refreshBoard = async () => {
    setRefreshBusy(true);
    const ok = await refreshLeaderboardFromApi({
      mode: view,
      sort: sort as LeaderboardSort,
      limit: view === "ranked" ? RANKED_LEADERBOARD_LIMIT : LEADERBOARD_LIMIT,
      seasonId,
    });
    if (ok) {
      if (view === "ranked") {
        reconcileLocalRankedLeaderboardFromRemote(seasonId);
      } else {
        reconcileLocalClassicLeaderboardFromRemote(seasonId);
      }
    }
    setRefreshFailed(!ok);
    setRefreshBusy(false);
    setRefreshTick((current) => current + 1);
  };

  useEffect(() => {
    void refreshBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when board identity changes
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

  const showTierInfo =
    (view === "ranked" && rankedSort === "elo") ||
    (view === "classic" && classicSort === "elo");

  const handleSortChange = (nextSort: BoardSort) => {
    if (view === "ranked") {
      setRankedSort(nextSort as RankedSort);
      return;
    }

    setClassicSort(nextSort as ClassicSort);
  };

  const subtitle =
    view === "ranked"
      ? getRankedLeaderboardFootnote(rankedSort, seasonId)
      : getLeaderboardFootnote(classicSort, seasonId);

  return (
    <div className="hub-feature leaderboard">
      <div className="landing-hub__top">
        <h1 className="landing-hub__title">Ranks</h1>
        <p className="landing__lede landing-hub__lede">{subtitle}</p>
      </div>

      <AccountRequiredNote>
        Create an account to appear on these leaderboards. Anyone can browse.
      </AccountRequiredNote>

      {refreshFailed ? (
        <p className="form-error" role="alert">
          Couldn&apos;t refresh leaderboards.{" "}
          <button
            type="button"
            className="daily-draft-results__sync-retry"
            disabled={refreshBusy}
            onClick={() => {
              void refreshBoard();
            }}
          >
            {refreshBusy ? "Retrying…" : "Retry"}
          </button>
        </p>
      ) : null}

      <section className="hub-feature__panel leaderboard__panel">
        <div className="leaderboard__top">
          <div
            className="leaderboard__tabs leaderboard__tabs--views"
            role="tablist"
            aria-label="Leaderboard view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "ranked"}
              className={`leaderboard__tab leaderboard__tab--ranked hub-accent--ranked${
                view === "ranked" ? " is-active" : ""
              }`}
              onClick={() => setView("ranked")}
            >
              {PRO_HEAD_TO_HEAD_LABEL}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "classic"}
              className={`leaderboard__tab leaderboard__tab--classic hub-accent--h2h${
                view === "classic" ? " is-active" : ""
              }`}
              onClick={() => setView("classic")}
            >
              {CLASSIC_HEAD_TO_HEAD_LABEL}
            </button>
          </div>

          <div
            className={`leaderboard__toolbar${
              showTierInfo ? " leaderboard__toolbar--with-tier-info" : ""
            }`}
          >
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
            {showTierInfo ? (
              <div className="leaderboard__tier-info-slot">
                <span className="leaderboard__tier-info">
                  Tier ranges
                  <ModeCardInfo
                    details={TIER_RANGE_DETAILS}
                    variant="corner"
                    popoverAlign="start"
                    ariaLabel="Banner tier ranges"
                    popoverClassName="mode-card-info__popover--leaderboard"
                  />
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {refreshBusy &&
        (view === "ranked" ? rankedEntries.length === 0 : classicEntries.length === 0) ? (
          <p className="draft-empty" aria-live="polite">
            Loading ranks…
          </p>
        ) : view === "ranked" ? (
          rankedEntries.length > 0 ? (
            <LeaderboardBoard
              entries={rankedEntries}
              formatMetric={formatRankedMetric}
              formatRecord={formatRankedLeaderboardRecord}
              currentPlayerId={currentPlayerId}
              viewKey={`${view}-${sort}`}
              showTier
              profileMode="ranked"
            />
          ) : (
            <p className="draft-empty">
              No {PRO_HEAD_TO_HEAD_LABEL} entries yet. Play a matchup to join the
              ladder.
            </p>
          )
        ) : classicEntries.length > 0 ? (
          <LeaderboardBoard
            entries={classicEntries}
            formatMetric={formatClassicMetric}
            formatRecord={formatLeaderboardRecord}
            currentPlayerId={currentPlayerId}
            viewKey={`${view}-${sort}`}
            showTier
            profileMode="classic"
          />
        ) : (
          <p className="draft-empty">
            No casual entries yet. Play {CLASSIC_HEAD_TO_HEAD_LABEL} to claim the
            first spot.
          </p>
        )}
      </section>
    </div>
  );
}
