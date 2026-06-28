import { useMemo } from "react";
import { getClassicProfileView } from "../lib/classicProfile";
import { RankedTierBadge } from "./RankedTierBadge";
import { LossStreakBadge } from "./LossStreakBadge";
import { WinStreakBadge } from "./WinStreakBadge";
import { formatPlayerRecord, type PlayerRecord } from "../lib/playerRecord";
import { hasLossStreakBadge } from "../lib/lossStreak";
import { hasFireStreak } from "../lib/winStreak";

interface ClassicModeSummaryProps {
  record: PlayerRecord;
}

export function ClassicModeSummary({ record }: ClassicModeSummaryProps) {
  const classic = useMemo(
    () => getClassicProfileView(),
    [record.wins, record.losses],
  );

  return (
    <div className="landing-mode-card__record-block ranked-mode-summary">
      <p className="landing-mode-card__record ranked-mode-summary__front-office">
        <span className="landing-mode-card__record-label">Front Office</span>
        <span className="landing-mode-card__record-value ranked-mode-summary__tier">
          <RankedTierBadge tier={classic.tier} elo={classic.elo} compact />
        </span>
      </p>
      <p className="landing-mode-card__record ranked-mode-summary__record">
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
    </div>
  );
}
