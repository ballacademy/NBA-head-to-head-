import { FRONT_OFFICE_BADGES } from "../lib/frontOfficeBadges";
import { formatRatingPoints, getTierForElo } from "../lib/rankedElo";

interface FrontOfficeBadgeGridProps {
  peakElo: number;
  compact?: boolean;
}

export function FrontOfficeBadgeGrid({
  peakElo,
  compact = false,
}: FrontOfficeBadgeGridProps) {
  return (
    <ul
      className={`front-office-badges${
        compact ? " front-office-badges--compact" : ""
      }`}
    >
      {FRONT_OFFICE_BADGES.map((badge) => {
        const unlocked = peakElo >= badge.minElo;
        const tier = getTierForElo(badge.minElo);

        return (
          <li
            key={badge.id}
            className={`front-office-badges__item ranked-tier-badge ranked-tier-badge--${tier.id}${
              unlocked ? " front-office-badges__item--unlocked" : ""
            }`}
          >
            <span className="front-office-badges__emoji" aria-hidden="true">
              {unlocked ? badge.emoji : "🔒"}
            </span>
            <div className="front-office-badges__copy">
              <strong>{badge.label}</strong>
              <span className="front-office-badges__meta">
                {formatRatingPoints(badge.minElo)}
                {unlocked ? " · Unlocked" : " · Locked"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
