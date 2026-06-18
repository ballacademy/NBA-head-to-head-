import { useMemo } from "react";
import { getAchievementProgress } from "../lib/achievements";

interface AchievementsPageProps {
  onBack: () => void;
}

export function AchievementsPage({ onBack }: AchievementsPageProps) {
  const progress = useMemo(() => getAchievementProgress(), []);

  return (
    <section className="achievements-page panel">
      <div className="achievements-page__header">
        <div>
          <p className="eyebrow">NBA Head-to-Head</p>
          <h1>Badges</h1>
          <p>
            Funny and difficult drafting milestones unlocked from head-to-head and
            daily draft lineups.
          </p>
          <p className="achievements-page__progress">
            {progress.unlocked}/{progress.total} unlocked • Locked badges show as ????
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
            <div>
              <strong>{achievement.title}</strong>
              <span>{achievement.description}</span>
            </div>
            <span className="achievements-page__status">
              {achievement.isUnlocked ? "Unlocked" : "Locked"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
