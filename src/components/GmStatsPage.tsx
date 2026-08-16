import { useEffect, useMemo, useState } from "react";
import {
  buildLocalGmStatsSnapshot,
  formatGmRecordLine,
  formatLegacyMonthlyFinish,
  formatLegacyPeakBannerCount,
  formatLegacyPeakBannerTier,
  refreshGmLegacyFromApi,
} from "../lib/gmStats";
import {
  canShowMostDraftedBoards,
  getMostDraftedNbaPlayersForMode,
  MOST_DRAFTED_BOARD_LABELS,
  type MostDraftedBoardMode,
} from "../lib/nbaPlayerUsage";
import { players as allPlayers } from "../data/players";
import { isAllTimeModePlayable } from "../lib/eraUnlocks";
import { formatOrdinal } from "../lib/ordinal";
import { formatRatingPoints } from "../lib/rankedElo";
import { loadTeamProfile } from "../lib/teamProfile";
import { FrontOfficeBadgeGrid } from "./FrontOfficeBadgeGrid";
import { HubPageChrome } from "./HubPageChrome";
import { RankedTierBadge } from "./RankedTierBadge";
import { WeeklyGmRecapCard } from "./WeeklyGmRecapCard";

interface GmStatsPageProps {
  onBack: () => void;
}

function GmStatsFactRows({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <dl className="gm-stats-page__facts">
      {rows.map((row) => (
        <div key={row.label} className="gm-stats-page__fact">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const formatPercentileStat = (value: number | null) =>
  value != null ? formatOrdinal(Math.round(value)) : "—";

const formatCollectionCount = (unlocked: number, total: number) =>
  `${unlocked} of ${total}`;

const MOST_DRAFTED_MODES: MostDraftedBoardMode[] = [
  "headToHead",
  "ranked",
  "daily",
];

export function GmStatsPage({ onBack }: GmStatsPageProps) {
  const teamName = loadTeamProfile()?.name ?? "Your team";
  const [legacyTick, setLegacyTick] = useState(0);
  const [mostDraftedMode, setMostDraftedMode] =
    useState<MostDraftedBoardMode | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      await refreshGmLegacyFromApi();
      if (!cancelled) {
        setLegacyTick((current) => current + 1);
      }
    };

    void refresh();

    return () => {
      cancelled = true;
    };
  }, []);

  const snapshot = useMemo(
    () => buildLocalGmStatsSnapshot(teamName),
    [teamName, legacyTick],
  );
  const peakBannerTier = formatLegacyPeakBannerTier(snapshot.legacy.peakElo);
  const nameById = useMemo(
    () => new Map(allPlayers.map((player) => [player.id, player.name])),
    [],
  );
  const showMostDrafted = useMemo(
    () => canShowMostDraftedBoards(),
    [legacyTick],
  );
  const mostDraftedSummaries = useMemo(() => {
    if (!showMostDrafted) {
      return [];
    }
    return MOST_DRAFTED_MODES.map((mode) => {
      const top = getMostDraftedNbaPlayersForMode(mode, 10);
      const leader = top[0] ?? null;
      return {
        mode,
        label: MOST_DRAFTED_BOARD_LABELS[mode],
        count: top.length,
        leaderName: leader
          ? (nameById.get(leader.playerId) ?? leader.playerId)
          : null,
        leaderDrafts: leader?.drafts ?? 0,
      };
    });
  }, [legacyTick, nameById, showMostDrafted]);
  const mostDraftedDetail = useMemo(() => {
    if (!mostDraftedMode) {
      return [];
    }
    return getMostDraftedNbaPlayersForMode(mostDraftedMode, 10).map((row) => ({
      ...row,
      name: nameById.get(row.playerId) ?? row.playerId,
    }));
  }, [mostDraftedMode, nameById, legacyTick]);

  return (
    <HubPageChrome
      className="gm-stats-page"
      title={snapshot.teamName}
      titleClassName="landing-hub__title--name"
      lede={`${snapshot.totalWins}–${snapshot.totalLosses} · ${snapshot.currentSeasonLabel}`}
      onBack={onBack}
      backLabel="Account"
    >
      <section className="hub-feature__panel">
        <WeeklyGmRecapCard />

        <div className="gm-stats-page__summary">
          <div className="gm-stats-page__summary-card">
            <span className="gm-stats-page__label">Best monthly finish</span>
            <strong className="gm-stats-page__value">
              {formatLegacyMonthlyFinish(
                snapshot.legacy.bestMonthlyRank,
                snapshot.legacy.bestMonthlyRankSeasonId,
              )}
            </strong>
          </div>
          <div className="gm-stats-page__summary-card">
            <span className="gm-stats-page__label">Most banners ever</span>
            <strong className="gm-stats-page__value">
              {formatLegacyPeakBannerCount(snapshot.legacy.peakElo)}
            </strong>
            {peakBannerTier ? (
              <span className="gm-stats-page__value-meta">{peakBannerTier}</span>
            ) : null}
          </div>
          <div className="gm-stats-page__summary-card">
            <span className="gm-stats-page__label">Pro</span>
            <strong className="gm-stats-page__value">
              {formatRatingPoints(snapshot.ranked.elo)}
            </strong>
          </div>
          <div className="gm-stats-page__summary-card">
            <span className="gm-stats-page__label">Casual</span>
            <strong className="gm-stats-page__value">
              {formatRatingPoints(snapshot.classic.elo)}
            </strong>
          </div>
        </div>

        <section className="gm-stats-page__section">
          <h2>Front Office</h2>
          <div className="gm-stats-page__tier-row">
            <RankedTierBadge
              tier={snapshot.ranked.tier}
              elo={snapshot.ranked.elo}
              compact
            />
          </div>
          <FrontOfficeBadgeGrid peakElo={snapshot.legacy.peakElo} />
        </section>

        <section className="gm-stats-page__section">
          <h2>Mode records</h2>
          <GmStatsFactRows
            rows={[
              {
                label: "Casual H2H",
                value: formatGmRecordLine(
                  snapshot.records.headToHead.wins,
                  snapshot.records.headToHead.losses,
                  snapshot.records.headToHead.ties,
                ),
              },
              {
                label: "Pro H2H",
                value: formatGmRecordLine(
                  snapshot.records.ranked.wins,
                  snapshot.records.ranked.losses,
                  snapshot.records.ranked.ties,
                ),
              },
              ...(isAllTimeModePlayable()
                ? [
                    {
                      label: "All-Time",
                      value: formatGmRecordLine(
                        snapshot.records.allTime.wins,
                        snapshot.records.allTime.losses,
                        snapshot.records.allTime.ties,
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </section>

        <section className="gm-stats-page__section">
          <h2>Daily draft</h2>
          <GmStatsFactRows
            rows={[
              {
                label: "Days played",
                value: String(snapshot.dailyDraft.daysPlayed),
              },
              {
                label: "Basic streak",
                value: snapshot.dailyDraft.basicStreakLabel,
              },
              {
                label: "Advanced streak",
                value: snapshot.dailyDraft.advancedStreakLabel,
              },
              {
                label: "Best percentile",
                value: formatPercentileStat(snapshot.dailyDraft.bestPercentile),
              },
              {
                label: "Average percentile",
                value: formatPercentileStat(
                  snapshot.dailyDraft.averagePercentile,
                ),
              },
            ]}
          />
        </section>

        {showMostDrafted ? (
          <section className="gm-stats-page__section">
            <div className="gm-stats-page__section-heading">
              <h2>
                {mostDraftedMode
                  ? `Most drafted · ${MOST_DRAFTED_BOARD_LABELS[mostDraftedMode]}`
                  : "Most drafted"}
              </h2>
              {mostDraftedMode ? (
                <button
                  type="button"
                  className="gm-stats-page__section-back"
                  onClick={() => setMostDraftedMode(null)}
                >
                  All modes
                </button>
              ) : null}
            </div>

            {mostDraftedMode ? (
              mostDraftedDetail.length === 0 ? (
                <p className="gm-stats-page__section-copy">
                  No {MOST_DRAFTED_BOARD_LABELS[mostDraftedMode]} drafts yet.
                </p>
              ) : (
                <ol className="gm-stats-page__most-drafted">
                  {mostDraftedDetail.map((row, index) => (
                    <li
                      key={row.playerId}
                      className="gm-stats-page__most-drafted-row"
                    >
                      <span className="gm-stats-page__most-drafted-rank">
                        {index + 1}.
                      </span>
                      <span className="gm-stats-page__most-drafted-name">
                        {row.name}
                      </span>
                      <span className="gm-stats-page__most-drafted-meta">
                        {row.drafts} draft{row.drafts === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ol>
              )
            ) : (
              <div className="gm-stats-page__most-drafted-boards">
                {mostDraftedSummaries.map((board) => (
                  <button
                    key={board.mode}
                    type="button"
                    className="gm-stats-page__most-drafted-board"
                    onClick={() => setMostDraftedMode(board.mode)}
                  >
                    <span className="gm-stats-page__most-drafted-board-label">
                      {board.label}
                    </span>
                    <span className="gm-stats-page__most-drafted-board-meta">
                      {board.leaderName
                        ? `${board.leaderName} · ${board.leaderDrafts}`
                        : "No drafts yet"}
                    </span>
                    <span
                      className="gm-stats-page__most-drafted-board-chevron"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <section className="gm-stats-page__section">
          <h2>Collection</h2>
          <GmStatsFactRows
            rows={[
              {
                label: "All-Stars",
                value: formatCollectionCount(
                  snapshot.collection.unlocked,
                  snapshot.collection.total,
                ),
              },
              {
                label: "Superstars",
                value: formatCollectionCount(
                  snapshot.collection.superstarUnlocked,
                  snapshot.collection.superstarTotal,
                ),
              },
              {
                label: "Scrub pool",
                value: formatCollectionCount(
                  snapshot.collection.scrubPoolUnlocked,
                  snapshot.collection.scrubPoolTotal,
                ),
              },
            ]}
          />
        </section>
      </section>
    </HubPageChrome>
  );
}
