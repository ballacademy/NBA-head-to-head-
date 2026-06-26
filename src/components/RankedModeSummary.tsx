import { useMemo } from "react";
import { getRankedProfileView } from "../lib/rankedProfile";
import { RankedTierBadge } from "./RankedTierBadge";
import { formatPlayerRecord, type PlayerRecord } from "../lib/playerRecord";
import { PLACEMENT_GAMES } from "../lib/rankedElo";
import { LossStreakBadge } from "./LossStreakBadge";
import { WinStreakBadge } from "./WinStreakBadge";
import { hasLossStreakBadge } from "../lib/lossStreak";
import { hasFireStreak } from "../lib/winStreak";

interface RankedModeSummaryProps {
  record: PlayerRecord;
}

export function RankedModeSummary({ record }: RankedModeSummaryProps) {
  const ranked = useMemo(() => getRankedProfileView(), [record.wins, record.losses]);
  const placementRemaining = Math.max(0, PLACEMENT_GAMES - ranked.rankedGamesPlayed);

  return (
    <div className="landing-mode-card__record-block ranked-mode-summary">
      <p className="landing-mode-card__record">
        <span className="landing-mode-card__record-label">Front Office</span>
        <span className="landing-mode-card__record-value ranked-mode-summary__tier">
          <RankedTierBadge tier={ranked.tier} elo={ranked.elo} compact />
        </span>
      </p>
      <p className="landing-mode-card__record">
        <span className="landing-mode-card__record-label">Record</span>
        <span className="landing-mode-card__record-value">
          {formatPlayerRecord(record)}
          {hasFireStreak(record.winStreak) ? (
            <WinStreakBadge winStreak={record.winStreak} />
          ) : null}
          {!hasFireStreak(record.winStreak) &&
          hasLossStreakBadge(record.lossStreak) ? (
            <LossStreakBadge lossStreak={record.lossStreak} />
          ) : null}
        </span>
      </p>
      <p className="landing-mode-card__record-meta">
        {placementRemaining > 0
          ? `Placement: ${placementRemaining} game${
              placementRemaining === 1 ? "" : "s"
            } left`
          : `${record.wins + record.losses} games played`}
      </p>
    </div>
  );
}
