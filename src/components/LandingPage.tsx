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
import {
  formatDailyDraftModeLabel,
  formatDailyDraftProductName,
} from "../lib/dailyDraftMode";
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
import { ModeCardInfo } from "./ModeCardInfo";
import { TeamNameValidationModal } from "./TeamNameValidationModal";
import { RankedModeSummary } from "./RankedModeSummary";
import { GmIdentityBadge } from "./GmIdentityBadge";
import { AccountAuthPanel } from "./AccountAuthPanel";
import { RecordWithStreak } from "./RecordWithStreak";
import { type LandingHubTab } from "./LandingBottomNav";
import { HubShell } from "./HubShell";
import type { LandingContentTab } from "../lib/landingHub";
import { getOrCreatePlayerIdentity } from "../lib/playerIdentity";
import type { GhostMatchmakingMode } from "../lib/ghostMatchmaking";
import type { StartDraftOptions, StartMatchResult } from "../lib/match";
import { players as allPlayers } from "../data/players";
import {
  canPlayEventMatch,
  loadEventProfile,
  remainingEventMatches,
} from "../lib/eventProfile";
import {
  fetchEventLeaderboard,
  type EventLeaderboardEntry,
} from "../lib/eventLeaderboard";
import {
  EVENT_BADGE_THRESHOLDS,
  EVENT_SALARY_CAP,
  formatEventBadgeLabel,
  getCurrentWeeklyEvent,
} from "../lib/weeklyEvents";

const buildHeadToHeadModeDetails = (
  baseDetails: string[],
  unlockedCount: number,
) => [
  ...baseDetails,
  `Your draft pool has ${unlockedCount} unlocked players.`,
  "Win to unlock All-Stars, lose to unlock Scrubs.",
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
  onViewTierList: () => void;
  onViewGmStats: () => void;
  onViewAchievements: () => void;
  onViewLeaderboard: () => void;
  onViewPrivacy: () => void;
  onViewTerms: () => void;
  onViewBetaNotes: () => void;
  hubTab: LandingContentTab;
  onHubTabChange: (tab: LandingContentTab) => void;
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
  onViewTierList,
  onViewGmStats,
  onViewAchievements,
  onViewLeaderboard,
  onViewPrivacy,
  onViewTerms,
  onViewBetaNotes,
  hubTab,
  onHubTabChange,
}: LandingPageProps) {
  const [name, setName] = useState(() => loadTeamProfile()?.name ?? "");
  const [error, setError] = useState("");
  const [showTeamNameModal, setShowTeamNameModal] = useState(false);
  const [teamNameModalMessage, setTeamNameModalMessage] = useState("");
  const [eventLeaderboard, setEventLeaderboard] = useState<
    EventLeaderboardEntry[]
  >([]);
  const [eventLeaderboardLoading, setEventLeaderboardLoading] = useState(false);
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
          "Banner matchmaking pairs similar front offices.",
          "Monthly seasons reset the Top 500.",
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

  const weeklyEvent = useMemo(
    () => getCurrentWeeklyEvent(allPlayers),
    [],
  );
  const eventProfile = weeklyEvent
    ? loadEventProfile(weeklyEvent.id)
    : null;
  const eventMatchesLeft = weeklyEvent
    ? remainingEventMatches(weeklyEvent.id)
    : 0;
  const eventPlayable = weeklyEvent
    ? canPlayEventMatch(weeklyEvent.id)
    : false;

  useEffect(() => {
    if (hubTab !== "events" || !weeklyEvent) {
      return;
    }

    let cancelled = false;
    setEventLeaderboardLoading(true);

    void fetchEventLeaderboard(weeklyEvent.id).then((entries) => {
      if (!cancelled) {
        setEventLeaderboard(entries);
        setEventLeaderboardLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hubTab, weeklyEvent]);

  const handleStart = async (options?: StartDraftOptions) => {
    if (collection.pendingUnlock || isMatchmaking) {
      if (collection.pendingUnlock) {
        setShowUnlockModal(true);
      }
      return;
    }

    // Daily Draft only uses a name for results labeling — reuse a saved
    // profile when present, otherwise a local default (no team-name gate).
    const team = options?.isDailyDraft
      ? (loadTeamProfile() ?? ({ name: "Daily Draft" } satisfies TeamProfile))
      : promptForValidTeamProfile();

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

      if (options?.eventId && !canPlayEventMatch(options.eventId)) {
        setError(
          "You've used all 30 entries for this week's event. Check back next week.",
        );
        return;
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

  const renderDailyModeCard = (snapshot: LandingDailyDraftSnapshot) => {
    const mode = snapshot.setup.mode;
    const dailyCompleted = Boolean(snapshot.entry);
    const playStreak = getDailyDraftPlayStreak(mode, getDailyDateKey());

    return (
      <section
        key={mode}
        className="daily-draft-card landing-card landing-card--daily landing-card--mode"
        aria-labelledby={`daily-draft-${mode}-title`}
      >
        <div className="mode-card__header">
          <p className="eyebrow" id={`daily-draft-${mode}-title`}>
            {formatDailyDraftProductName(mode)}
          </p>
        </div>
        <p className="daily-draft-card__description">
          {mode === "advanced"
            ? "Per-minute and rate stats."
            : "Season per-game stats."}
        </p>
        <h3 className="daily-draft-card__challenge-title">
          {snapshot.goal.title}
        </h3>
        <p className="daily-draft-card__challenge-copy">
          {snapshot.goal.description}
        </p>
        <div className="landing-mode-card__record-block">
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
          <p className="landing-mode-card__record-meta">
            {playStreak.current > 0
              ? formatDailyDraftPlayStreak(playStreak)
              : "Play today to start a streak"}
          </p>
        </div>
        <div className="daily-draft-card__actions">
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
            disabled={!onViewYesterdayBestDailyLineup || modesBlocked}
            onClick={() => void handleYesterdayBestAction(mode)}
          >
            Yesterday&apos;s best
          </button>
        </div>
      </section>
    );
  };

  const handleHubSelect = (tab: LandingHubTab) => {
    if (tab === "standings") {
      onViewLeaderboard();
      return;
    }

    if (tab === "tiers") {
      onViewTierList();
      return;
    }

    onHubTabChange(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAccountTab = () => {
    onHubTabChange("account");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderTeamNameField = () => (
    <div
      ref={teamFormRef}
      className="landing-team-form landing-card landing-card--form landing-team-form--compact"
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
      {profanityWarning || error || startMatchError ? (
        <p className="form-error" role="alert">
          {profanityWarning || error || startMatchError}
        </p>
      ) : null}
    </div>
  );

  const hubTitle =
    hubTab === "play"
      ? "Head to Head"
      : hubTab === "daily"
        ? "Daily Draft"
        : hubTab === "events"
          ? "Events"
          : hubTab === "roster"
            ? "Roster"
            : "Account";

  const hubLede =
    hubTab === "play"
      ? "Play live against a real opponent. Pick Casual or Pro."
      : hubTab === "daily"
        ? `Draft five with stats hidden. ${DAILY_PICK_TIME_LIMIT_SECONDS} seconds per pick. One attempt per mode each day.`
        : hubTab === "events"
          ? "Weekly live head-to-head with a shared draft board, restricted pool, and $100M cap. Waits until a live opponent joins."
          : hubTab === "roster"
            ? "Browse unlocked players and season stats."
            : "Sign in to keep your progress, or open GM stats and badges.";

  return (
    <HubShell
      activeTab={hubTab}
      onSelectTab={handleHubSelect}
      onAccountClick={openAccountTab}
    >
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

      <div className="landing-hub__top">
        <h1 className="landing-hub__title">{hubTitle}</h1>
        <p className="landing__lede landing-hub__lede">{hubLede}</p>
      </div>

      <div className="landing-hub__content">
        {hubTab === "play" ? (
          <>
            {renderTeamNameField()}
            <div className="landing-game-modes">
              <div className="head-to-head-card landing-card landing-card--mode">
                <div className="mode-card__header">
                  <p className="eyebrow">{CLASSIC_HEAD_TO_HEAD_LABEL}</p>
                  <ModeCardInfo details={classicModeDetails} variant="corner" />
                </div>
                <p className="head-to-head-card__description">
                  Draft a five-player lineup under a $
                  {(CLASSIC_HEAD_TO_HEAD_SALARY_CAP / 1_000_000).toFixed(0)}M
                  cap with {CLASSIC_PICK_TIME_LIMIT_SECONDS} seconds per pick.
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
                  Practice uses the same $
                  {(CLASSIC_HEAD_TO_HEAD_SALARY_CAP / 1_000_000).toFixed(0)}M
                  cap and bot opponent. Streaks and badges do not change.
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
                  Practice uses the same $
                  {(RANKED_SALARY_CAP / 1_000_000).toFixed(0)}M cap and bot
                  opponent. Banners, streaks, and badges do not change.
                </p>
              </div>

              <div className="all-time-card landing-card landing-card--mode">
                <p className="eyebrow">{ALL_TIME_LABEL}</p>
                <h2 className="all-time-card__title">Peak seasons &amp; legends</h2>
                <p className="all-time-card__description">
                  Draft a five-player lineup with {PICK_TIME_LIMIT_SECONDS}{" "}
                  seconds per pick from active stars at peak seasons plus
                  legendary All-Stars from every era.
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
          </>
        ) : null}

        {hubTab === "daily" ? (
          <>
            {error || startMatchError ? (
              <p className="form-error" role="alert">
                {error || startMatchError}
              </p>
            ) : null}
            <div className="landing-game-modes landing-game-modes--daily-split">
              {renderDailyModeCard(landingBasicDaily)}
              {renderDailyModeCard(landingAdvancedDaily)}
            </div>
          </>
        ) : null}

        {hubTab === "events" ? (
          <>
            {renderTeamNameField()}
            {weeklyEvent && eventProfile ? (
              <div className="landing-game-modes">
                <div className="event-card landing-card landing-card--mode">
                  <div className="mode-card__header">
                    <p className="eyebrow">{weeklyEvent.weekLabel}</p>
                  </div>
                  <h2 className="event-card__title">{weeklyEvent.title}</h2>
                  <p className="event-card__description">
                    {weeklyEvent.description} Both GMs draft the same five
                    position/division slots under a $
                    {(EVENT_SALARY_CAP / 1_000_000).toFixed(0)}M cap.{" "}
                    {PICK_TIME_LIMIT_SECONDS} seconds per pick. 30 entries
                    available max.
                  </p>
                  <ul className="event-card__rules">
                    <li>
                      Pool: <strong>{weeklyEvent.restrictionLabel}</strong>
                    </li>
                    <li>
                      Badges: Bronze {EVENT_BADGE_THRESHOLDS.bronze}+ wins ·
                      Silver {EVENT_BADGE_THRESHOLDS.silver}+ · Gold{" "}
                      {EVENT_BADGE_THRESHOLDS.gold}+
                    </li>
                    <li>
                      Competitor badge at {EVENT_BADGE_THRESHOLDS.participation}+
                      matches played
                    </li>
                  </ul>
                  <div className="event-card__record">
                    <RecordWithStreak
                      record={{
                        playerId: playerIdentity.playerId,
                        wins: eventProfile.wins,
                        losses: eventProfile.losses,
                        ties: eventProfile.ties,
                        winStreak: eventProfile.winStreak,
                        lossStreak: eventProfile.lossStreak,
                      }}
                      align="right"
                      className="ranked-mode-summary__record"
                    />
                    <p className="event-card__matches">
                      {eventMatchesLeft} of {weeklyEvent.maxMatches} matches left
                    </p>
                  </div>
                  <div className="event-card__badges" aria-label="Event badges">
                    {(
                      ["participation", "bronze", "silver", "gold"] as const
                    ).map((tier) => {
                      const earned = eventProfile.badges.includes(tier);
                      return (
                        <span
                          key={tier}
                          className={`event-badge event-badge--${tier}${
                            earned ? " event-badge--earned" : ""
                          }`}
                        >
                          {formatEventBadgeLabel(tier)}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mode-card__actions">
                    <button
                      type="button"
                      className="landing__primary-button"
                      disabled={modesBlocked || !eventPlayable}
                      onClick={() =>
                        void handleStart({
                          eventId: weeklyEvent.id,
                          eventRestriction: weeklyEvent.restriction,
                          salaryCapMode: true,
                          salaryCapLimit: weeklyEvent.salaryCapLimit,
                          sharedDraftSlots: weeklyEvent.sharedSlots,
                        })
                      }
                    >
                      {matchmakingMode === "event"
                        ? matchmakingLabel
                        : eventPlayable
                          ? "Play weekly event"
                          : "Event matches used up"}
                    </button>
                  </div>
                </div>

                <div className="event-leaderboard landing-card">
                  <div className="mode-card__header">
                    <p className="eyebrow">Event standings</p>
                  </div>
                  <h2 className="event-card__title">Top 100 wins</h2>
                  <p className="event-card__description">
                    Ranked by wins this week. Ties break by fewer losses.
                  </p>
                  {eventLeaderboardLoading ? (
                    <p className="event-leaderboard__empty">Loading standings…</p>
                  ) : eventLeaderboard.length === 0 ? (
                    <p className="event-leaderboard__empty">
                      No event results yet. Be the first on the board.
                    </p>
                  ) : (
                    <ol className="event-leaderboard__list">
                      {eventLeaderboard.map((entry) => (
                        <li
                          key={`${entry.playerId}-${entry.rank}`}
                          className={`event-leaderboard__row${
                            entry.isViewer
                              ? " event-leaderboard__row--you"
                              : ""
                          }`}
                        >
                          <span className="event-leaderboard__rank">
                            #{entry.rank}
                          </span>
                          <span className="event-leaderboard__team">
                            {entry.teamName}
                            {entry.isViewer ? " (you)" : ""}
                          </span>
                          <span className="event-leaderboard__wins">
                            {entry.wins}-{entry.losses}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            ) : (
              <p className="form-error" role="alert">
                This week&apos;s event is unavailable. Check back soon.
              </p>
            )}
          </>
        ) : null}

        {hubTab === "roster" ? (
          <>
            <div className="landing-profile-strip landing-card landing-card--profile">
              <div className="landing-profile-strip__header">
                <p className="landing-profile-strip__title">Your collection</p>
                <p className="landing-profile-strip__hint">
                  Tap a category to view unlocked players
                </p>
              </div>
              <div
                className="landing-profile-strip__stats"
                aria-label="Player collection by category"
              >
                <button
                  type="button"
                  className="landing-profile-strip__stat landing-profile-strip__stat--btn"
                  onClick={() => setCollectionTier("all-star")}
                  aria-label={`View unlocked All-Stars, ${collectionProgress.unlocked} of ${collectionProgress.total}`}
                >
                  <span className="landing-profile-strip__label">All-Stars</span>
                  <strong>
                    {collectionProgress.unlocked}/{collectionProgress.total}
                  </strong>
                  <span
                    className="landing-profile-strip__action"
                    aria-hidden="true"
                  >
                    View ›
                  </span>
                </button>
                <button
                  type="button"
                  className="landing-profile-strip__stat landing-profile-strip__stat--btn"
                  onClick={() => setCollectionTier("superstar")}
                  aria-label={`View unlocked Superstars, ${collectionProgress.superstarUnlocked} of ${collectionProgress.superstarTotal}`}
                >
                  <span className="landing-profile-strip__label">
                    Superstars
                  </span>
                  <strong>
                    {collectionProgress.superstarUnlocked}/
                    {collectionProgress.superstarTotal}
                  </strong>
                  <span
                    className="landing-profile-strip__action"
                    aria-hidden="true"
                  >
                    View ›
                  </span>
                </button>
                <button
                  type="button"
                  className="landing-profile-strip__stat landing-profile-strip__stat--btn"
                  onClick={() => setCollectionTier("scrub")}
                  aria-label={`View unlocked Scrubs, ${collectionProgress.unlockedScrubs} of ${collectionProgress.scrubPool}`}
                >
                  <span className="landing-profile-strip__label">Scrubs</span>
                  <strong>
                    {collectionProgress.unlockedScrubs}/
                    {collectionProgress.scrubPool}
                  </strong>
                  <span
                    className="landing-profile-strip__action"
                    aria-hidden="true"
                  >
                    View ›
                  </span>
                </button>
                <button
                  type="button"
                  className="landing-profile-strip__stat landing-profile-strip__stat--btn"
                  onClick={() => setCollectionTier("super-scrub")}
                  aria-label={`View unlocked Super Scrubs, ${collectionProgress.unlockedSuperScrubs} of ${collectionProgress.superScrubPool}`}
                >
                  <span className="landing-profile-strip__label">
                    Super Scrubs
                  </span>
                  <strong>
                    {collectionProgress.unlockedSuperScrubs}/
                    {collectionProgress.superScrubPool}
                  </strong>
                  <span
                    className="landing-profile-strip__action"
                    aria-hidden="true"
                  >
                    View ›
                  </span>
                </button>
                <button
                  type="button"
                  className="landing-profile-strip__stat landing-profile-strip__stat--btn"
                  onClick={() => setCollectionTier("recent-all-star")}
                  aria-label={`View unlocked Recent All-Stars, ${collectionProgress.recentUnlocked} of ${collectionProgress.recentTotal}`}
                >
                  <span className="landing-profile-strip__label">
                    Recent All-Stars
                  </span>
                  <strong>
                    {collectionProgress.recentUnlocked}/
                    {collectionProgress.recentTotal}
                  </strong>
                  <span
                    className="landing-profile-strip__action"
                    aria-hidden="true"
                  >
                    View ›
                  </span>
                </button>
              </div>
              <p className="landing-profile-strip__meta">
                Win to unlock All-Stars, lose to unlock Scrubs.
              </p>
            </div>

            <div className="landing-hub__links">
              <button
                type="button"
                className="landing-hub__link-button"
                onClick={onViewStats}
              >
                Season Stats
              </button>
            </div>
          </>
        ) : null}

        {hubTab === "account" ? (
          <>
            <div className="landing-team-form landing-card landing-card--form">
              <p className="landing-team-form__identity">
                <span className="landing-team-form__identity-label">
                  GM code
                </span>
                <GmIdentityBadge
                  publicTag={playerIdentity.publicTag}
                  playerId={playerIdentity.playerId}
                  showName={false}
                />
                <span className="landing-team-form__identity-note">
                  Shown on leaderboards. Tap your code to verify or copy your
                  full ID.
                </span>
              </p>

              <AccountAuthPanel
                playerId={playerIdentity.playerId}
                onViewPrivacy={onViewPrivacy}
                onViewTerms={onViewTerms}
              />
            </div>

            <div className="landing-hub__links">
              <button
                type="button"
                className="landing-hub__link-button"
                onClick={onViewGmStats}
              >
                GM stats
              </button>
              <button
                type="button"
                className="landing-hub__link-button"
                onClick={onViewAchievements}
              >
                Badges
              </button>
              <button
                type="button"
                className="landing-hub__link-button"
                onClick={onViewBetaNotes}
              >
                Beta notes
              </button>
            </div>

            <p className="landing-disclaimer">
              Draft Day GM is an independent project. It is not affiliated with,
              endorsed by, or connected to the NBA, its teams, players, or
              partners. Team names, player names, and statistics are used for
              informational purposes only.
            </p>

            <nav className="landing-footer" aria-label="Legal">
              <button
                type="button"
                className="landing-footer__link"
                onClick={onViewBetaNotes}
              >
                Beta notes
              </button>
              <span className="landing-footer__sep" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                className="landing-footer__link"
                onClick={onViewPrivacy}
              >
                Privacy Policy
              </button>
              <span className="landing-footer__sep" aria-hidden="true">
                ·
              </span>
              <button
                type="button"
                className="landing-footer__link"
                onClick={onViewTerms}
              >
                Terms of Use
              </button>
            </nav>

            <p className="landing-credit">Powered by BALLACADEMY</p>
          </>
        ) : null}
      </div>
    </HubShell>
  );
}
