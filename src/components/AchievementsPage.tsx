import { useMemo } from "react";
import { getAchievementProgress } from "../lib/achievements";
import {
  loadAllEventProfiles,
  type EventProfile,
} from "../lib/eventProfile";
import {
  describeEventFromId,
  formatEventBadgeDescription,
  formatEventBadgeEmoji,
  formatEventBadgeLabel,
  getTopEventBadgeTier,
} from "../lib/weeklyEvents";
import { HubFeatureReturnButton } from "./HubFeatureReturnButton";

interface AchievementsPageProps {
  onBack: () => void;
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

export function AchievementsPage({ onBack }: AchievementsPageProps) {
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

  return (
    <div className="hub-feature achievements-page">
      <div className="landing-hub__top">
        <h1 className="landing-hub__title">Badges</h1>
        <p className="landing__lede landing-hub__lede">
          {progress.unlocked}/{progress.total} career
          {unlockedSpecial.length > 0
            ? ` · ${unlockedSpecial.length} special`
            : ""}
          {eventBadges.length > 0 ? ` · ${eventBadges.length} event` : ""}
          {" · Locked until earned"}
        </p>
      </div>

      <HubFeatureReturnButton onBack={onBack} visible={false} />

      <p className="account-required-note account-required-note--inline">
        Badges stay on this device. Signing in syncs collection and leaderboards,
        but not badge progress across browsers.
      </p>

      <section className="hub-feature__panel">
        <div className="achievements-page__section-heading">
          <p className="eyebrow">Career</p>
          <h2>Lineup badges</h2>
        </div>
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
                  <span className="achievements-page__status">
                    {achievement.isUnlocked ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <span className="achievements-page__description">
                  {achievement.description}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {unlockedSpecial.length > 0 ? (
        <section className="hub-feature__panel">
          <div className="achievements-page__section-heading">
            <p className="eyebrow">Special</p>
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
        </section>
      ) : null}

      <section className="hub-feature__panel achievements-page__event-panel">
        <div className="achievements-page__section-heading">
          <p className="eyebrow">Weekly Events</p>
          <h2>Event badges</h2>
          <p className="achievements-page__subtitle">
            Highest badge per event.
          </p>
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
          <p className="achievements-page__subtitle">
            Play Events to earn badges.
          </p>
        )}
      </section>
    </div>
  );
}
