import { formatPlayerRecord, type PlayerRecord } from "../lib/playerRecord";
import { hasLossStreakBadge } from "../lib/lossStreak";
import { hasFireStreak } from "../lib/winStreak";
import { LossStreakBadge } from "./LossStreakBadge";
import { WinStreakBadge } from "./WinStreakBadge";

interface RecordWithStreakProps {
  record: PlayerRecord;
  align?: "left" | "right";
  className?: string;
}

export function RecordWithStreak({
  record,
  align = "left",
  className,
}: RecordWithStreakProps) {
  const showWinStreak = hasFireStreak(record.winStreak);
  const showLossStreak =
    !showWinStreak && hasLossStreakBadge(record.lossStreak);
  const showStreak = showWinStreak || showLossStreak;

  return (
    <div
      className={[
        "landing-mode-card__record-stats",
        align === "right" ? "landing-mode-card__record-stats--right" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="landing-mode-card__record-stat">
        <span className="landing-mode-card__record-label">Record</span>
        <span className="landing-mode-card__record-value">
          {formatPlayerRecord(record)}
        </span>
      </div>
      {showStreak ? (
        <div className="landing-mode-card__record-stat landing-mode-card__record-stat--streak">
          <span className="landing-mode-card__record-label">
            {showWinStreak ? "Win streak" : "Loss streak"}
          </span>
          <span className="landing-mode-card__record-value landing-mode-card__record-value--streak">
            {showWinStreak ? (
              <WinStreakBadge winStreak={record.winStreak} showTypeLabel={false} />
            ) : (
              <LossStreakBadge lossStreak={record.lossStreak} showTypeLabel={false} />
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
}
