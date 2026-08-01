import { hasLimitedSampleSize } from "../lib/sampleSize";
import type { Player } from "../lib/types";

interface LimitedSampleBadgeProps {
  player: Pick<Player, "bbrPlayerId" | "gamesPlayed" | "points">;
  compact?: boolean;
}

export function LimitedSampleBadge({
  player,
  compact = false,
}: LimitedSampleBadgeProps) {
  if (!hasLimitedSampleSize(player)) {
    return null;
  }

  return (
    <span className="player-caveat-badge player-caveat-badge--limited-sample">
      {compact ? "Limited sample" : "Limited sample size"}
    </span>
  );
}
