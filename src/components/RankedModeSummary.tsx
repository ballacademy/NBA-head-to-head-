import { useMemo } from "react";
import { getRankedProfileView } from "../lib/rankedProfile";
import { RankedTierBadge } from "./RankedTierBadge";
import { formatPlayerRecord, type PlayerRecord } from "../lib/playerRecord";
import { PLACEMENT_GAMES } from "../lib/rankedElo";

interface RankedModeSummaryProps {
  record: PlayerRecord;
}

export function RankedModeSummary({ record }: RankedModeSummaryProps) {
  const ranked = useMemo(() => getRankedProfileView(), [record.wins, record.losses]);
  const placementRemaining = Math.max(0, PLACEMENT_GAMES - ranked.rankedGamesPlayed);

  return (
    <div className="landing-mode-card__record-block ranked-mode-summary">
      <p className="landing-mode-card__record">
        <span className="landing-mode-card__record-label">Front office</span>
        <span className="landing-mode-card__record-value ranked-mode-summary__tier">
          <RankedTierBadge tier={ranked.tier} elo={ranked.elo} compact />
        </span>
      </p>
      <p className="landing-mode-card__record-meta">
        Record {formatPlayerRecord(record)}
        {placementRemaining > 0
          ? ` • Placement: ${placementRemaining} high-value game${
              placementRemaining === 1 ? "" : "s"
            } left`
          : ""}
      </p>
    </div>
  );
}
