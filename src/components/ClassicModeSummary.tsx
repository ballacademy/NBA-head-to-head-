import { useMemo } from "react";
import { getClassicProfileView } from "../lib/classicProfile";
import { loadSelfSeasonBoardRecord } from "../lib/seasonBoardRecord";
import type { PlayerRecord } from "../lib/playerRecord";
import { RankedTierBadge } from "./RankedTierBadge";
import { RecordWithStreak } from "./RecordWithStreak";

interface ClassicModeSummaryProps {
  /** Career record — used as a refresh signal after matches. */
  record: PlayerRecord;
}

export function ClassicModeSummary({ record }: ClassicModeSummaryProps) {
  const classic = useMemo(
    () => getClassicProfileView(),
    [record.wins, record.losses, record.winStreak, record.lossStreak],
  );
  const seasonRecord = useMemo(
    () => loadSelfSeasonBoardRecord("classic"),
    [record.wins, record.losses, record.winStreak, record.lossStreak],
  );

  return (
    <div className="landing-mode-card__record-block ranked-mode-summary">
      <p className="landing-mode-card__record ranked-mode-summary__front-office">
        <span className="landing-mode-card__record-label">Front Office</span>
        <span className="landing-mode-card__record-value ranked-mode-summary__tier">
          <RankedTierBadge tier={classic.tier} elo={classic.elo} compact />
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
