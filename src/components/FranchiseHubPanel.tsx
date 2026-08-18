import { useEffect, useMemo } from "react";
import { evaluateCareerProgressAchievements } from "../lib/achievements";
import {
  getNextDailyStreakGoal,
  getCareerProgressCounters,
} from "../lib/careerProgressAchievements";
import { buildLocalGmStatsSnapshot } from "../lib/gmStats";
import type { LandingPlaySection } from "../lib/landingHub";
import { getNextBadgeTeaser } from "../lib/nextBadgeTeaser";
import { formatOrdinal } from "../lib/ordinal";
import { COLLECTION_UNLOCK_COPY, type CollectionTier } from "../lib/playerCollection";
import { loadTeamProfile } from "../lib/teamProfile";
import { MostDraftedBoards } from "./MostDraftedBoards";
import { WeeklyGmRecapCard } from "./WeeklyGmRecapCard";

type CollectionProgress = ReturnType<
  typeof import("../lib/playerCollection").getCollectionProgress
>;

interface FranchiseHubPanelProps {
  collectionProgress: CollectionProgress;
  collectionTier: CollectionTier | null;
  onSelectTier: (tier: CollectionTier) => void;
  onViewStats: () => void;
  onViewAchievements: () => void;
  onViewGmStats: () => void;
  onViewWeeklyRecap: () => void;
  onPlayDaily: () => void;
  onPlayIntent?: (intent: {
    playSection: LandingPlaySection;
    h2hMode?: "classic" | "ranked";
  }) => void;
}

const formatPercentile = (value: number | null) =>
  value != null ? formatOrdinal(Math.round(value)) : "—";

function FranchiseRow({
  label,
  meta,
  onClick,
  active = false,
  ariaLabel,
}: {
  label: string;
  meta: string;
  onClick: () => void;
  active?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`franchise-home__row${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel ?? `${label}, ${meta}`}
    >
      <span className="franchise-home__row-copy">
        <strong>{label}</strong>
      </span>
      <span className="franchise-home__row-meta">{meta}</span>
      <span className="franchise-home__row-chevron" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

export function FranchiseHubPanel({
  collectionProgress,
  collectionTier,
  onSelectTier,
  onViewStats,
  onViewAchievements,
  onViewGmStats,
  onViewWeeklyRecap,
  onPlayDaily,
  onPlayIntent,
}: FranchiseHubPanelProps) {
  useEffect(() => {
    evaluateCareerProgressAchievements();
  }, []);

  const dailyDraft = useMemo(() => {
    const teamName = loadTeamProfile()?.name ?? "Your team";
    return buildLocalGmStatsSnapshot(teamName).dailyDraft;
  }, []);
  const streakCounters = useMemo(() => getCareerProgressCounters(), []);
  const nextDailyGoal = useMemo(
    () => getNextDailyStreakGoal(streakCounters),
    [streakCounters],
  );
  const nextBadge = useMemo(() => getNextBadgeTeaser(), []);
  const nextBadgeIsDaily = nextBadge?.hint.playSection === "daily";

  return (
    <div className="franchise-home">
      <WeeklyGmRecapCard
        variant="compact"
        alwaysVisible
        hideDismiss
        onViewWeek={onViewWeeklyRecap}
      />

      <section className="franchise-home__card landing-card" aria-label="Daily Draft">
        <div className="franchise-home__card-head">
          <p className="franchise-home__eyebrow">Daily Draft</p>
          <p className="franchise-home__lede">Career totals</p>
        </div>
        <p className="franchise-home__summary">
          {dailyDraft.daysPlayed} day{dailyDraft.daysPlayed === 1 ? "" : "s"} ·
          Basic {dailyDraft.basicStreakLabel} · Adv {dailyDraft.advancedStreakLabel}
        </p>
        <p className="franchise-home__meta">
          Best {formatPercentile(dailyDraft.bestPercentile)} · Avg{" "}
          {formatPercentile(dailyDraft.averagePercentile)}
        </p>
        {nextBadge ? (
          <div className="franchise-home__note">
            <p className="franchise-home__note-label">Next badge</p>
            <p className="franchise-home__note-title">
              {nextBadge.emoji} {nextBadge.title}
            </p>
            <p className="franchise-home__note-copy">{nextBadge.description}</p>
            {onPlayIntent && !nextBadgeIsDaily ? (
              <button
                type="button"
                className="franchise-home__text-link"
                onClick={() =>
                  onPlayIntent({
                    playSection: nextBadge.hint.playSection,
                    h2hMode: nextBadge.hint.h2hMode,
                  })
                }
              >
                {nextBadge.hint.ctaLabel}
              </button>
            ) : null}
          </div>
        ) : nextDailyGoal ? (
          <p className="franchise-home__meta">
            Streak goal: {nextDailyGoal.title} (
            {Math.min(streakCounters.dailyStreak, nextDailyGoal.target)}/
            {nextDailyGoal.target})
          </p>
        ) : (
          <p className="franchise-home__meta">Daily streak badges complete.</p>
        )}
        <button
          type="button"
          className="franchise-home__cta secondary-button"
          onClick={onPlayDaily}
        >
          Play Daily
        </button>
      </section>

      <section className="franchise-home__card landing-card" aria-label="Collection">
        <div className="franchise-home__card-head">
          <p className="franchise-home__eyebrow">Collection</p>
          <p className="franchise-home__lede">{COLLECTION_UNLOCK_COPY}</p>
        </div>
        <div className="franchise-home__rows">
          <FranchiseRow
            label="All-Stars"
            meta={`${collectionProgress.unlocked}/${collectionProgress.total}`}
            onClick={() => onSelectTier("all-star")}
            active={collectionTier === "all-star"}
            ariaLabel={`View unlocked All-Stars, ${collectionProgress.unlocked} of ${collectionProgress.total}`}
          />
          <FranchiseRow
            label="Superstars"
            meta={`${collectionProgress.superstarUnlocked}/${collectionProgress.superstarTotal}`}
            onClick={() => onSelectTier("superstar")}
            active={collectionTier === "superstar"}
            ariaLabel={`View unlocked Superstars, ${collectionProgress.superstarUnlocked} of ${collectionProgress.superstarTotal}`}
          />
          <FranchiseRow
            label="Scrubs"
            meta={`${collectionProgress.unlockedScrubs}/${collectionProgress.scrubPool}`}
            onClick={() => onSelectTier("scrub")}
            active={collectionTier === "scrub"}
            ariaLabel={`View unlocked Scrubs, ${collectionProgress.unlockedScrubs} of ${collectionProgress.scrubPool}`}
          />
          <FranchiseRow
            label="Super Scrubs"
            meta={`${collectionProgress.unlockedSuperScrubs}/${collectionProgress.superScrubPool}`}
            onClick={() => onSelectTier("super-scrub")}
            active={collectionTier === "super-scrub"}
            ariaLabel={`View unlocked Super Scrubs, ${collectionProgress.unlockedSuperScrubs} of ${collectionProgress.superScrubPool}`}
          />
          <FranchiseRow
            label="Recent All-Stars"
            meta={`${collectionProgress.recentUnlocked}/${collectionProgress.recentTotal}`}
            onClick={() => onSelectTier("recent-all-star")}
            active={collectionTier === "recent-all-star"}
            ariaLabel={`View unlocked Recent All-Stars, ${collectionProgress.recentUnlocked} of ${collectionProgress.recentTotal}`}
          />
        </div>
      </section>

      <nav className="franchise-home__card landing-card" aria-label="Career pages">
        <div className="franchise-home__card-head">
          <p className="franchise-home__eyebrow">Career</p>
          <p className="franchise-home__lede">Badges, pool, and GM stats</p>
        </div>
        <div className="franchise-home__rows">
          <FranchiseRow
            label="Badges"
            meta="Unlocks and career goals"
            onClick={onViewAchievements}
          />
          <FranchiseRow
            label="Player pool"
            meta="NBA production this season"
            onClick={onViewStats}
          />
          <FranchiseRow
            label="GM Stats"
            meta="Front Office, Events, and Daily"
            onClick={onViewGmStats}
          />
        </div>
      </nav>

      <MostDraftedBoards />
    </div>
  );
}
