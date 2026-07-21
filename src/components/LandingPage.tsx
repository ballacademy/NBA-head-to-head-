import { useEffect, useMemo, useRef, useState } from "react";
import {
  completeUnlock,
  getCollectionProgress,
  getCollectionTierTotal,
  getUnlockedPlayersByTier,
  type CollectionTier,
  type PlayerCollection,
} from "../lib/playerCollection";
import { CollectionTierModal } from "./CollectionTierModal";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import type { DailyDraftMode } from "../lib/dailyDraftMode";
import { formatDailyDraftModeLabel } from "../lib/dailyDraftMode";
import type { LandingDailyDraftSnapshot } from "../lib/landingDailyDraft";
import {
  formatDailyDraftPlayStreak,
  getDailyDraftPlayStreak,
} from "../lib/dailyDraftPlayStreak";
import { getDailyDateKey } from "../lib/dailyDraft";
import { isAllTimeModePlayable } from "../lib/eraUnlocks";
import {
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
import { TeamNameValidationModal } from "./TeamNameValidationModal";
import { RankedModeSummary } from "./RankedModeSummary";
import { GmIdentityBadge } from "./GmIdentityBadge";
import { RecordWithStreak } from "./RecordWithStreak";
import { getOrCreatePlayerIdentity } from "../lib/playerIdentity";
import type { GhostMatchmakingMode } from "../lib/ghostMatchmaking";
import type { StartDraftOptions, StartMatchResult } from "../lib/match";

const buildHeadToHeadModeDetails = (
  baseDetails: string[],
  unlockedCount: number,
) => [
  ...baseDetails,
  `Your draft pool has ${unlockedCount} unlocked players.`,
  "Win to unlock All-Stars, lose to unlock scrubs.",
];

interface LandingPageProps {
  collection: PlayerCollection;
  modeRecords: ModePlayerRecords;
  matchmakingMode?: GhostMatchmakingMode | null;
  isMatchmakingSearchActive?: boolean;
  matchmakingElapsedSeconds?: number;
  startMatchError?: string | null;
  onStartDraft: (
    team: TeamProfile,
    options?: StartDraftOptions,
  ) => Promise<StartMatchResult>;
  onViewDailyLineup?: (mode: DailyDraftMode) => Promise<boolean> | boolean;
  onViewYesterdayBestDailyLineup?: (
    mode: DailyDraftMode,
  ) => Promise<boolean> | boolean;
  landingBasicDaily: LandingDailyDraftSnapshot;
  landingAdvancedDaily: LandingDailyDraftSnapshot;
  onCollectionChange: (collection: PlayerCollection) => void;
  onViewStats: () => void;
  onViewGmStats: () => void;
  onViewAchievements: () => void;
  onViewLeaderboard: () => void;
  onViewPrivacy: () => void;
  onViewTerms: () => void;
}

function MatchModeRecord({ record }: { record: PlayerRecord }) {
  return (
    <div className="landing-mode-card__record-block landing-mode-card__record-block--solo">
      <RecordWithStreak
        record={record}
        align="right"
        className="ranked-mode-summary__record"
      />
    </div>
  );
}

export function LandingPage({
  collection,
  modeRecords,
  matchmakingMode = null,
  isMatchmakingSearchActive = false,
  matchmakingElapsedSeconds = 0,
  startMatchError = null,
  onStartDraft,
  onViewDailyLineup,
  onViewYesterdayBestDailyLineup,
  landingBasicDaily,
  landingAdvancedDaily,
  onCollectionChange,
  onViewStats,
  onViewGmStats,
  onViewAchievements,
  onViewLeaderboard,
  onViewPrivacy,
  onViewTerms,
}: LandingPageProps) {
  const [name, setName] = useState(() => loadTeamProfile()?.name ?? "");
  const [error, setError] = useState("");
  const [showTeamNameModal, setShowTeamNameModal] = useState(false);
  const [teamNameModalMessage, setTeamNameModalMessage] = useState("");
  const [showUnlockModal, setShowUnlockModal] = useState(
    () => Boolean(collection.pendingUnlock),
  );
  const [collectionTier, setCollectionTier] = useState<CollectionTier | null>(
    null,
  );
  const teamFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (collection.pendingUnlock) {
      setShowUnlockModal(true);
    }
  }, [collection.pendingUnlock]);

  const collectionProgress = getCollectionProgress(collection);
  const allTimePlayable = isAllTimeModePlayable();
  const isMatchmaking = isMatchmakingSearchActive || matchmakingMode != null;
  const teamValidation = useMemo(() => validateTeamProfile(name), [name]);
  const modesBlocked = isMatchmaking || Boolean(collection.pendingUnlock);
  const profanityWarning =
    teamValidation.ok === false && teamValidation.error === "profanity"
      ? getTeamProfileValidationMessage("profanity")
      : null;
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

  const promptForValidTeamProfile = (): TeamProfile | null => {
    const validation = validateTeamProfile(name);

    if (!validation.ok) {
      const message = getTeamProfileValidationMessage(validation.error);
      setError(message);
      setTeamNameModalMessage(message);
      setShowTeamNameModal(true);
      teamFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return null;
    }

    return validation.profile;
  };

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

    const team = promptForValidTeamProfile();

    if (!team) {
      return;
    }

    setError("");
    const result = await onStartDraft(team, options);

    if (result === "failed") {
      if (options?.isDailyDraft) {
        const mode = options.dailyDraftMode ?? "basic";
        const completed =
          mode === "advanced"
            ? Boolean(landingAdvancedDaily.entry)
            : Boolean(landingBasicDaily.entry);

        if (completed) {
          setError(
            `You've already completed today's ${formatDailyDraftModeLabel(mode)} Daily Draft. Come back tomorrow.`,
          );
          return;
        }
      }

      setError("Couldn't start this draft. Refresh the page and try again.");
    }
  };

  const handleDailyAction = async (mode: DailyDraftMode) => {
    const snapshot =
      mode === "advanced" ? landingAdvancedDaily : landingBasicDaily;
    const dailyCompleted = Boolean(snapshot.entry);

    if (collection.pendingUnlock || isMatchmaking) {
      if (collection.pendingUnlock) {
        setShowUnlockModal(true);
      }
      return;
    }

    if (dailyCompleted) {
      if (!snapshot.canViewLineup || !onViewDailyLineup) {
        return;
      }

      setError("");
      const opened = await onViewDailyLineup(mode);

      if (!opened) {
        setError("Couldn't load today's lineup. Try again in a moment.");
      }

      return;
    }

    await handleStart({ isDailyDraft: true, dailyDraftMode: mode });
  };

  const handleYesterdayBestAction = async (mode: DailyDraftMode) => {
    if (collection.pendingUnlock || isMatchmaking || !onViewYesterdayBestDailyLineup) {
      if (collection.pendingUnlock) {
        setShowUnlockModal(true);
      }
      return;
    }

    setError("");
    const opened = await onViewYesterdayBestDailyLineup(mode);

    if (!opened) {
      setError("Couldn't load yesterday's best lineup. Try again in a moment.");
    }
  };

  const renderDailyModeSection = (snapshot: LandingDailyDraftSnapshot) => {
    const mode = snapshot.setup.mode;
    const dailyCompleted = Boolean(snapshot.entry);
    const playStreak = getDailyDraftPlayStreak(mode, getDailyDateKey());

    return (
      <section
        key={mode}
        className="daily-draft-mode-section"
        aria-labelledby={`daily-draft-${mode}-title`}
      >
        <div className="daily-draft-mode-section__header">
          <h3 id={`daily-draft-${mode}-title`}>
            {formatDailyDraftModeLabel(mode)} Daily
          </h3>
          <p className="daily-draft-mode-section__subtitle">
            {mode === "advanced"
              ? "Per-minute and rate stats"
              : "Season per-game stats"}
          </p>
        </div>
        <h4 className="daily-draft-mode-section__challenge-title">
          {snapshot.goal.title}
        </h4>
        <p className="daily-draft-mode-section__description">
          {snapshot.goal.description}
        </p>
        <div className="landing-mode-card__record-block daily-draft-mode-section__record">
          <p className="landing-mode-card__record">
            <span className="landing-mode-card__record-label">Today</span>
            <span className="landing-mode-card__record-value landing-mode-card__record-value--daily">
              {snapshot.entry?.formattedResult ?? "—"}
            </span>
          </p>
          <p className="landing-mode-card__record-meta">
            {snapshot.entry
              ? snapshot.percentileLabel ?? "Daily draft complete"
              : "Not played yet today"}
          </p>
          <p className="landing-mode-card__record-meta daily-draft-mode-section__streak">
            {playStreak.current > 0
              ? formatDailyDraftPlayStreak(playStreak)
              : "Play today to start a streak"}
          </p>
        </div>
        <div className="daily-draft-mode-section__actions">
          <button
            type="button"
            className={`daily-draft-card__button${dailyCompleted ? " daily-draft-card__button--completed" : ""}`}
            disabled={modesBlocked || (dailyCompleted && !snapshot.canViewLineup)}
            onClick={() => void handleDailyAction(mode)}
          >
            {dailyCompleted
              ? `View ${formatDailyDraftModeLabel(mode)} lineup`
              : `Play ${formatDailyDraftModeLabel(mode)} Today`}
          </button>
          <button
            type="button"
            className="daily-draft-card__button daily-draft-card__button--secondary"
            disabled={!onViewYesterdayBestDailyLineup || isMatchmaking}
            onClick={() => void handleYesterdayBestAction(mode)}
          >
            Yesterday&apos;s best ({formatDailyDraftModeLabel(mode)})
          </button>
        </div>
      </section>
    );
  };

  return (
    <section className="landing panel landing--rich">
      {showTeamNameModal ? (
        <TeamNameValidationModal
          message={teamNameModalMessage}
          onClose={() => {
            setShowTeamNameModal(false);
          }}
        />
      ) : null}

      {showUnlockModal && collection.pendingUnlock ? (
        <PlayerUnlockModal
          offer={collection.pendingUnlock}
          onSelect={handleUnlockSelect}
          variant="compact"
        />
      ) : null}

      {collectionTier ? (
        <CollectionTierModal
          tier={collectionTier}
          players={getUnlockedPlayersByTier(collectionTier, collection)}
          total={getCollectionTierTotal(collectionTier, collectionProgress)}
          onClose={() => setCollectionTier(null)}
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
          <button
            type="button"
            className="landing-team-form__gm-stats-button"
            onClick={onViewGmStats}
          >
            GM stats
          </button>
          <ModeCardInfo
            details={[
              "Career wins and losses across every mode.",
              "Daily draft days played, consecutive-day streaks, best percentile, and latest result.",
              "Best monthly leaderboard finish and most banners ever.",
              "Front office rank badges earned from peak banner totals.",
            ]}
            variant="corner"
            popoverAlign="start"
            ariaLabel="GM career stats details"
          />
          <span className="landing-team-form__identity-note">
            Shown on leaderboards. Tap your code to verify or copy your full ID.
          </span>
        </p>

        {profanityWarning || error || startMatchError ? (
          <p className="form-error">{profanityWarning || error || startMatchError}</p>
        ) : null}
      </div>

      <div className="landing-profile-strip landing-card landing-card--profile">
        <div
          className="landing-profile-strip__stats"
          aria-label="Player collection by category"
        >
          <button
            type="button"
            className="landing-profile-strip__stat landing-profile-strip__stat--btn"
            onClick={() => setCollectionTier("all-star")}
          >
            <span className="landing-profile-strip__label">All-Stars</span>
            <strong>
              {collectionProgress.unlocked}/{collectionProgress.total}
            </strong>
          </button>
          <button
            type="button"
            className="landing-profile-strip__stat landing-profile-strip__stat--btn"
            onClick={() => setCollectionTier("superstar")}
          >
            <span className="landing-profile-strip__label">Superstars</span>
            <strong>
              {collectionProgress.superstarUnlocked}/
              {collectionProgress.superstarTotal}
            </strong>
          </button>
          <button
            type="button"
            className="landing-profile-strip__stat landing-profile-strip__stat--btn"
            onClick={() => setCollectionTier("scrub")}
          >
            <span className="landing-profile-strip__label">Scrubs</span>
            <strong>
              {collectionProgress.unlockedScrubs}/{collectionProgress.scrubPool}
            </strong>
          </button>
          <button
            type="button"
            className="landing-profile-strip__stat landing-profile-strip__stat--btn"
            onClick={() => setCollectionTier("recent-all-star")}
          >
            <span className="landing-profile-strip__label">Recent All-Stars</span>
            <strong>
              {collectionProgress.recentUnlocked}/
              {collectionProgress.recentTotal}
            </strong>
          </button>
        </div>
        <p className="landing-profile-strip__meta">
          Tap a category to see unlocked players. Win to unlock All-Stars, lose
          to unlock scrubs.
        </p>
      </div>

      <div className="landing-game-modes">
        <div className="daily-draft-card landing-card landing-card--daily landing-card--mode">
          <p className="eyebrow">Daily Draft</p>
          <p className="daily-draft-card__meta daily-draft-card__meta--intro">
            Draft a five-player lineup with {DAILY_PICK_TIME_LIMIT_SECONDS} seconds
            per pick. Stats stay hidden. One attempt per mode each day.
          </p>
          <div className="daily-draft-card__modes">
            {renderDailyModeSection(landingBasicDaily)}
            {renderDailyModeSection(landingAdvancedDaily)}
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
              disabled={modesBlocked}
              onClick={() => void handleStart()}
            >
              {matchmakingMode === "classic"
                ? matchmakingLabel
                : `Play ${CLASSIC_HEAD_TO_HEAD_LABEL}`}
            </button>
            <button
              type="button"
              className="head-to-head-card__practice-button"
              disabled={modesBlocked}
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
              disabled={modesBlocked}
              onClick={() => void handleStart({ salaryCapMode: true })}
            >
              {matchmakingMode === "ranked"
                ? matchmakingLabel
                : `Play ${PRO_HEAD_TO_HEAD_LABEL}`}
            </button>
            <button
              type="button"
              className="ranked-cap-card__practice-button"
              disabled={modesBlocked}
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
                disabled={modesBlocked}
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
          Season Stats
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
