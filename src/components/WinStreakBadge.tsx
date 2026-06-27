import type { WinStreakTierId } from "../lib/winStreak";
import { getWinStreakTier } from "../lib/winStreak";

interface WinStreakBadgeProps {
  winStreak: number;
}

const TIER_EMOJI: Record<WinStreakTierId, string> = {
  orange: "🔥",
  red: "🔥🔥",
  blue: "⚡",
  purple: "💜",
  black: "👑",
};

export function WinStreakBadge({ winStreak }: WinStreakBadgeProps) {
  const tier = getWinStreakTier(winStreak);

  if (!tier) {
    return null;
  }

  return (
    <span
      className={`win-streak-badge win-streak-badge--${tier.id}`}
      aria-label={`${winStreak} game ${tier.label.toLowerCase()}`}
      title={`${winStreak} game ${tier.label.toLowerCase()}`}
    >
      <span className="win-streak-badge__emoji" aria-hidden="true">
        {TIER_EMOJI[tier.id]}
      </span>
    </span>
  );
}
