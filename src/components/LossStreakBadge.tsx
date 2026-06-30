import { getLossStreakTier } from "../lib/lossStreak";

interface LossStreakBadgeProps {
  lossStreak: number;
}

export function LossStreakBadge({ lossStreak }: LossStreakBadgeProps) {
  const tier = getLossStreakTier(lossStreak);

  if (!tier) {
    return null;
  }

  return (
    <span
      className={`loss-streak-badge loss-streak-badge--${tier.id}`}
      aria-label={`${lossStreak} game ${tier.label.toLowerCase()}`}
      title={`${lossStreak} game ${tier.label.toLowerCase()}`}
    >
      <span className="loss-streak-badge__icon" aria-hidden="true">
        <span className="loss-streak-badge__fire">🔥</span>
        <span className="loss-streak-badge__can">🗑️</span>
      </span>
      <span className="loss-streak-badge__count">{lossStreak}</span>
    </span>
  );
}
