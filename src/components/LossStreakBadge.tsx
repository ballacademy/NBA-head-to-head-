import { getLossStreakTier } from "../lib/lossStreak";
import { LossStreakIcon } from "./StreakIcons";

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
      <LossStreakIcon tier={tier.id} className="loss-streak-badge__icon" />
      <span className="loss-streak-badge__count">{lossStreak}</span>
    </span>
  );
}
