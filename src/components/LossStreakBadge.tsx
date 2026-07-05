import { getLossStreakTier } from "../lib/lossStreak";
import { LossStreakIcon } from "./StreakIcons";

interface LossStreakBadgeProps {
  lossStreak: number;
  showTypeLabel?: boolean;
}

export function LossStreakBadge({
  lossStreak,
  showTypeLabel = true,
}: LossStreakBadgeProps) {
  const tier = getLossStreakTier(lossStreak);

  if (!tier) {
    return null;
  }

  const description = `${lossStreak}-game loss streak`;

  return (
    <span
      className={`streak-badge loss-streak-badge loss-streak-badge--${tier.id}`}
      aria-label={description}
      title={description}
    >
      <span className="streak-badge__metric">
        <span className="streak-badge__count">{lossStreak}</span>
        {showTypeLabel ? (
          <span className="streak-badge__type" aria-hidden="true">
            L
          </span>
        ) : null}
      </span>
      <LossStreakIcon
        tier={tier.id}
        className="streak-badge__icon loss-streak-badge__icon"
      />
    </span>
  );
}
