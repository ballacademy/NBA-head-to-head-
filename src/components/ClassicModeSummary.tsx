import { useMemo } from "react";
import { getClassicProfileView } from "../lib/classicProfile";
import type { PlayerRecord } from "../lib/playerRecord";
import { RankedTierBadge } from "./RankedTierBadge";
import { RecordWithStreak } from "./RecordWithStreak";

interface ClassicModeSummaryProps {
  record: PlayerRecord;
}

export function ClassicModeSummary({ record }: ClassicModeSummaryProps) {
  const classic = useMemo(
    () => getClassicProfileView(),
    [record.wins, record.losses],
  );

  return (
    <div className="landing-mode-card__record-block landing-mode-card__record-block--casual">
      <p className="landing-mode-card__record ranked-mode-summary__front-office">
        <span className="landing-mode-card__record-label">Front Office</span>
        <span className="landing-mode-card__record-value ranked-mode-summary__tier">
          <RankedTierBadge tier={classic.tier} elo={classic.elo} compact />
        </span>
      </p>
      <RecordWithStreak
        record={record}
        align="left"
        className="ranked-mode-summary__record ranked-mode-summary__record--left"
      />
    </div>
  );
}
