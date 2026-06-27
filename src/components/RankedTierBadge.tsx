import { formatRatingPoints, getTierForElo, type RankedTier } from "../lib/rankedElo";

interface RankedTierBadgeProps {
  tier?: RankedTier;
  tierLabel?: string;
  elo?: number;
  compact?: boolean;
}

export function RankedTierBadge({
  tier,
  tierLabel,
  elo,
  compact = false,
}: RankedTierBadgeProps) {
  const tierMeta =
    tier ??
    (typeof elo === "number"
      ? getTierForElo(elo)
      : {
          id: "custom",
          label: tierLabel ?? "Unranked",
          minElo: 0,
          maxElo: null,
        });

  return (
    <span
      className={`ranked-tier-badge ranked-tier-badge--${tierMeta.id}${
        compact ? " ranked-tier-badge--compact" : ""
      }`}
    >
      {tierLabel ?? tierMeta.label}
      {typeof elo === "number" ? (
        <span className="ranked-tier-badge__rating">{formatRatingPoints(elo)}</span>
      ) : null}
    </span>
  );
}
