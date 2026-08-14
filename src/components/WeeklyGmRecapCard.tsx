import { useMemo, useState } from "react";
import {
  buildWeeklyGmRecap,
  hasSeenWeeklyRecap,
  markWeeklyRecapSeen,
} from "../lib/gmWeeklyRecap";

interface WeeklyGmRecapCardProps {
  onViewGmStats?: () => void;
  className?: string;
}

export function WeeklyGmRecapCard({
  onViewGmStats,
  className = "",
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

  return (
    <section
      className={`weekly-gm-recap${className ? ` ${className}` : ""}`}
      aria-labelledby="weekly-gm-recap-title"
    >
      <div className="weekly-gm-recap__header">
        <h2 className="weekly-gm-recap__title" id="weekly-gm-recap-title">
          Weekly GM recap
        </h2>
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
          <dt>Daily this week</dt>
          <dd>{recap.dailyDaysThisWeek} day{recap.dailyDaysThisWeek === 1 ? "" : "s"}</dd>
        </div>
        <div className="weekly-gm-recap__stat">
          <dt>Best streak</dt>
          <dd>{recap.bestStreakLabel}</dd>
        </div>
        <div className="weekly-gm-recap__stat">
          <dt>Collection</dt>
          <dd>
            {recap.collectionUnlocked}/{recap.collectionTotal}
          </dd>
        </div>
        <div className="weekly-gm-recap__stat">
          <dt>Career H2H</dt>
          <dd>{recap.careerH2hRecord}</dd>
        </div>
        <div className="weekly-gm-recap__stat">
          <dt>Front office badges</dt>
          <dd>{recap.frontOfficeBadgesUnlocked}</dd>
        </div>
      </dl>

      {onViewGmStats ? (
        <div className="weekly-gm-recap__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onViewGmStats}
          >
            View full stats
          </button>
        </div>
      ) : null}
    </section>
  );
}
