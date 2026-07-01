import { useMemo } from "react";
import { getRankedProfileView } from "../lib/rankedProfile";
import { RankedTierBadge } from "./RankedTierBadge";
import type { PlayerRecord } from "../lib/playerRecord";
import { RecordWithStreak } from "./RecordWithStreak";

interface RankedModeSummaryProps {
  record: PlayerRecord;
}

export function RankedModeSummary({ record }: RankedModeSummaryProps) {
  const ranked = useMemo(() => getRankedProfileView(), [record.wins, record.losses]);

  return (
    <div className="landing-mode-card__record-block ranked-mode-summary">
      <p className="landing-mode-card__record ranked-mode-summary__front-office">
        <span className="landing-mode-card__record-label">Front Office</span>
        <span className="landing-mode-card__record-value ranked-mode-summary__tier">
          <RankedTierBadge tier={ranked.tier} elo={ranked.elo} compact />
        </span>
      </p>
      <RecordWithStreak
        record={record}
        align="right"
        className="ranked-mode-summary__record"
      />
    </div>
  );
}
