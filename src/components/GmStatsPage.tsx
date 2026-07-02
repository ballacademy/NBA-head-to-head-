import { useEffect, useMemo, useState } from "react";
import {
  buildLocalGmStatsSnapshot,
  formatGmModeRecord,
  formatLegacyMonthlyFinish,
  formatLegacyPeakBannerCount,
  formatLegacyPeakBannerTier,
  refreshGmLegacyFromApi,
} from "../lib/gmStats";
import { formatRatingPoints } from "../lib/rankedElo";
import { loadTeamProfile } from "../lib/teamProfile";
import { DraftDayGmLogo } from "./DraftDayGmLogo";
import { FrontOfficeBadgeGrid } from "./FrontOfficeBadgeGrid";
import { RankedTierBadge } from "./RankedTierBadge";

interface GmStatsPageProps {
  onBack: () => void;
}

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
    <section className="gm-stats-page panel panel--compact feature-page feature-page--gm-stats">
      <div className="gm-stats-page__header">
        <div>
          <div className="gm-stats-page__brand">
            <DraftDayGmLogo className="gm-stats-page__logo" />
          </div>
          <p className="eyebrow">GM career</p>
          <h1>{snapshot.teamName}</h1>
          <p className="gm-stats-page__subtitle">
            {formatRatingPoints(snapshot.ranked.elo)} this month ·{" "}
            {snapshot.currentSeasonLabel}
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={onBack}>
          Back to home
        </button>
      </div>

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
        <ul className="gm-stats-page__list">
          <li>{formatGmModeRecord("Casual H2H", snapshot.records.headToHead.wins, snapshot.records.headToHead.losses, snapshot.records.headToHead.ties)}</li>
          <li>{formatGmModeRecord("Pro H2H", snapshot.records.ranked.wins, snapshot.records.ranked.losses, snapshot.records.ranked.ties)}</li>
          <li>{formatGmModeRecord("All-Time", snapshot.records.allTime.wins, snapshot.records.allTime.losses, snapshot.records.allTime.ties)}</li>
        </ul>
      </section>

      <section className="gm-stats-page__section">
        <h2>Daily draft</h2>
        <ul className="gm-stats-page__list">
          <li>Days played: {snapshot.dailyDraft.daysPlayed}</li>
          <li>
            Best percentile:{" "}
            {snapshot.dailyDraft.bestPercentile != null
              ? `${snapshot.dailyDraft.bestPercentile}th`
              : "—"}
          </li>
          <li>
            Average percentile:{" "}
            {snapshot.dailyDraft.averagePercentile != null
              ? `${snapshot.dailyDraft.averagePercentile}th`
              : "—"}
          </li>
          <li>
            Latest result: {snapshot.dailyDraft.latestResult ?? "—"}
          </li>
        </ul>
      </section>

      <section className="gm-stats-page__section">
        <h2>Collection</h2>
        <ul className="gm-stats-page__list">
          <li>
            All-Stars: {snapshot.collection.unlocked}/
            {snapshot.collection.total}
          </li>
          <li>
            Superstars: {snapshot.collection.superstarUnlocked}/
            {snapshot.collection.superstarTotal}
          </li>
          <li>
            Scrubs: {snapshot.collection.unlockedScrubs}/
            {snapshot.collection.scrubPool}
          </li>
        </ul>
      </section>
    </section>
  );
}
