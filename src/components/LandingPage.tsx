import { useEffect, useMemo, useRef, useState } from "react";
import {
  completeUnlock,
  getCollectionProgress,
  type PlayerCollection,
} from "../lib/playerCollection";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import { getDailyDateKey } from "../lib/dailyDraft";
import {
  formatPlayerDailyDraftPercentile,
  getPlayerDailyDraftEntry,
} from "../lib/dailyDraftScores";
import { isAllTimeModePlayable } from "../lib/eraUnlocks";
import {
  formatPlayerRecord,
  formatWinPercentage,
  shouldShowWinPercentage,
  type ModePlayerRecords,
  type PlayerRecord,
} from "../lib/playerRecord";
import {
  ALL_TIME_LABEL,
  CLASSIC_HEAD_TO_HEAD_LABEL,
  PRO_HEAD_TO_HEAD_LABEL,
} from "../lib/modeLabels";
import { RANKED_SALARY_CAP } from "../lib/salaryCap";
import {
  loadTeamProfile,
  normalizeTeamProfile,
  type TeamProfile,
} from "../lib/teamProfile";
import { ClassicModeSummary } from "./ClassicModeSummary";
import { RankedModeSummary } from "./RankedModeSummary";
import { GmIdentityBadge } from "./GmIdentityBadge";
import { LossStreakBadge } from "./LossStreakBadge";
import { WinStreakBadge } from "./WinStreakBadge";
import { hasLossStreakBadge } from "../lib/lossStreak";
import { hasFireStreak } from "../lib/winStreak";
import { getOrCreatePlayerIdentity } from "../lib/playerIdentity";
import type { DailyDraftChallenge } from "../lib/dailyDraft";
import type { StartDraftOptions } from "../lib/match";

interface LandingPageProps {
  collection: PlayerCollection;
  dailyChallenge: DailyDraftChallenge;
  modeRecords: ModePlayerRecords;
  isMatchmaking?: boolean;
  onStartDraft: (
    team: TeamProfile,
    options?: StartDraftOptions,
  ) => Promise<boolean>;
  onCollectionChange: (collection: PlayerCollection) => void;
  onViewStats: () => void;
  onViewAchievements: () => void;
  onViewLeaderboard: () => void;
}

function MatchModeRecord({ record }: { record: PlayerRecord }) {
  return (
    <div className="landing-mode-card__record-block">
      <p className="landing-mode-card__record">
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
      <p className="landing-mode-card__record-meta">
        {shouldShowWinPercentage(record)
          ? `${formatWinPercentage(record)} win rate`
          : `${record.wins + record.losses} games played`}
      </p>
    </div>
  );
}

export function LandingPage({
  collection,
  dailyChallenge,
  modeRecords,
  isMatchmaking = false,
  onStartDraft,
  onCollectionChange,
  onViewStats,
  onViewAchievements,
  onViewLeaderboard,
}: LandingPageProps) {
  const [name, setName] = useState(() => loadTeamProfile()?.name ?? "");
  const [error, setError] = useState("");
  const [showUnlockModal, setShowUnlockModal] = useState(
    () => Boolean(collection.pendingUnlock),
  );
  const teamFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (collection.pendingUnlock) {
      setShowUnlockModal(true);
    }
  }, [collection.pendingUnlock]);

  const collectionProgress = getCollectionProgress(collection);
  const allTimePlayable = isAllTimeModePlayable();
  const dailyDateKey = getDailyDateKey();
  const dailyEntry = useMemo(
    () => getPlayerDailyDraftEntry(dailyDateKey, dailyChallenge.id),
    [dailyChallenge.id, dailyDateKey],
  );
  const dailyCompleted = Boolean(dailyEntry);
  const playerIdentity = useMemo(() => getOrCreatePlayerIdentity(), []);

  const handleUnlockSelect = (playerId: string) => {
    const next = completeUnlock(playerId, collection);
    onCollectionChange(next);
    setShowUnlockModal(false);
  };

  const handleStart = async (options?: StartDraftOptions) => {
    if (collection.pendingUnlock || isMatchmaking) {
      if (collection.pendingUnlock) {
        setShowUnlockModal(true);
      }
      return;
    }

    let team = normalizeTeamProfile(name);

    if (!team) {
      const savedTeam = loadTeamProfile();

      if (savedTeam) {
        setName(savedTeam.name);
        team = savedTeam;
      }
    }

    if (!team) {
      setError("Enter a team name to start drafting.");
      teamFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setError("");
    const started = await onStartDraft(team, options);

    if (!started) {
      if (options?.isDailyDraft && dailyCompleted) {
        setError("You've already completed today's Daily Draft. Come back tomorrow.");
        return;
      }

      setError("Couldn't start this draft. Refresh the page and try again.");
    }
  };

  return (
    <section className="landing panel landing--rich">
      {showUnlockModal && collection.pendingUnlock ? (
        <PlayerUnlockModal
          offer={collection.pendingUnlock}
          onSelect={handleUnlockSelect}
          variant="compact"
        />
      ) : null}

      <div className="landing__glow" aria-hidden="true" />

      <p className="eyebrow landing__eyebrow">Draft Day GM</p>
      <h1>Draft your five. Win your way.</h1>
      <p className="landing__lede">
        Pick a mode below, name your team, and draft your five against the
        competition.
      </p>

      <div
        ref={teamFormRef}
        className="landing-team-form landing-card landing-card--form"
      >
        <label className="field">
          <span>Team Name</span>
          <input
            type="text"
            value={name}
            placeholder="e.g. Bulls"
            onChange={(event) => {
              setName(event.target.value);
              if (error) {
                setError("");
              }
            }}
          />
        </label>

        <p className="landing-team-form__note">
          Your team name is saved for future drafts. You can change it here
          anytime before you start.
        </p>

        <p className="landing-team-form__identity">
          <span className="landing-team-form__identity-label">GM code</span>
          <GmIdentityBadge
            publicTag={playerIdentity.publicTag}
            playerId={playerIdentity.playerId}
            showName={false}
          />
          <span className="landing-team-form__identity-note">
            Shown on leaderboards. Tap to verify or copy your full ID.
          </span>
        </p>

        {error ? <p className="form-error">{error}</p> : null}
      </div>

      <div className="landing-game-modes">
        <div className="daily-draft-card landing-card landing-card--daily landing-card--mode">
          <p className="eyebrow">Daily Draft</p>
          <h2 className="daily-draft-card__title">{dailyChallenge.title}</h2>
          <p className="daily-draft-card__description">{dailyChallenge.description}</p>
          <p className="daily-draft-card__meta">
            Same goal for everyone today. Player stats stay hidden while you draft.
            One attempt per day.
          </p>
          <div className="landing-mode-card__record-block">
            <p className="landing-mode-card__record">
              <span className="landing-mode-card__record-label">Today</span>
              <span className="landing-mode-card__record-value landing-mode-card__record-value--daily">
                {dailyEntry?.formattedResult ?? "—"}
              </span>
            </p>
            <p className="landing-mode-card__record-meta">
              {dailyEntry
                ? `${formatPlayerDailyDraftPercentile(dailyEntry)} · Daily draft complete`
                : "Not played yet today"}
            </p>
          </div>
          <button
            type="button"
            className="daily-draft-card__button"
            disabled={dailyCompleted || isMatchmaking}
            onClick={() => void handleStart({ isDailyDraft: true })}
          >
            {isMatchmaking
              ? "Finding opponent..."
              : dailyCompleted
                ? "Completed for today"
                : "Play Today's Daily Draft"}
          </button>
        </div>

        <div className="head-to-head-card landing-card landing-card--mode">
          <p className="eyebrow">{CLASSIC_HEAD_TO_HEAD_LABEL}</p>
          <p className="head-to-head-card__description">
            Build under a $150M cap with real 2025-26 salaries. Banner matchmaking
            pairs you with similarly rated front offices, and monthly seasons
            reset the global Top 500.
          </p>
          <ClassicModeSummary record={modeRecords.headToHead} />
          <button
            type="button"
            className="landing__primary-button"
            disabled={isMatchmaking}
            onClick={() => void handleStart()}
          >
            {isMatchmaking ? "Finding opponent..." : `Play ${CLASSIC_HEAD_TO_HEAD_LABEL}`}
          </button>
        </div>

        <div className="ranked-cap-card landing-card landing-card--mode">
          <p className="eyebrow">{PRO_HEAD_TO_HEAD_LABEL}</p>
          <p className="ranked-cap-card__description">
            Build under a ${(RANKED_SALARY_CAP / 1_000_000).toFixed(0)}M cap with
            real 2025-26 salaries. Banner matchmaking pairs you with similarly
            rated front offices, and monthly seasons reset the global Top 500.
          </p>
          <RankedModeSummary record={modeRecords.ranked} />
          <button
            type="button"
            className="ranked-cap-card__button"
            disabled={isMatchmaking}
            onClick={() => void handleStart({ salaryCapMode: true })}
          >
            {isMatchmaking ? "Finding opponent..." : `Play ${PRO_HEAD_TO_HEAD_LABEL}`}
          </button>
        </div>

        <div className="all-time-card landing-card landing-card--mode">
          <p className="eyebrow">{ALL_TIME_LABEL}</p>
          <h2 className="all-time-card__title">Peak seasons &amp; legends</h2>
          <p className="all-time-card__description">
            Draft active stars at their peak seasons plus legendary All-Stars from
            every era.
            {allTimePlayable
              ? ""
              : " This mode is in development and will launch soon."}
          </p>
          {allTimePlayable ? (
            <>
              <MatchModeRecord record={modeRecords.allTime} />
              <button
                type="button"
                className="all-time-card__button"
                disabled={isMatchmaking}
                onClick={() => void handleStart({ allTimeMode: true })}
              >
                Play All-Time Draft
              </button>
            </>
          ) : (
            <button
              type="button"
              className="all-time-card__button all-time-card__button--locked"
              disabled
            >
              Coming soon
            </button>
          )}
        </div>
      </div>

      <div className="landing-nav-actions">
        <button
          type="button"
          className="landing-nav-actions__button"
          onClick={onViewLeaderboard}
        >
          Leaderboard
        </button>
        <button
          type="button"
          className="landing-nav-actions__button"
          onClick={onViewStats}
        >
          Season stats
        </button>
        <button
          type="button"
          className="landing-nav-actions__button"
          onClick={onViewAchievements}
        >
          Badges
        </button>
      </div>

      <div className="collection-progress-card landing-card landing-card--collection">
        <p className="eyebrow">Your stars &amp; scrubs</p>
        <div className="collection-progress-card__split">
          <div className="collection-progress-card__column">
            <span className="collection-progress-card__label">All-Stars</span>
            <span className="collection-progress-card__value">
              {collectionProgress.unlocked}/{collectionProgress.total}
            </span>
          </div>
          <div className="collection-progress-card__column">
            <span className="collection-progress-card__label">Superstars</span>
            <span className="collection-progress-card__value collection-progress-card__value--superstar">
              {collectionProgress.superstarUnlocked}/{collectionProgress.superstarTotal}
            </span>
          </div>
          <div className="collection-progress-card__column">
            <span className="collection-progress-card__label">Recent All-Stars</span>
            <span className="collection-progress-card__value collection-progress-card__value--recent">
              {collectionProgress.recentUnlocked}/{collectionProgress.recentTotal}
            </span>
          </div>
          <div className="collection-progress-card__column">
            <span className="collection-progress-card__label">Scrubs</span>
            <span className="collection-progress-card__value collection-progress-card__value--scrubs">
              {collectionProgress.unlockedScrubs}/{collectionProgress.scrubPool}
            </span>
          </div>
          <div className="collection-progress-card__column">
            <span className="collection-progress-card__label">Super Scrubs</span>
            <span className="collection-progress-card__value collection-progress-card__value--super-scrubs">
              {collectionProgress.unlockedSuperScrubs}/{collectionProgress.superScrubPool}
            </span>
          </div>
        </div>
        <p className="collection-progress-card__meta">
          Win to unlock more stars, lose to unlock scrubs.
        </p>
      </div>

      <p className="landing-credit">Powered by BALLACADEMY</p>
    </section>
  );
}
