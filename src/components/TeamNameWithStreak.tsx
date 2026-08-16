import { LossStreakBadge } from "./LossStreakBadge";
import { WinStreakBadge } from "./WinStreakBadge";
import { hasFireStreak } from "../lib/winStreak";
import { hasLossStreakBadge } from "../lib/lossStreak";

interface TeamStreakBadgeProps {
  winStreak?: number;
  lossStreak?: number;
  compact?: boolean;
}

/** Win/loss streak badge without the team name (e.g. under OVR). */
export function TeamStreakBadge({
  winStreak = 0,
  lossStreak = 0,
  compact = false,
}: TeamStreakBadgeProps) {
  const streakLayout = compact ? "inline" : "default";

  if (hasFireStreak(winStreak)) {
    return <WinStreakBadge winStreak={winStreak} layout={streakLayout} />;
  }

  if (hasLossStreakBadge(lossStreak)) {
    return <LossStreakBadge lossStreak={lossStreak} layout={streakLayout} />;
  }

  return null;
}

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
      <TeamStreakBadge
        winStreak={winStreak}
        lossStreak={lossStreak}
        compact={compact}
      />
    </span>
  );
}
