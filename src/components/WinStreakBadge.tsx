import { getWinStreakTier } from "../lib/winStreak";
import { WinStreakIcon } from "./StreakIcons";

interface WinStreakBadgeProps {
  winStreak: number;
  showTypeLabel?: boolean;
}

export function WinStreakBadge({
  winStreak,
  showTypeLabel = true,
}: WinStreakBadgeProps) {
  const tier = getWinStreakTier(winStreak);

  if (!tier) {
    return null;
  }

  const description = `${winStreak}-game win streak`;

  return (
    <span
      className={`streak-badge win-streak-badge win-streak-badge--${tier.id}`}
      aria-label={description}
      title={description}
    >
      <span className="streak-badge__metric">
        <span className="streak-badge__count">{winStreak}</span>
        {showTypeLabel ? (
          <span className="streak-badge__type" aria-hidden="true">
            W
          </span>
        ) : null}
      </span>
      <WinStreakIcon tier={tier.id} className="streak-badge__icon win-streak-badge__icon" />
    </span>
  );
}
