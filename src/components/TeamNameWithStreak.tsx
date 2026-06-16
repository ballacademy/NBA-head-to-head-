import { hasFireStreak } from "../lib/playerRecord";

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
  const showFire = hasFireStreak(winStreak);

  return (
    <span className={className}>
      {city ? `${city} ` : ""}
      {name}
      {showFire ? (
        <span
          className="win-streak-badge"
          aria-label={`${winStreak} game win streak`}
          title={`${winStreak} game win streak`}
        >
          {" "}
          🔥
        </span>
      ) : null}
    </span>
  );
}
