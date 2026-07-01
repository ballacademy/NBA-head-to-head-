import type { PlayerRecord } from "../lib/playerRecord";
import { RecordWithStreak } from "./RecordWithStreak";

interface ClassicModeSummaryProps {
  record: PlayerRecord;
}

export function ClassicModeSummary({ record }: ClassicModeSummaryProps) {
  return (
    <div className="landing-mode-card__record-block landing-mode-card__record-block--casual">
      <RecordWithStreak
        record={record}
        align="left"
        className="ranked-mode-summary__record ranked-mode-summary__record--left"
      />
    </div>
  );
}
