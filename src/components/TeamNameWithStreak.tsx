import { WinStreakBadge } from "./WinStreakBadge";

interface TeamNameWithStreakProps {
  city?: string;
  name: string;
  winStreak?: number;
  className?: string;
}

export function TeamNameWithStreak({
  city,
  name,
  winStreak = 0,
  className,
}: TeamNameWithStreakProps) {
  return (
    <span className={className}>
      {city ? `${city} ` : ""}
      {name}
      <WinStreakBadge winStreak={winStreak} />
    </span>
  );
}
