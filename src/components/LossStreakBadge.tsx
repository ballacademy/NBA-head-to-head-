import type { LossStreakTierId } from "../lib/lossStreak";
import { getLossStreakTier } from "../lib/lossStreak";

interface LossStreakBadgeProps {
  lossStreak: number;
}

const TIER_EMOJI: Record<LossStreakTierId, string> = {
  orange: "🗑️",
  red: "🔥🗑️",
  blue: "🔥🔥🗑️",
  purple: "💀🗑️",
  black: "🧨🗑️",
};

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
      <span className="loss-streak-badge__emoji" aria-hidden="true">
        {TIER_EMOJI[tier.id]}
      </span>
    </span>
  );
}
