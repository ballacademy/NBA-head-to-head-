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
          Weekly GM recap · {recap.dailyDaysSplitLabel} Daily days
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
            Weekly GM recap
          </h2>
          <p className="weekly-gm-recap__lede">
            This week’s Daily Draft progress, plus your Casual and Pro snapshot.
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
              <dt>Daily days played</dt>
              <dd>{recap.dailyDaysSplitLabel}</dd>
            </div>
            <div className="weekly-gm-recap__stat">
              <dt>Best Daily finish</dt>
              <dd>{recap.bestDailyFinishLabel}</dd>
            </div>
          </dl>
        </div>

        <div className="weekly-gm-recap__group">
          <h3 className="weekly-gm-recap__group-title">Career snapshot</h3>
          <dl className="weekly-gm-recap__stats">
            <div className="weekly-gm-recap__stat">
              <dt>Casual H2H</dt>
              <dd>
                {recap.casualRecord}
                <span className="weekly-gm-recap__stat-meta">
                  {recap.casualBannersLabel}
                </span>
              </dd>
            </div>
            <div className="weekly-gm-recap__stat">
              <dt>Pro H2H</dt>
              <dd>
                {recap.proRecord}
                <span className="weekly-gm-recap__stat-meta">
                  {recap.proBannersLabel}
                </span>
              </dd>
            </div>
            <div className="weekly-gm-recap__stat">
              <dt>Basic Daily streak</dt>
              <dd>{recap.basicStreakLabel}</dd>
            </div>
            <div className="weekly-gm-recap__stat">
              <dt>Advanced Daily streak</dt>
              <dd>{recap.advancedStreakLabel}</dd>
            </div>
            <div className="weekly-gm-recap__stat">
              <dt>Stars unlocked</dt>
              <dd>
                {recap.collectionUnlocked} of {recap.collectionTotal}
                <span className="weekly-gm-recap__stat-meta">
                  All-Stars + Superstars
                </span>
              </dd>
            </div>
            <div className="weekly-gm-recap__stat">
              <dt>Lifetime FO badges</dt>
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
