import { useMemo } from "react";
import { getAchievementProgress } from "../lib/achievements";
import { DraftDayGmLogo } from "./DraftDayGmLogo";

export function AchievementsPage() {
  const progress = useMemo(() => getAchievementProgress(), []);

  return (
    <div className="hub-feature achievements-page">
      <div className="landing-hub__top">
        <div className="landing__brand landing__brand--compact">
          <DraftDayGmLogo className="landing__logo landing__logo--compact" />
        </div>
        <h1 className="landing-hub__title">Badges</h1>
        <p className="landing__lede landing-hub__lede">
          {progress.unlocked}/{progress.total} unlocked · Locked badges stay
          hidden until earned
        </p>
      </div>

      <section className="hub-feature__panel">
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
    </div>
  );
}
