import { useMemo, useState } from "react";
import {
  buildWeeklyGmRecap,
  hasSeenWeeklyRecap,
  markWeeklyRecapSeen,
} from "../lib/gmWeeklyRecap";

interface WeeklyGmRecapCardProps {
  onViewWeek?: () => void;
  className?: string;
  /** Compact one-line teaser (Franchise); full card is the recap page. */
  variant?: "full" | "compact";
  /** Keep stats visible after the Play chip is dismissed. */
  alwaysVisible?: boolean;
  hideDismiss?: boolean;
  hideHeading?: boolean;
}

export function WeeklyGmRecapCard({
  onViewWeek,
  className = "",
  variant = "full",
  alwaysVisible = false,
  hideDismiss = false,
  hideHeading = false,
}: WeeklyGmRecapCardProps) {
  const recap = useMemo(() => buildWeeklyGmRecap(), []);
  const [dismissed, setDismissed] = useState(() =>
    hasSeenWeeklyRecap(recap.weekKey),
  );

  if (dismissed && !alwaysVisible) {
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
          {onViewWeek ? (
            <button
              type="button"
              className="weekly-gm-recap__compact-link"
              onClick={onViewWeek}
            >
              View week
            </button>
          ) : null}
          {hideDismiss ? null : (
            <button
              type="button"
              className="weekly-gm-recap__dismiss"
              onClick={handleDismiss}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section
      className={`weekly-gm-recap${className ? ` ${className}` : ""}`}
      aria-labelledby={hideHeading ? undefined : "weekly-gm-recap-title"}
      aria-label={hideHeading ? "This week" : undefined}
    >
      {hideHeading && hideDismiss ? null : (
        <div className="weekly-gm-recap__header">
          {hideHeading ? null : (
            <div className="weekly-gm-recap__heading">
              <h2 className="weekly-gm-recap__title" id="weekly-gm-recap-title">
                This week
              </h2>
              <p className="weekly-gm-recap__lede">
                Daily Draft only · {recap.weekRangeLabel}
              </p>
            </div>
          )}
          {hideDismiss ? null : (
            <button
              type="button"
              className="weekly-gm-recap__dismiss"
              onClick={handleDismiss}
            >
              Dismiss
            </button>
          )}
        </div>
      )}

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
