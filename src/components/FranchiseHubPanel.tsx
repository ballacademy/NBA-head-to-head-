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
import type { CollectionTier } from "../lib/playerCollection";
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

const isDailyStreakBadge = (id: string) => id.startsWith("daily-streak-");

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
  const nextBadgeIsDaily =
    nextBadge != null && isDailyStreakBadge(nextBadge.id);
  /** Separate card only when the next goal is not already Daily Draft. */
  const showStandaloneNextBadge =
    Boolean(nextBadge && onPlayIntent && !nextBadgeIsDaily);

  return (
    <div className="franchise-home">
      <WeeklyGmRecapCard
        variant="compact"
        alwaysVisible
        hideDismiss
        onViewWeek={onViewWeeklyRecap}
      />

      {showStandaloneNextBadge && nextBadge && onPlayIntent ? (
        <section
          className="franchise-home__next-badge achievements-page__next-badge landing-card"
          aria-label="Next badge"
        >
          <div className="achievements-page__next-badge-row">
            <span className="achievements-page__emoji" aria-hidden="true">
              {nextBadge.emoji}
            </span>
            <div className="achievements-page__next-badge-copy">
              <p className="achievements-page__next-badge-label">Next badge</p>
              <strong>{nextBadge.title}</strong>
              <span>{nextBadge.description}</span>
            </div>
            <button
              type="button"
              className="secondary-button achievements-page__next-badge-cta"
              onClick={() =>
                onPlayIntent({
                  playSection: nextBadge.hint.playSection,
                  h2hMode: nextBadge.hint.h2hMode,
                })
              }
            >
              {nextBadge.hint.ctaLabel}
            </button>
          </div>
        </section>
      ) : null}

      <section
        className={`franchise-home__daily landing-card${
          nextBadgeIsDaily ? " franchise-home__daily--with-badge" : ""
        }`}
        aria-label="Daily Draft progress"
      >
        <div className="franchise-home__daily-copy">
          <p className="franchise-home__eyebrow">Career Daily</p>
          <p className="franchise-home__daily-line">
            {dailyDraft.daysPlayed} day{dailyDraft.daysPlayed === 1 ? "" : "s"}{" "}
            · Basic {dailyDraft.basicStreakLabel} · Adv{" "}
            {dailyDraft.advancedStreakLabel}
          </p>
          <p className="franchise-home__daily-meta">
            Best {formatPercentile(dailyDraft.bestPercentile)} · Avg{" "}
            {formatPercentile(dailyDraft.averagePercentile)}
          </p>
          {nextBadgeIsDaily && nextBadge ? (
            <div className="franchise-home__daily-badge">
              <span className="franchise-home__daily-badge-emoji" aria-hidden="true">
                {nextBadge.emoji}
              </span>
              <div className="franchise-home__daily-badge-copy">
                <p className="franchise-home__daily-badge-label">Next badge</p>
                <strong>{nextBadge.title}</strong>
                <span>{nextBadge.description}</span>
              </div>
            </div>
          ) : nextDailyGoal ? (
            <p className="franchise-home__daily-next">
              Streak goal: {nextDailyGoal.title} (
              {Math.min(streakCounters.dailyStreak, nextDailyGoal.target)}/
              {nextDailyGoal.target})
            </p>
          ) : (
            <p className="franchise-home__daily-next">
              Daily streak badges complete.
            </p>
          )}
        </div>
        <button
          type="button"
          className="franchise-home__daily-cta secondary-button"
          onClick={
            nextBadgeIsDaily && nextBadge && onPlayIntent
              ? () =>
                  onPlayIntent({
                    playSection: nextBadge.hint.playSection,
                    h2hMode: nextBadge.hint.h2hMode,
                  })
              : onPlayDaily
          }
        >
          {nextBadgeIsDaily && nextBadge
            ? nextBadge.hint.ctaLabel
            : "Play Daily"}
        </button>
      </section>

      <div className="landing-profile-strip landing-card landing-card--profile">
        <div className="landing-profile-strip__header">
          <p className="landing-profile-strip__title">Collection</p>
          <p className="landing-profile-strip__hint">
            Tap a category to view unlocked players
          </p>
        </div>
        <div
          className="landing-profile-strip__stats"
          aria-label="Player collection by category"
        >
          <button
            type="button"
            className={`landing-profile-strip__stat landing-profile-strip__stat--btn${
              collectionTier === "all-star" ? " is-active" : ""
            }`}
            onClick={() => onSelectTier("all-star")}
            aria-pressed={collectionTier === "all-star"}
            aria-label={`View unlocked All-Stars, ${collectionProgress.unlocked} of ${collectionProgress.total}`}
          >
            <span className="landing-profile-strip__label">All-Stars</span>
            <strong>
              {collectionProgress.unlocked}/{collectionProgress.total}
            </strong>
          </button>
          <button
            type="button"
            className={`landing-profile-strip__stat landing-profile-strip__stat--btn${
              collectionTier === "superstar" ? " is-active" : ""
            }`}
            onClick={() => onSelectTier("superstar")}
            aria-pressed={collectionTier === "superstar"}
            aria-label={`View unlocked Superstars, ${collectionProgress.superstarUnlocked} of ${collectionProgress.superstarTotal}`}
          >
            <span className="landing-profile-strip__label">Superstars</span>
            <strong>
              {collectionProgress.superstarUnlocked}/
              {collectionProgress.superstarTotal}
            </strong>
          </button>
          <button
            type="button"
            className={`landing-profile-strip__stat landing-profile-strip__stat--btn${
              collectionTier === "scrub" ? " is-active" : ""
            }`}
            onClick={() => onSelectTier("scrub")}
            aria-pressed={collectionTier === "scrub"}
            aria-label={`View unlocked Scrubs, ${collectionProgress.unlockedScrubs} of ${collectionProgress.scrubPool}`}
          >
            <span className="landing-profile-strip__label">Scrubs</span>
            <strong>
              {collectionProgress.unlockedScrubs}/
              {collectionProgress.scrubPool}
            </strong>
          </button>
          <button
            type="button"
            className={`landing-profile-strip__stat landing-profile-strip__stat--btn${
              collectionTier === "super-scrub" ? " is-active" : ""
            }`}
            onClick={() => onSelectTier("super-scrub")}
            aria-pressed={collectionTier === "super-scrub"}
            aria-label={`View unlocked Super Scrubs, ${collectionProgress.unlockedSuperScrubs} of ${collectionProgress.superScrubPool}`}
          >
            <span className="landing-profile-strip__label">Super Scrubs</span>
            <strong>
              {collectionProgress.unlockedSuperScrubs}/
              {collectionProgress.superScrubPool}
            </strong>
          </button>
          <button
            type="button"
            className={`landing-profile-strip__stat landing-profile-strip__stat--btn${
              collectionTier === "recent-all-star" ? " is-active" : ""
            }`}
            onClick={() => onSelectTier("recent-all-star")}
            aria-pressed={collectionTier === "recent-all-star"}
            aria-label={`View unlocked Recent All-Stars, ${collectionProgress.recentUnlocked} of ${collectionProgress.recentTotal}`}
          >
            <span className="landing-profile-strip__label">
              Recent All-Stars
            </span>
            <strong>
              {collectionProgress.recentUnlocked}/
              {collectionProgress.recentTotal}
            </strong>
          </button>
        </div>
        <p className="landing-profile-strip__meta franchise-home__collection-meta">
          Win to unlock All-Stars, lose to unlock Scrubs.
        </p>
      </div>

      <nav className="franchise-home__links landing-card" aria-label="Franchise pages">
        <p className="franchise-home__links-label">Career pages</p>
        <div className="franchise-home__link-grid">
          <button
            type="button"
            className="franchise-home__link-btn hub-accent hub-accent--roster"
            onClick={onViewAchievements}
          >
            <span className="franchise-home__link-copy">
              <strong>Badges</strong>
              <span>Unlocks and career goals</span>
            </span>
            <span className="franchise-home__link-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button
            type="button"
            className="franchise-home__link-btn hub-accent hub-accent--roster"
            onClick={onViewStats}
          >
            <span className="franchise-home__link-copy">
              <strong>Player pool</strong>
              <span>NBA production this season</span>
            </span>
            <span className="franchise-home__link-chevron" aria-hidden="true">
              ›
            </span>
          </button>
          <button
            type="button"
            className="franchise-home__link-btn hub-accent hub-accent--roster"
            onClick={onViewGmStats}
          >
            <span className="franchise-home__link-copy">
              <strong>GM Stats</strong>
              <span>Your Front Office record</span>
            </span>
            <span className="franchise-home__link-chevron" aria-hidden="true">
              ›
            </span>
          </button>
        </div>
      </nav>

      <MostDraftedBoards />
    </div>
  );
}
