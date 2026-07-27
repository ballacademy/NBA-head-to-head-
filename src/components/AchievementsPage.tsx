import { useMemo } from "react";
import { getAchievementProgress } from "../lib/achievements";
import {
  loadAllEventProfiles,
  loadEventProfile,
  type EventProfile,
} from "../lib/eventProfile";
import {
  describeEventFromId,
  EVENT_BADGE_THRESHOLDS,
  formatEventBadgeDescription,
  formatEventBadgeEmoji,
  formatEventBadgeLabel,
  getCurrentEventMeta,
  type EventBadgeTier,
} from "../lib/weeklyEvents";

const EVENT_BADGE_TIERS: EventBadgeTier[] = [
  "participation",
  "bronze",
  "silver",
  "gold",
];

const buildEventBadgeRows = (profile: EventProfile) => {
  const meta = describeEventFromId(profile.eventId);

  return EVENT_BADGE_TIERS.map((tier) => ({
    id: `${profile.eventId}:${tier}`,
    tier,
    emoji: formatEventBadgeEmoji(tier),
    title: `${formatEventBadgeLabel(tier)} · ${meta.title}`,
    description: `${formatEventBadgeDescription(tier, meta.title)} (${meta.weekLabel})`,
    isUnlocked: profile.badges.includes(tier),
  }));
};

export function AchievementsPage() {
  const progress = useMemo(() => getAchievementProgress(), []);
  const eventBadgeSections = useMemo(() => {
    const current = getCurrentEventMeta();
    const currentProfile = loadEventProfile(current.id);
    const pastProfiles = loadAllEventProfiles().filter(
      (profile) =>
        profile.eventId !== current.id && profile.badges.length > 0,
    );

    return {
      current: {
        meta: current,
        profile: currentProfile,
        badges: buildEventBadgeRows(currentProfile),
      },
      past: pastProfiles.map((profile) => ({
        meta: describeEventFromId(profile.eventId),
        profile,
        badges: buildEventBadgeRows(profile).filter((badge) => badge.isUnlocked),
      })),
    };
  }, []);

  const unlockedEventBadges =
    eventBadgeSections.current.badges.filter((badge) => badge.isUnlocked)
      .length +
    eventBadgeSections.past.reduce(
      (sum, section) => sum + section.badges.length,
      0,
    );

  return (
    <div className="hub-feature achievements-page">
      <div className="landing-hub__top">
        <h1 className="landing-hub__title">Badges</h1>
        <p className="landing__lede landing-hub__lede">
          {progress.unlocked}/{progress.total} career · {unlockedEventBadges}{" "}
          event · Locked badges stay hidden until earned
        </p>
      </div>

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

      <section className="hub-feature__panel achievements-page__event-panel">
        <div className="achievements-page__section-heading">
          <p className="eyebrow">Weekly Events</p>
          <h2>{eventBadgeSections.current.meta.title}</h2>
          <p className="achievements-page__subtitle">
            {eventBadgeSections.current.meta.weekLabel} ·{" "}
            {eventBadgeSections.current.meta.restrictionLabel} ·{" "}
            {eventBadgeSections.current.profile.wins}-
            {eventBadgeSections.current.profile.losses} (
            {eventBadgeSections.current.profile.matchesPlayed} played) ·
            Competitor {EVENT_BADGE_THRESHOLDS.participation}+ matches · Bronze{" "}
            {EVENT_BADGE_THRESHOLDS.bronze}+ / Silver{" "}
            {EVENT_BADGE_THRESHOLDS.silver}+ / Gold{" "}
            {EVENT_BADGE_THRESHOLDS.gold}+ wins
          </p>
        </div>
        <ul className="achievements-page__list">
          {eventBadgeSections.current.badges.map((badge) => (
            <li
              key={badge.id}
              className={`achievements-page__item${
                badge.isUnlocked ? " achievements-page__item--unlocked" : ""
              }${badge.isUnlocked ? "" : " achievements-page__item--masked"}`}
            >
              <span className="achievements-page__emoji" aria-hidden="true">
                {badge.emoji}
              </span>
              <div className="achievements-page__copy">
                <div className="achievements-page__title-row">
                  <strong>{badge.title}</strong>
                  <span className="achievements-page__status">
                    {badge.isUnlocked ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <span className="achievements-page__description">
                  {badge.description}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {eventBadgeSections.past.length > 0 ? (
          <>
            <div className="achievements-page__section-heading achievements-page__section-heading--spaced">
              <p className="eyebrow">Past events</p>
              <h2>Earned event badges</h2>
            </div>
            <ul className="achievements-page__list">
              {eventBadgeSections.past.flatMap((section) =>
                section.badges.map((badge) => (
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
                )),
              )}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  );
}
