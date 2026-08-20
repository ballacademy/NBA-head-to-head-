import { useState } from "react";
import {
  buildWeeklyGmRecap,
  formatWeeklyRecapLede,
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

const formatWeeklyH2hSummary = (
  matches: number,
  recordLabel: string,
  winPctLabel: string,
) => {
  if (matches <= 0) {
    return "H2H · No matches";
  }

  return `H2H ${recordLabel} · ${winPctLabel} · ${matches} match${matches === 1 ? "" : "es"}`;
};

export function WeeklyGmRecapCard({
  onViewWeek,
  className = "",
  variant = "full",
  alwaysVisible = false,
  hideDismiss = false,
  hideHeading = false,
}: WeeklyGmRecapCardProps) {
  const recap = buildWeeklyGmRecap();
  const recapLede = formatWeeklyRecapLede(recap);
  const h2hSummary = formatWeeklyH2hSummary(
    recap.h2hMatches,
    recap.h2hRecordLabel,
    recap.h2hWinPctLabel,
  );
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
          <p className="franchise-home__lede">{recapLede}</p>
        </div>
        <p className="franchise-home__summary">{recap.dailyDaysSplitLabel}</p>
        <p className="franchise-home__meta">
          Best finish {recap.bestDailyFinishLabel}
        </p>
        <p className="franchise-home__meta">{h2hSummary}</p>
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
              <p className="weekly-gm-recap__lede">{recapLede}</p>
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

      <div className="weekly-gm-recap__groups">
        <section className="weekly-gm-recap__group" aria-label="Daily Draft">
          <p className="weekly-gm-recap__group-title">Daily Draft</p>
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
        </section>

        <section className="weekly-gm-recap__group" aria-label="Head to Head">
          <p className="weekly-gm-recap__group-title">Head to Head</p>
          <dl className="weekly-gm-recap__stats">
            <div className="weekly-gm-recap__stat">
              <dt>Matches</dt>
              <dd>{recap.h2hMatches}</dd>
            </div>
            <div className="weekly-gm-recap__stat">
              <dt>Record</dt>
              <dd>{recap.h2hRecordLabel}</dd>
            </div>
            <div className="weekly-gm-recap__stat">
              <dt>Win %</dt>
              <dd>{recap.h2hWinPctLabel}</dd>
            </div>
          </dl>
        </section>
      </div>

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
