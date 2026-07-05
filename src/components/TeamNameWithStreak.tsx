import { LossStreakBadge } from "./LossStreakBadge";
import { WinStreakBadge } from "./WinStreakBadge";
import { hasFireStreak } from "../lib/winStreak";
import { hasLossStreakBadge } from "../lib/lossStreak";

interface TeamNameWithStreakProps {
  name: string;
  winStreak?: number;
  lossStreak?: number;
  className?: string;
}

export function TeamNameWithStreak({
  name,
  winStreak = 0,
  lossStreak = 0,
  className,
}: TeamNameWithStreakProps) {
  return (
    <span className={["team-name-with-streak", className].filter(Boolean).join(" ")}>
      <span className="team-name-with-streak__name">{name}</span>
      {hasFireStreak(winStreak) ? (
        <WinStreakBadge winStreak={winStreak} />
      ) : null}
      {!hasFireStreak(winStreak) && hasLossStreakBadge(lossStreak) ? (
        <LossStreakBadge lossStreak={lossStreak} />
      ) : null}
    </span>
  );
}
