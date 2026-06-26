import { getAchievementById } from "../lib/achievements";

interface AchievementToastProps {
  achievementIds: string[];
}

export function AchievementToast({ achievementIds }: AchievementToastProps) {
  if (achievementIds.length === 0) {
    return null;
  }

  return (
    <section className="achievement-toast panel" aria-label="New achievements unlocked">
      <p className="eyebrow">
        {achievementIds.length === 1
          ? "Achievement unlocked"
          : "Achievements unlocked"}
      </p>
      <ul className="achievement-toast__list">
        {achievementIds.map((id) => {
          const achievement = getAchievementById(id);

          if (!achievement) {
            return null;
          }

          return (
            <li key={id} className="achievement-toast__item">
              <span className="achievement-toast__emoji" aria-hidden="true">
                {achievement.emoji}
              </span>
              <div>
                <strong>{achievement.title}</strong>
                <span>{achievement.description}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
