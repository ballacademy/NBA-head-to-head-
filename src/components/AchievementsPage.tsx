import { useMemo } from "react";
import { getAchievementProgress } from "../lib/achievements";

interface AchievementsPageProps {
  onBack: () => void;
}

export function AchievementsPage({ onBack }: AchievementsPageProps) {
  const progress = useMemo(() => getAchievementProgress(), []);

  return (
    <section className="achievements-page panel panel--compact feature-page feature-page--badges">
      <div className="achievements-page__header">
        <div>
          <p className="eyebrow">Draft Day GM</p>
          <h1>Badges</h1>
          <p className="achievements-page__subtitle">
            {progress.unlocked}/{progress.total} unlocked · Locked badges stay
            hidden until earned
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={onBack}>
          Back to home
        </button>
      </div>

      <ul className="achievements-page__list">
        {progress.achievements.map((achievement) => (
          <li
            key={achievement.id}
            className={`achievements-page__item${
              achievement.isUnlocked ? " achievements-page__item--unlocked" : ""
            }${achievement.isUnlocked ? "" : " achievements-page__item--masked"}`}
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
  );
}
