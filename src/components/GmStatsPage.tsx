import { useEffect, useMemo, useState } from "react";
import {
  buildLocalGmStatsSnapshot,
  formatGmRecordLine,
  formatLegacyMonthlyFinish,
  formatLegacyPeakBannerCount,
  formatLegacyPeakBannerTier,
  refreshGmLegacyFromApi,
} from "../lib/gmStats";
import { formatOrdinal } from "../lib/ordinal";
import { formatRatingPoints } from "../lib/rankedElo";
import { loadTeamProfile } from "../lib/teamProfile";
import { DraftDayGmLogo } from "./DraftDayGmLogo";
import { FrontOfficeBadgeGrid } from "./FrontOfficeBadgeGrid";
import { RankedTierBadge } from "./RankedTierBadge";

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

export function GmStatsPage() {
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
    <div className="hub-feature gm-stats-page">
      <div className="landing-hub__top">
        <div className="landing__brand landing__brand--compact">
          <DraftDayGmLogo className="landing__logo landing__logo--compact" />
        </div>
        <h1 className="landing-hub__title">{snapshot.teamName}</h1>
        <p className="landing__lede landing-hub__lede">
          {formatRatingPoints(snapshot.ranked.elo)} this month ·{" "}
          {snapshot.currentSeasonLabel}
        </p>
      </div>

      <section className="hub-feature__panel">
      <div className="gm-stats-page__summary">
        <div className="gm-stats-page__summary-card">
          <span className="gm-stats-page__label">Total wins</span>
          <strong>{snapshot.totalWins}</strong>
        </div>
        <div className="gm-stats-page__summary-card">
          <span className="gm-stats-page__label">Total losses</span>
          <strong>{snapshot.totalLosses}</strong>
        </div>
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
            <span className="gm-stats-page__value-meta">{peakBannerTier} tier</span>
          ) : null}
        </div>
      </div>

      <section className="gm-stats-page__section">
        <h2>Front office</h2>
        <div className="gm-stats-page__tier-row">
          <RankedTierBadge
            tier={snapshot.ranked.tier}
            elo={snapshot.ranked.elo}
            compact
          />
          <p className="gm-stats-page__section-copy">
            Peak this month: {formatRatingPoints(snapshot.ranked.peakElo)} ·{" "}
            {snapshot.ranked.rankedGamesPlayed} ranked games played
          </p>
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
            {
              label: "All-Time",
              value: formatGmRecordLine(
                snapshot.records.allTime.wins,
                snapshot.records.allTime.losses,
                snapshot.records.allTime.ties,
              ),
            },
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
            {
              label: "Latest result",
              value: snapshot.dailyDraft.latestResult ?? "—",
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
              label: "Scrubs",
              value: formatCollectionCount(
                snapshot.collection.unlockedScrubs,
                snapshot.collection.scrubPool,
              ),
            },
            {
              label: "Super Scrubs",
              value: formatCollectionCount(
                snapshot.collection.unlockedSuperScrubs,
                snapshot.collection.superScrubPool,
              ),
            },
          ]}
        />
      </section>
      </section>
    </div>
  );
}
