import { useMemo } from "react";
import { getAchievementProgress } from "../lib/achievements";
import {
  getAchievementPlayHint,
  getNearestLockedAchievement,
} from "../lib/achievementPlayHints";
import {
  loadAllEventProfiles,
  type EventProfile,
} from "../lib/eventProfile";
import type { LandingPlaySection } from "../lib/landingHub";
import {
  describeEventFromId,
  formatEventBadgeDescription,
  formatEventBadgeEmoji,
  formatEventBadgeLabel,
  getTopEventBadgeTier,
} from "../lib/weeklyEvents";
import { AccountRequiredNote } from "./AccountRequiredNote";
import { HubPageChrome } from "./HubPageChrome";

interface AchievementsPageProps {
  onBack: () => void;
  onPlayIntent?: (intent: {
    playSection: LandingPlaySection;
    h2hMode?: "classic" | "ranked";
  }) => void;
}

const buildTopEventBadge = (profile: EventProfile) => {
  const topTier = getTopEventBadgeTier(profile.badges);
  if (!topTier) {
    return null;
  }

  const meta = describeEventFromId(profile.eventId);

  return {
    id: `${profile.eventId}:${topTier}`,
    tier: topTier,
    emoji: formatEventBadgeEmoji(topTier),
    title: `${formatEventBadgeLabel(topTier)} · ${meta.title}`,
    description: `${formatEventBadgeDescription(topTier, meta.title)} (${meta.weekLabel})`,
  };
};

export function AchievementsPage({ onBack, onPlayIntent }: AchievementsPageProps) {
  const progress = useMemo(() => getAchievementProgress(), []);
  const eventBadges = useMemo(() => {
    return loadAllEventProfiles()
      .map((profile) => buildTopEventBadge(profile))
      .filter((badge): badge is NonNullable<typeof badge> => badge != null)
      .sort((left, right) => right.id.localeCompare(left.id));
  }, []);

  const unlockedSpecial = progress.special.achievements.filter(
    (achievement) => achievement.isUnlocked,
  );

  const nextBadge = getNearestLockedAchievement(progress.achievements);
  const nextBadgeHint = nextBadge
    ? getAchievementPlayHint(nextBadge.id)
    : null;

  return (
    <HubPageChrome
      className="achievements-page"
      title="Badges"
      lede={`${progress.unlocked}/${progress.total} unlocked${
        unlockedSpecial.length > 0
          ? ` · ${unlockedSpecial.length} special`
          : ""
      }${eventBadges.length > 0 ? ` · ${eventBadges.length} event` : ""}`}
      onBack={onBack}
      backLabel="Franchise"
    >
      <section className="hub-feature__panel achievements-page__panel">
        <AccountRequiredNote className="account-required-note--inline">
          Sign in to sync badge progress across browsers. Guests keep badges on
          this device only.
        </AccountRequiredNote>

        <div className="achievements-page__section-heading">
          <h2>Lineup badges</h2>
        </div>

        {nextBadge && nextBadgeHint && onPlayIntent ? (
          <div className="achievements-page__next-badge">
            <div className="achievements-page__next-badge-row">
              <span className="achievements-page__emoji" aria-hidden="true">
                {nextBadge.emoji}
              </span>
              <div className="achievements-page__next-badge-copy">
                <p className="achievements-page__next-badge-label">Next</p>
                <strong>{nextBadge.title}</strong>
                <span>{nextBadge.description}</span>
              </div>
              <button
                type="button"
                className="secondary-button achievements-page__next-badge-cta"
                onClick={() =>
                  onPlayIntent({
                    playSection: nextBadgeHint.playSection,
                    h2hMode: nextBadgeHint.h2hMode,
                  })
                }
              >
                {nextBadgeHint.ctaLabel}
              </button>
            </div>
          </div>
        ) : null}

        <ul className="achievements-page__list">
          {progress.achievements.map((achievement) => (
            <li
              key={achievement.id}
              className={`achievements-page__item${
                achievement.isUnlocked ? " achievements-page__item--unlocked" : ""
              }${
                achievement.isUnlocked ? "" : " achievements-page__item--masked"
              }`}
            >
              <span className="achievements-page__emoji" aria-hidden="true">
                {achievement.emoji}
              </span>
              <div className="achievements-page__copy">
                <div className="achievements-page__title-row">
                  <strong>{achievement.title}</strong>
                  {achievement.isUnlocked ? (
                    <span className="achievements-page__status">Unlocked</span>
                  ) : null}
                </div>
                <span className="achievements-page__description">
                  {achievement.description}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {unlockedSpecial.length > 0 ? (
          <>
            <div className="achievements-page__section-heading achievements-page__section-heading--spaced">
              <h2>Account badges</h2>
            </div>
            <ul className="achievements-page__list">
              {unlockedSpecial.map((achievement) => (
                <li
                  key={achievement.id}
                  className="achievements-page__item achievements-page__item--unlocked"
                >
                  <span className="achievements-page__emoji" aria-hidden="true">
                    {achievement.emoji}
                  </span>
                  <div className="achievements-page__copy">
                    <div className="achievements-page__title-row">
                      <strong>{achievement.title}</strong>
                      <span className="achievements-page__status">Unlocked</span>
                    </div>
                    <span className="achievements-page__description">
                      {achievement.description}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <div className="achievements-page__section-heading achievements-page__section-heading--spaced">
          <h2>Event badges</h2>
          <p className="achievements-page__subtitle">Highest badge per event.</p>
        </div>
        {eventBadges.length > 0 ? (
          <ul className="achievements-page__list">
            {eventBadges.map((badge) => (
              <li
                key={badge.id}
                className="achievements-page__item achievements-page__item--unlocked"
              >
                <span className="achievements-page__emoji" aria-hidden="true">
                  {badge.emoji}
                </span>
                <div className="achievements-page__copy">
                  <div className="achievements-page__title-row">
                    <strong>{badge.title}</strong>
                    <span className="achievements-page__status">Unlocked</span>
                  </div>
                  <span className="achievements-page__description">
                    {badge.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="achievements-page__event-empty">
            <p className="achievements-page__subtitle">
              Play Events to earn badges.
            </p>
            {onPlayIntent ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onPlayIntent({ playSection: "events" })}
              >
                Play Events
              </button>
            ) : null}
          </div>
        )}
      </section>
    </HubPageChrome>
  );
}
