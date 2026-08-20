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
      lede={`Career ${formatGmRecordLine(snapshot.totalWins, snapshot.totalLosses, snapshot.totalTies)} · ${snapshot.currentSeasonLabel}`}
      onBack={onBack}
      backLabel="Franchise"
    >
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
              {
                label: "Events",
                value: formatGmRecordLine(
                  snapshot.events.wins,
                  snapshot.events.losses,
                  snapshot.events.ties,
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
                label: "Current Basic streak",
                value: snapshot.dailyDraft.basicStreakLabel,
              },
              {
                label: "Current Advanced streak",
                value: snapshot.dailyDraft.advancedStreakLabel,
              },
              {
                label: "Longest Basic streak",
                value: String(snapshot.dailyDraft.longestBasicStreak),
              },
              {
                label: "Longest Advanced streak",
                value: String(snapshot.dailyDraft.longestAdvancedStreak),
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
      </section>
    </HubPageChrome>
  );
}
