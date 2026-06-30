import { getWinStreakTier } from "../lib/winStreak";
import { WinStreakIcon } from "./StreakIcons";

interface WinStreakBadgeProps {
  winStreak: number;
}

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
      <WinStreakIcon tier={tier.id} className="win-streak-badge__icon" />
      <span className="win-streak-badge__count">{winStreak}</span>
    </span>
  );
}
