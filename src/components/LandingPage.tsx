import { useEffect, useMemo, useRef, useState } from "react";
import {
  completeUnlock,
  getCollectionProgress,
  type PlayerCollection,
} from "../lib/playerCollection";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import { getDailyDateKey, getDailyChallenge } from "../lib/dailyDraft";
import {
  getPlayerDailyDraftEntry,
} from "../lib/dailyDraftScores";
import { isAllTimeModePlayable } from "../lib/eraUnlocks";
import {
  formatPlayerRecord,
  type ModePlayerRecords,
  type PlayerRecord,
} from "../lib/playerRecord";
import {
  ALL_TIME_LABEL,
  CLASSIC_HEAD_TO_HEAD_LABEL,
  PRO_HEAD_TO_HEAD_LABEL,
} from "../lib/modeLabels";
import { PICK_TIME_LIMIT_SECONDS, CLASSIC_PICK_TIME_LIMIT_SECONDS, DAILY_PICK_TIME_LIMIT_SECONDS } from "../lib/match";
import {
  CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
  RANKED_SALARY_CAP,
} from "../lib/salaryCap";
import {
  getTeamProfileValidationMessage,
  loadTeamProfile,
  saveTeamProfile,
  validateTeamProfile,
  type TeamProfile,
} from "../lib/teamProfile";
import { ClassicModeSummary } from "./ClassicModeSummary";
import { DraftDayGmLogo } from "./DraftDayGmLogo";
import { ModeCardInfo } from "./ModeCardInfo";
import { RankedModeSummary } from "./RankedModeSummary";
import { GmIdentityBadge } from "./GmIdentityBadge";
import { LossStreakBadge } from "./LossStreakBadge";
import { WinStreakBadge } from "./WinStreakBadge";
import { hasLossStreakBadge } from "../lib/lossStreak";
import { hasFireStreak } from "../lib/winStreak";
import { getOrCreatePlayerIdentity } from "../lib/playerIdentity";
import type { GhostMatchmakingMode } from "../lib/ghostMatchmaking";
import type { StartDraftOptions } from "../lib/match";

const buildHeadToHeadModeDetails = (
  baseDetails: string[],
  unlockedCount: number,
) => [
  ...baseDetails,
  `Your draft pool has ${unlockedCount} unlocked players.`,
  "Win to unlock stars, lose to unlock scrubs.",
];

interface LandingPageProps {
  collection: PlayerCollection;
  modeRecords: ModePlayerRecords;
  matchmakingMode?: GhostMatchmakingMode | null;
  matchmakingElapsedSeconds?: number;
  startMatchError?: string | null;
  onStartDraft: (
    team: TeamProfile,
    options?: StartDraftOptions,
  ) => Promise<boolean>;
  onViewDailyLineup?: () => Promise<boolean> | boolean;
  onViewYesterdayBestDailyLineup?: () => Promise<boolean> | boolean;
  dailyPercentileLabel?: string | null;
  canViewDailyLineup?: boolean;
  onCollectionChange: (collection: PlayerCollection) => void;
  onViewStats: () => void;
  onViewAchievements: () => void;
  onViewLeaderboard: () => void;
  onViewPrivacy: () => void;
  onViewTerms: () => void;
}

function MatchModeRecord({ record }: { record: PlayerRecord }) {
  return (
    <div className="landing-mode-card__record-block landing-mode-card__record-block--solo">
      <p className="landing-mode-card__record ranked-mode-summary__record">
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
    </div>
  );
}

export function LandingPage({
  collection,
  modeRecords,
  matchmakingMode = null,
  matchmakingElapsedSeconds = 0,
  startMatchError = null,
  onStartDraft,
  onViewDailyLineup,
  onViewYesterdayBestDailyLineup,
  dailyPercentileLabel = null,
  canViewDailyLineup = false,
  onCollectionChange,
  onViewStats,
  onViewAchievements,
  onViewLeaderboard,
  onViewPrivacy,
  onViewTerms,
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
  const todayDateKey = getDailyDateKey();
  const todayChallenge = useMemo(
    () => getDailyChallenge(todayDateKey),
    [todayDateKey],
  );
  const dailyEntry = useMemo(
    () => getPlayerDailyDraftEntry(todayDateKey, todayChallenge.id),
    [todayChallenge.id, todayDateKey],
  );
  const dailyCompleted = Boolean(dailyEntry);
  const isMatchmaking = matchmakingMode != null;
  const teamValidation = useMemo(() => validateTeamProfile(name), [name]);
  const canStartDraft =
    teamValidation.ok && !isMatchmaking && !collection.pendingUnlock;
  const classicModeDetails = useMemo(
    () =>
      buildHeadToHeadModeDetails(
        [
          "Real 2026-27 salaries.",
          "Matchmaking pairs similar front offices.",
        ],
        collection.unlockedIds.length,
      ),
    [collection.unlockedIds.length],
  );
  const proModeDetails = useMemo(
    () =>
      buildHeadToHeadModeDetails(
        [
          "Real 2026-27 salaries.",
          "Banner matchmaking pairs similar front offices.",
          "Monthly seasons reset the Top 500.",
        ],
        collection.unlockedIds.length,
      ),
    [collection.unlockedIds.length],
  );
  const playerIdentity = useMemo(() => getOrCreatePlayerIdentity(), []);
  const matchmakingLabel =
    matchmakingElapsedSeconds > 0
      ? `Finding opponent… ${matchmakingElapsedSeconds}s`
      : "Finding opponent…";

  const handleUnlockSelect = (playerId: string) => {
    const next = completeUnlock(playerId, collection);
    onCollectionChange(next);
    setShowUnlockModal(false);
  };

  const handleTeamNameBlur = () => {
    const validation = validateTeamProfile(name);

    if (!validation.ok) {
      setError(getTeamProfileValidationMessage(validation.error));
      return;
    }

    const savedTeam = loadTeamProfile();

    if (savedTeam?.name === validation.profile.name) {
      return;
    }

    saveTeamProfile(validation.profile);
    setName(validation.profile.name);

    if (error === getTeamProfileValidationMessage("profanity")) {
      setError("");
    }
  };

  const handleStart = async (options?: StartDraftOptions) => {
    if (collection.pendingUnlock || isMatchmaking) {
      if (collection.pendingUnlock) {
        setShowUnlockModal(true);
      }
      return;
    }

    const validation = validateTeamProfile(name);

    if (!validation.ok) {
      setError(getTeamProfileValidationMessage(validation.error));
      teamFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const team = validation.profile;

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

  const handleDailyAction = async () => {
    if (collection.pendingUnlock || isMatchmaking) {
      if (collection.pendingUnlock) {
        setShowUnlockModal(true);
      }
      return;
    }

    const validation = validateTeamProfile(name);

    if (!validation.ok) {
      setError(getTeamProfileValidationMessage(validation.error));
      teamFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (dailyCompleted) {
      if (!canViewDailyLineup || !onViewDailyLineup) {
        return;
      }

      setError("");
      const opened = await onViewDailyLineup();

      if (!opened) {
        setError("Couldn't load today's lineup. Try again in a moment.");
      }

      return;
    }

    await handleStart({ isDailyDraft: true });
  };

  const handleYesterdayBestAction = async () => {
    if (collection.pendingUnlock || isMatchmaking || !onViewYesterdayBestDailyLineup) {
      if (collection.pendingUnlock) {
        setShowUnlockModal(true);
      }
      return;
    }

    setError("");
    const opened = await onViewYesterdayBestDailyLineup();

    if (!opened) {
      setError("Couldn't load yesterday's best lineup. Try again in a moment.");
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

      <div className="landing__brand">
        <DraftDayGmLogo className="landing__logo" />
      </div>
      <h1>Draft your five. Compete head to head.</h1>
      <p className="landing__lede">
        Name your team, pick a mode below, and draft a five-player lineup.
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
            onBlur={handleTeamNameBlur}
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

        {error || startMatchError ? (
          <p className="form-error">{error || startMatchError}</p>
        ) : null}
      </div>

      <div className="landing-profile-strip landing-card landing-card--profile">
        <div className="landing-profile-strip__stats">
          <div className="landing-profile-strip__stat">
            <span className="landing-profile-strip__label">All-Stars</span>
            <strong>
              {collectionProgress.unlocked}/{collectionProgress.total}
            </strong>
          </div>
          <div className="landing-profile-strip__stat">
            <span className="landing-profile-strip__label">Superstars</span>
            <strong>
              {collectionProgress.superstarUnlocked}/{collectionProgress.superstarTotal}
            </strong>
          </div>
          <div className="landing-profile-strip__stat">
            <span className="landing-profile-strip__label">Scrubs</span>
            <strong>
              {collectionProgress.unlockedScrubs}/{collectionProgress.scrubPool}
            </strong>
          </div>
          <div className="landing-profile-strip__stat">
            <span className="landing-profile-strip__label">Recent All-Stars</span>
            <strong>
              {collectionProgress.recentUnlocked}/{collectionProgress.recentTotal}
            </strong>
          </div>
        </div>
        <p className="landing-profile-strip__meta">
          Win to unlock stars, lose to unlock scrubs.
        </p>
      </div>

      <div className="landing-game-modes">
        <div className="daily-draft-card landing-card landing-card--daily landing-card--mode">
          <p className="eyebrow">Daily Draft</p>
          <h2 className="daily-draft-card__title">{todayChallenge.title}</h2>
          <p className="daily-draft-card__description">{todayChallenge.description}</p>
          <p className="daily-draft-card__meta">
            Draft a five-player lineup with {DAILY_PICK_TIME_LIMIT_SECONDS} seconds
            per pick. Stats stay hidden. Same goal for everyone today — one attempt
            per day.
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
                ? dailyPercentileLabel ?? "Daily draft complete"
                : "Not played yet today"}
            </p>
          </div>
          <div className="daily-draft-card__actions">
            <button
              type="button"
              className={`daily-draft-card__button${dailyCompleted ? " daily-draft-card__button--completed" : ""}`}
              disabled={!canStartDraft || (dailyCompleted && !canViewDailyLineup)}
              onClick={() => void handleDailyAction()}
            >
              {dailyCompleted
                ? "View my lineup"
                : "Play Today's Daily Draft"}
            </button>
            <button
              type="button"
              className="daily-draft-card__button daily-draft-card__button--secondary"
              disabled={!onViewYesterdayBestDailyLineup || isMatchmaking}
              onClick={() => void handleYesterdayBestAction()}
            >
              Yesterday&apos;s best
            </button>
          </div>
        </div>

        <div className="head-to-head-card landing-card landing-card--mode">
          <div className="mode-card__header">
            <p className="eyebrow">{CLASSIC_HEAD_TO_HEAD_LABEL}</p>
            <ModeCardInfo details={classicModeDetails} variant="corner" />
          </div>
          <p className="head-to-head-card__description">
            Draft a five-player lineup under a $
            {(CLASSIC_HEAD_TO_HEAD_SALARY_CAP / 1_000_000).toFixed(0)}M cap with{" "}
            {CLASSIC_PICK_TIME_LIMIT_SECONDS} seconds per pick.
          </p>
          <ClassicModeSummary record={modeRecords.headToHead} />
          <div className="mode-card__actions">
            <button
              type="button"
              className="landing__primary-button"
              disabled={!canStartDraft}
              onClick={() => void handleStart()}
            >
              {matchmakingMode === "classic"
                ? matchmakingLabel
                : `Play ${CLASSIC_HEAD_TO_HEAD_LABEL}`}
            </button>
            <button
              type="button"
              className="head-to-head-card__practice-button"
              disabled={!canStartDraft}
              onClick={() =>
                void handleStart({
                  practiceMode: true,
                  salaryCapLimit: CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
                })
              }
            >
              Practice
            </button>
          </div>
          <p className="mode-card__practice-note">
            Practice uses the same ${(CLASSIC_HEAD_TO_HEAD_SALARY_CAP / 1_000_000).toFixed(0)}M cap and bot
            opponent. Streaks and badges do not change.
          </p>
        </div>

        <div className="ranked-cap-card landing-card landing-card--mode">
          <div className="mode-card__header">
            <p className="eyebrow">{PRO_HEAD_TO_HEAD_LABEL}</p>
            <ModeCardInfo details={proModeDetails} variant="corner" />
          </div>
          <p className="ranked-cap-card__description">
            Draft a five-player lineup under a $
            {(RANKED_SALARY_CAP / 1_000_000).toFixed(0)}M cap with{" "}
            {PICK_TIME_LIMIT_SECONDS} seconds per pick.
          </p>
          <RankedModeSummary record={modeRecords.ranked} />
          <div className="mode-card__actions">
            <button
              type="button"
              className="ranked-cap-card__button"
              disabled={!canStartDraft}
              onClick={() => void handleStart({ salaryCapMode: true })}
            >
              {matchmakingMode === "ranked"
                ? matchmakingLabel
                : `Play ${PRO_HEAD_TO_HEAD_LABEL}`}
            </button>
            <button
              type="button"
              className="ranked-cap-card__practice-button"
              disabled={!canStartDraft}
              onClick={() =>
                void handleStart({
                  practiceMode: true,
                  salaryCapMode: true,
                  salaryCapLimit: RANKED_SALARY_CAP,
                })
              }
            >
              Practice
            </button>
          </div>
          <p className="mode-card__practice-note">
            Practice uses the same ${(RANKED_SALARY_CAP / 1_000_000).toFixed(0)}M cap and bot opponent.
            Banners, streaks, and badges do not change.
          </p>
        </div>

        <div className="all-time-card landing-card landing-card--mode">
          <p className="eyebrow">{ALL_TIME_LABEL}</p>
          <h2 className="all-time-card__title">Peak seasons &amp; legends</h2>
          <p className="all-time-card__description">
            Draft a five-player lineup with {PICK_TIME_LIMIT_SECONDS} seconds per
            pick from active stars at peak seasons plus legendary All-Stars from
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
                disabled={!canStartDraft}
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

      <p className="landing-disclaimer">
        Draft Day GM is an independent project. It is not affiliated with,
        endorsed by, or connected to the NBA, its teams, players, or partners.
        Team names, player names, and statistics are used for informational
        purposes only.
      </p>

      <nav className="landing-footer" aria-label="Legal">
        <button type="button" className="landing-footer__link" onClick={onViewPrivacy}>
          Privacy Policy
        </button>
        <span className="landing-footer__sep" aria-hidden="true">
          ·
        </span>
        <button type="button" className="landing-footer__link" onClick={onViewTerms}>
          Terms of Use
        </button>
      </nav>

      <p className="landing-credit">Powered by BALLACADEMY</p>
    </section>
  );
}
