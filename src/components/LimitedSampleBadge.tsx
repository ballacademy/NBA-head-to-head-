import { hasLimitedSampleSize } from "../lib/sampleSize";
import type { Player } from "../lib/types";

interface LimitedSampleBadgeProps {
  player: Pick<Player, "gamesPlayed">;
}

export function LimitedSampleBadge({ player }: LimitedSampleBadgeProps) {
  if (!hasLimitedSampleSize(player)) {
    return null;
  }

  return (
    <span className="player-caveat-badge player-caveat-badge--limited-sample">
      Limited sample size
    </span>
  );
}
