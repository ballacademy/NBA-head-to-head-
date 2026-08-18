import { useMemo, useState } from "react";
import {
  buildWeeklyGmRecap,
  hasSeenWeeklyRecap,
  markWeeklyRecapSeen,
} from "../lib/gmWeeklyRecap";

interface WeeklyGmRecapCardProps {
  onViewGmStats?: () => void;
  className?: string;
  /** Compact one-line teaser (Franchise); full card stays on GM Stats. */
  variant?: "full" | "compact";
}

export function WeeklyGmRecapCard({
  onViewGmStats,
  className = "",
  variant = "full",
}: WeeklyGmRecapCardProps) {
  const recap = useMemo(() => buildWeeklyGmRecap(), []);
  const [dismissed, setDismissed] = useState(() =>
    hasSeenWeeklyRecap(recap.weekKey),
  );

  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    markWeeklyRecapSeen(recap.weekKey);
    setDismissed(true);
  };

  if (variant === "compact") {
    return (
      <div
        className={`weekly-gm-recap weekly-gm-recap--compact${
          className ? ` ${className}` : ""
        }`}
        role="status"
      >
        <p className="weekly-gm-recap__compact-copy">
          This week · {recap.dailyDaysSplitLabel}
        </p>
        <div className="weekly-gm-recap__compact-actions">
          {onViewGmStats ? (
            <button
              type="button"
              className="weekly-gm-recap__compact-link"
              onClick={onViewGmStats}
            >
              View week
            </button>
          ) : null}
          <button
            type="button"
            className="weekly-gm-recap__dismiss"
            onClick={handleDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      className={`weekly-gm-recap${className ? ` ${className}` : ""}`}
      aria-labelledby="weekly-gm-recap-title"
    >
      <div className="weekly-gm-recap__header">
        <div className="weekly-gm-recap__heading">
          <h2 className="weekly-gm-recap__title" id="weekly-gm-recap-title">
            This week
          </h2>
          <p className="weekly-gm-recap__lede">
            Daily Draft only · {recap.weekRangeLabel}
          </p>
        </div>
        <button
          type="button"
          className="weekly-gm-recap__dismiss"
          onClick={handleDismiss}
        >
          Dismiss
        </button>
      </div>

      <dl className="weekly-gm-recap__stats">
        <div className="weekly-gm-recap__stat">
          <dt>Days played</dt>
          <dd>{recap.dailyDaysThisWeek}</dd>
        </div>
        <div className="weekly-gm-recap__stat">
          <dt>Puzzles scored</dt>
          <dd>
            {recap.dailyPuzzlesThisWeek}
            <span className="weekly-gm-recap__stat-meta">
              {recap.dailyDaysSplitLabel}
            </span>
          </dd>
        </div>
        <div className="weekly-gm-recap__stat">
          <dt>Best finish</dt>
          <dd>{recap.bestDailyFinishLabel}</dd>
        </div>
      </dl>
    </section>
  );
}
