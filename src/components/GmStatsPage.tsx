import { useEffect, useMemo, useState } from "react";
import {
  buildLocalGmStatsSnapshot,
  formatGmRecordLine,
  formatLegacyMonthlyFinish,
  formatLegacyPeakBannerCount,
  formatLegacyPeakBannerTier,
  refreshGmLegacyFromApi,
} from "../lib/gmStats";
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

export function GmStatsPage({ onBack }: GmStatsPageProps) {
  const teamName = loadTeamProfile()?.name ?? "Your team";
  const [legacyTick, setLegacyTick] = useState(0);

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

  return (
    <HubPageChrome
      className="gm-stats-page"
      title={snapshot.teamName}
      titleClassName="landing-hub__title--name"
      lede={`${snapshot.totalWins}–${snapshot.totalLosses} · Pro ${formatRatingPoints(snapshot.ranked.elo)} · Casual ${formatRatingPoints(snapshot.classic.elo)} · ${snapshot.currentSeasonLabel}`}
      onBack={onBack}
      backLabel="Account"
    >
      <WeeklyGmRecapCard />

      <section className="hub-feature__panel">
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
              value: formatPercentileStat(snapshot.dailyDraft.averagePercentile),
            },
          ]}
        />
      </section>

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
