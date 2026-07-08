import { getWinStreakTier } from "../lib/winStreak";
import { WinStreakIcon } from "./StreakIcons";

interface WinStreakBadgeProps {
  winStreak: number;
  showTypeLabel?: boolean;
  layout?: "default" | "inline";
}

export function WinStreakBadge({
  winStreak,
  showTypeLabel = true,
  layout = "default",
}: WinStreakBadgeProps) {
  const tier = getWinStreakTier(winStreak);

  if (!tier) {
    return null;
  }

  const description = `${winStreak}-game win streak`;

  const icon = (
    <WinStreakIcon tier={tier.id} className="streak-badge__icon win-streak-badge__icon" />
  );
  const metric = (
    <span className="streak-badge__metric">
      <span className="streak-badge__count">{winStreak}</span>
      {showTypeLabel ? (
        <span className="streak-badge__type" aria-hidden="true">
          W
        </span>
      ) : null}
    </span>
  );

  return (
    <span
      className={[
        "streak-badge",
        "win-streak-badge",
        `win-streak-badge--${tier.id}`,
        layout === "inline" ? "streak-badge--inline" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={description}
      title={description}
    >
      {layout === "inline" ? (
        <>
          {icon}
          {metric}
        </>
      ) : (
        <>
          {metric}
          {icon}
        </>
      )}
    </span>
  );
}
