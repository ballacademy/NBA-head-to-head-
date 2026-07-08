import { LossStreakBadge } from "./LossStreakBadge";
import { WinStreakBadge } from "./WinStreakBadge";
import { hasFireStreak } from "../lib/winStreak";
import { hasLossStreakBadge } from "../lib/lossStreak";

interface TeamNameWithStreakProps {
  name: string;
  winStreak?: number;
  lossStreak?: number;
  className?: string;
  compact?: boolean;
}

export function TeamNameWithStreak({
  name,
  winStreak = 0,
  lossStreak = 0,
  className,
  compact = false,
}: TeamNameWithStreakProps) {
  const streakLayout = compact ? "inline" : "default";

  return (
    <span
      className={[
        "team-name-with-streak",
        compact ? "team-name-with-streak--compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="team-name-with-streak__name">{name}</span>
      {hasFireStreak(winStreak) ? (
        <WinStreakBadge winStreak={winStreak} layout={streakLayout} />
      ) : null}
      {!hasFireStreak(winStreak) && hasLossStreakBadge(lossStreak) ? (
        <LossStreakBadge lossStreak={lossStreak} layout={streakLayout} />
      ) : null}
    </span>
  );
}
