import { LossStreakBadge } from "./LossStreakBadge";
import { WinStreakBadge } from "./WinStreakBadge";
import { hasFireStreak } from "../lib/winStreak";
import { hasLossStreakBadge } from "../lib/lossStreak";

interface TeamNameWithStreakProps {
  city?: string;
  name: string;
  winStreak?: number;
  lossStreak?: number;
  className?: string;
}

export function TeamNameWithStreak({
  city,
  name,
  winStreak = 0,
  lossStreak = 0,
  className,
}: TeamNameWithStreakProps) {
  return (
    <span className={className}>
      {city ? `${city} ` : ""}
      {name}
      {hasFireStreak(winStreak) ? (
        <WinStreakBadge winStreak={winStreak} />
      ) : null}
      {!hasFireStreak(winStreak) && hasLossStreakBadge(lossStreak) ? (
        <LossStreakBadge lossStreak={lossStreak} />
      ) : null}
    </span>
  );
}
