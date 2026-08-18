import { useState } from "react";
import {
  buildWeeklyGmRecap,
  hasSeenWeeklyRecap,
  markWeeklyRecapSeen,
} from "../lib/gmWeeklyRecap";

interface WeeklyGmRecapCardProps {
  onViewWeek?: () => void;
  className?: string;
  /** Compact teaser (Franchise); full card is the recap page. */
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
  const recap = buildWeeklyGmRecap();
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
      <section
        className={`franchise-home__card landing-card${
          className ? ` ${className}` : ""
        }`}
        aria-label="Weekly recap"
      >
        <div className="franchise-home__card-head">
          <p className="franchise-home__eyebrow">Weekly recap</p>
          <p className="franchise-home__lede">
            {recap.periodLabel} · {recap.weekRangeLabel}
          </p>
        </div>
        <p className="franchise-home__summary">{recap.dailyDaysSplitLabel}</p>
        <p className="franchise-home__meta">
          Best finish {recap.bestDailyFinishLabel}
        </p>
        <div className="franchise-home__card-actions">
          {onViewWeek ? (
            <button
              type="button"
              className="franchise-home__text-link"
              onClick={onViewWeek}
            >
              View recap
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
      </section>
    );
  }

  return (
    <section
      className={`weekly-gm-recap${className ? ` ${className}` : ""}`}
      aria-labelledby={hideHeading ? undefined : "weekly-gm-recap-title"}
      aria-label={hideHeading ? "Weekly recap" : undefined}
    >
      {hideHeading && hideDismiss ? null : (
        <div className="weekly-gm-recap__header">
          {hideHeading ? null : (
            <div className="weekly-gm-recap__heading">
              <h2 className="weekly-gm-recap__title" id="weekly-gm-recap-title">
                Weekly recap
              </h2>
              <p className="weekly-gm-recap__lede">
                {recap.periodLabel} · Daily Draft · {recap.weekRangeLabel}
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
          <dd>{recap.dailyDays}</dd>
        </div>
        <div className="weekly-gm-recap__stat">
          <dt>Puzzles scored</dt>
          <dd>
            {recap.dailyPuzzles}
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
      {onViewWeek ? (
        <button
          type="button"
          className="franchise-home__text-link"
          onClick={onViewWeek}
        >
          View recap
        </button>
      ) : null}
    </section>
  );
}
