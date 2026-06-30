import { formatPlayerRecord, type PlayerRecord } from "../lib/playerRecord";
import { LossStreakBadge } from "./LossStreakBadge";
import { WinStreakBadge } from "./WinStreakBadge";
import { hasLossStreakBadge } from "../lib/lossStreak";
import { hasFireStreak } from "../lib/winStreak";

interface ClassicModeSummaryProps {
  record: PlayerRecord;
}

export function ClassicModeSummary({ record }: ClassicModeSummaryProps) {
  return (
    <div className="landing-mode-card__record-block landing-mode-card__record-block--casual">
      <p className="landing-mode-card__record ranked-mode-summary__record ranked-mode-summary__record--left">
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
