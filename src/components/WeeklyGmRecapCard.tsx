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

  const dailyDaysLabel =
    recap.dailyDaysThisWeek === 1
      ? "1 day played"
      : `${recap.dailyDaysThisWeek} days played`;

  return (
    <section
      className={`weekly-gm-recap${className ? ` ${className}` : ""}`}
      aria-labelledby="weekly-gm-recap-title"
    >
      <div className="weekly-gm-recap__header">
        <div className="weekly-gm-recap__heading">
          <h2 className="weekly-gm-recap__title" id="weekly-gm-recap-title">
            Weekly GM recap
          </h2>
          <p className="weekly-gm-recap__lede">
            Daily Draft activity this week, plus a quick career snapshot.
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

      <div className="weekly-gm-recap__groups">
        <div className="weekly-gm-recap__group">
          <h3 className="weekly-gm-recap__group-title">This week</h3>
          <dl className="weekly-gm-recap__stats">
            <div className="weekly-gm-recap__stat">
              <dt>Daily Draft</dt>
              <dd>{dailyDaysLabel}</dd>
            </div>
          </dl>
        </div>

        <div className="weekly-gm-recap__group">
          <h3 className="weekly-gm-recap__group-title">Career snapshot</h3>
          <dl className="weekly-gm-recap__stats">
            <div className="weekly-gm-recap__stat">
              <dt>Daily streak</dt>
              <dd>{recap.bestStreakLabel}</dd>
            </div>
            <div className="weekly-gm-recap__stat">
              <dt>All-Stars unlocked</dt>
              <dd>
                {recap.collectionUnlocked} of {recap.collectionTotal}
              </dd>
            </div>
            <div className="weekly-gm-recap__stat">
              <dt>H2H record</dt>
              <dd>{recap.careerH2hRecord}</dd>
            </div>
            <div className="weekly-gm-recap__stat">
              <dt>Front Office badges</dt>
              <dd>{recap.frontOfficeBadgesUnlocked} unlocked</dd>
            </div>
          </dl>
        </div>
      </div>

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
