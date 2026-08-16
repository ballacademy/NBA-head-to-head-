import { useMemo } from "react";
import { getRankedProfileView } from "../lib/rankedProfile";
import { RankedTierBadge } from "./RankedTierBadge";
import { loadSelfSeasonBoardRecord } from "../lib/seasonBoardRecord";
import type { PlayerRecord } from "../lib/playerRecord";
import { RecordWithStreak } from "./RecordWithStreak";

interface RankedModeSummaryProps {
  /** Career record — used as a refresh signal after matches. */
  record: PlayerRecord;
}

export function RankedModeSummary({ record }: RankedModeSummaryProps) {
  const ranked = useMemo(
    () => getRankedProfileView(),
    [record.wins, record.losses, record.winStreak, record.lossStreak],
  );
  const seasonRecord = useMemo(
    () => loadSelfSeasonBoardRecord("ranked"),
    [record.wins, record.losses, record.winStreak, record.lossStreak],
  );

  return (
    <div className="landing-mode-card__record-block ranked-mode-summary">
      <p className="landing-mode-card__record ranked-mode-summary__front-office">
        <span className="landing-mode-card__record-label">Front Office</span>
        <span className="landing-mode-card__record-value ranked-mode-summary__tier">
          <RankedTierBadge tier={ranked.tier} elo={ranked.elo} compact />
        </span>
      </p>
      <RecordWithStreak
        record={{ ...record, ...seasonRecord, playerId: record.playerId }}
        align="right"
        className="ranked-mode-summary__record"
      />
    </div>
  );
}
