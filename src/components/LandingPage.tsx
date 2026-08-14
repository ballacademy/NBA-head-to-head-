import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  completeUnlock,
  dismissPendingUnlock,
  getCollectionProgress,
  getCollectionTierTotal,
  getUnlockedPlayersByTier,
  type CollectionTier,
  type PlayerCollection,
} from "../lib/playerCollection";
import { CollectionTierModal } from "./CollectionTierModal";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import { WeeklyGmRecapCard } from "./WeeklyGmRecapCard";
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
import { isAllTimeModePlayable, ALL_TIME_WIN_THRESHOLD, getAllTimeWinsRemaining, areLegendsUnlocked } from "../lib/eraUnlocks";
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
import { PrivateMatchModal } from "./PrivateMatchModal";
import { ModeCardInfo } from "./ModeCardInfo";
import { TeamNameValidationModal } from "./TeamNameValidationModal";
import { RankedModeSummary } from "./RankedModeSummary";
import { GmIdentityBadge } from "./GmIdentityBadge";
import { AccountAuthPanel } from "./AccountAuthPanel";
import { AccountRequiredNote } from "./AccountRequiredNote";
import { ACCOUNT_REQUIRED_EVENT_STANDINGS_MESSAGE } from "../lib/accountGate";
import { HubOnboardingOverlay } from "./HubOnboardingOverlay";
import { InlineAlert } from "./InlineAlert";
import { RecordWithStreak } from "./RecordWithStreak";
import { type LandingHubTab } from "./LandingBottomNav";
import { HubFeatureReturnButton } from "./HubFeatureReturnButton";
import { HubShell } from "./HubShell";
import {
  loadLandingPlaySection,
  saveLandingPlaySection,
  syncLandingDeepLinkUrl,
  type LandingContentTab,
  type LandingPlaySection,
} from "../lib/landingHub";
import { trackProductEvent } from "../lib/productAnalytics";
import {
  hasSeenHubGuide,
  markHubGuideSeen,
} from "../lib/hubOnboarding";
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
import { ensureClassicProfile } from "../lib/classicProfile";
import { ensureCurrentRankedSeason } from "../lib/rankedProfile";
import { isHeadToHeadLineupLocked } from "../lib/matchmaking";
import { loadPendingLineupState } from "../lib/pendingLineup";
import { LIVE_OPPONENT_ONLY_MIN_ELO, RATING_LABEL } from "../lib/rankedElo";
import { MODE_COPY } from "../lib/modeCopy";

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
  liveRestoreNotice?: string | null;
  onRetryLiveRestore?: () => void;
  onDismissLiveRestore?: () => void;
  /** Host private room code once created (dismisses create modal for overlay). */
  privateRoomCode?: string | null;
  /** Open the private-match modal after rematch from results. */
  pendingPrivateMatchMode?: "classic" | "ranked" | null;
  onPendingPrivateMatchModeConsumed?: () => void;
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
  onPrefetchHubTab?: (tab: LandingHubTab) => void;
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
  liveRestoreNotice = null,
  onRetryLiveRestore,
  onDismissLiveRestore,
  privateRoomCode = null,
  pendingPrivateMatchMode = null,
  onPendingPrivateMatchModeConsumed,
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
  onPrefetchHubTab,
}: LandingPageProps) {
  const [name, setName] = useState(() => loadTeamProfile()?.name ?? "");
  const [error, setError] = useState("");
  const [showTeamNameModal, setShowTeamNameModal] = useState(false);
  const [teamNameModalMessage, setTeamNameModalMessage] = useState("");
  const [eventLeaderboard, setEventLeaderboard] = useState<
    EventLeaderboardEntry[]
  >([]);
  const [eventLeaderboardLoading, setEventLeaderboardLoading] = useState(false);
  const [eventLeaderboardFailed, setEventLeaderboardFailed] = useState(false);
  const [eventLeaderboardRetryTick, setEventLeaderboardRetryTick] = useState(0);
  const [showUnlockModal, setShowUnlockModal] = useState(
    () => Boolean(collection.pendingUnlock),
  );
  const [collectionTier, setCollectionTier] = useState<CollectionTier | null>(
    null,
  );
  const [privateMatchMode, setPrivateMatchMode] = useState<
    null | "classic" | "ranked"
  >(null);
  const [playSection, setPlaySection] = useState<LandingPlaySection>(() =>
    loadLandingPlaySection(),
  );
  const [showHubGuide, setShowHubGuide] = useState(false);
  const [queuedLineupLock, setQueuedLineupLock] = useState(() => {
    const playerId = getOrCreatePlayerIdentity().playerId;
    return {
      classic: Boolean(loadPendingLineupState("classic", playerId)),
      ranked: Boolean(loadPendingLineupState("ranked", playerId)),
    };
  });
  const closePrivateMatchModal = useCallback(() => {
    setPrivateMatchMode(null);
  }, []);

  const updatePlaySection = useCallback((section: LandingPlaySection) => {
    setPlaySection(section);
    saveLandingPlaySection(section);
    syncLandingDeepLinkUrl({ hub: "play", play: section });
    if (section !== "chooser") {
      trackProductEvent("play_mode_open", { section });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (
      hubTab === "play" &&
      playSection === "chooser" &&
      !hasSeenHubGuide()
    ) {
      setShowHubGuide(true);
    }
  }, [hubTab, playSection]);

  useEffect(() => {
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active.matches("button, [href], input, select, textarea") &&
      active.closest(".landing--hub, .hub-feature")
    ) {
      active.blur();
    }
  }, [hubTab, playSection]);

  const dismissHubGuide = useCallback(() => {
    markHubGuideSeen();
    setShowHubGuide(false);
  }, []);

  const handleHubGuideIntent = useCallback(
    (intent: { playSection: LandingPlaySection; h2hMode?: "classic" | "ranked" }) => {
      if (hubTab !== "play") {
        onHubTabChange("play");
      }
      updatePlaySection(intent.playSection);
    },
    [hubTab, onHubTabChange, updatePlaySection],
  );

  useEffect(() => {
    if (!pendingPrivateMatchMode) {
      return;
    }
    setPrivateMatchMode(pendingPrivateMatchMode);
    onPendingPrivateMatchModeConsumed?.();
  }, [pendingPrivateMatchMode, onPendingPrivateMatchModeConsumed]);

  const teamFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (collection.pendingUnlock) {
      setShowUnlockModal(true);
    }
  }, [collection.pendingUnlock]);

  const collectionProgress = getCollectionProgress(collection);
  const allTimePlayable = isAllTimeModePlayable();
  const allTimeLegendsUnlocked = areLegendsUnlocked(modeRecords.allTime);
  const allTimeWinsRemaining = getAllTimeWinsRemaining(modeRecords.allTime);
  const isMatchmaking = isMatchmakingSearchActive || matchmakingMode != null;
  const teamValidation = useMemo(() => validateTeamProfile(name), [name]);
  const modesBlocked = isMatchmaking || Boolean(collection.pendingUnlock);
  const classicPlayBlocked = modesBlocked || queuedLineupLock.classic;
  const rankedPlayBlocked = modesBlocked || queuedLineupLock.ranked;
  const anyQueuedLineupLock =
    queuedLineupLock.classic || queuedLineupLock.ranked;
  const profanityWarning =
    teamValidation.ok === false && teamValidation.error === "profanity"
      ? getTeamProfileValidationMessage("profanity")
      : null;
  const classicModeDetails = useMemo(
    () =>
      buildHeadToHeadModeDetails(
        [
          `$${(CLASSIC_HEAD_TO_HEAD_SALARY_CAP / 1_000_000).toFixed(0)}M salary cap.`,
          "Banner / soft matchmaking pairs similar front offices.",
          "Casual banners track your Front Office.",
          "Practice vs a bot, or private match with a room code — neither changes streaks or badges.",
        ],
        collection.unlockedIds.length,
      ),
    [collection.unlockedIds.length],
  );
  const proModeDetails = useMemo(
    () =>
      buildHeadToHeadModeDetails(
        [
          `$${(RANKED_SALARY_CAP / 1_000_000).toFixed(0)}M salary cap.`,
          "Elo / ranked matchmaking pairs competitive Front Offices.",
          "Monthly seasons crown the Top 500.",
          "Practice vs a bot, or private match with a room code — neither changes streaks or badges.",
        ],
        collection.unlockedIds.length,
      ),
    [collection.unlockedIds.length],
  );
  const playerIdentity = useMemo(() => getOrCreatePlayerIdentity(), []);

  useEffect(() => {
    let cancelled = false;
    const playerId = playerIdentity.playerId;

    void (async () => {
      const [classicLocked, rankedLocked] = await Promise.all([
        isHeadToHeadLineupLocked({
          mode: "classic",
          playerId,
          playerElo: ensureClassicProfile().elo,
        }),
        isHeadToHeadLineupLocked({
          mode: "ranked",
          playerId,
          playerElo: ensureCurrentRankedSeason().elo,
        }),
      ]);

      if (!cancelled) {
        setQueuedLineupLock({
          classic: classicLocked,
          ranked: rankedLocked,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerIdentity.playerId, hubTab, playSection, startMatchError]);

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

  const handleUnlockDismiss = () => {
    const next = dismissPendingUnlock(collection);
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
    if (hubTab !== "play" || playSection !== "events" || !weeklyEvent) {
      return;
    }

    let cancelled = false;
    setEventLeaderboardLoading(true);
    setEventLeaderboardFailed(false);

    void fetchEventLeaderboard(weeklyEvent.id).then((entries) => {
      if (!cancelled) {
        if (entries == null) {
          setEventLeaderboard([]);
          setEventLeaderboardFailed(true);
        } else {
          setEventLeaderboard(entries);
          setEventLeaderboardFailed(false);
        }
        setEventLeaderboardLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hubTab, playSection, weeklyEvent, eventLeaderboardRetryTick]);

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
          return result;
        }
      }

      if (options?.eventId && !canPlayEventMatch(options.eventId)) {
        setError(
          "You've used all 30 entries for this week's event. Check back next week.",
        );
        return result;
      }

      // Prefer the specific error from App (private room / queue / account).
      if (!startMatchError) {
        setError("Couldn't start this draft. Refresh the page and try again.");
      }
    }

    return result;
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
    const statusParts = [
      snapshot.entry
        ? snapshot.entry.formattedResult
        : "Not played today",
      snapshot.entry
        ? snapshot.percentileLabel
        : null,
      playStreak.current > 0
        ? formatDailyDraftPlayStreak(playStreak)
        : snapshot.entry
          ? null
          : "Start a streak",
    ].filter((part): part is string => Boolean(part));

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
        <p className="daily-draft-card__status">{statusParts.join(" · ")}</p>
        <div className="daily-draft-card__actions">
          <button
            type="button"
            className={`daily-draft-card__button${dailyCompleted ? " daily-draft-card__button--completed" : ""}`}
            disabled={modesBlocked || (dailyCompleted && !snapshot.canViewLineup)}
            onClick={() => void handleDailyAction(mode)}
          >
            {dailyCompleted
              ? `View ${formatDailyDraftModeLabel(mode)} lineup`
              : `Play ${formatDailyDraftModeLabel(mode)}`}
          </button>
          <button
            type="button"
            className="daily-draft-card__text-link"
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

    if (tab === "community") {
      onViewTierList();
      return;
    }

    // Re-tapping Play while inside a mode returns to the Play chooser.
    if (tab === "play" && hubTab === "play" && playSection !== "chooser") {
      updatePlaySection("chooser");
      return;
    }

    onHubTabChange(tab);
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
      {liveRestoreNotice ? (
        <InlineAlert
          message={
            <>
              {liveRestoreNotice}
              {onDismissLiveRestore ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="daily-draft-results__sync-retry"
                    onClick={onDismissLiveRestore}
                  >
                    Dismiss
                  </button>
                </>
              ) : null}
            </>
          }
          action={
            onRetryLiveRestore
              ? {
                  label: "Retry reconnect",
                  onClick: onRetryLiveRestore,
                }
              : undefined
          }
        />
      ) : null}
      {profanityWarning || error || startMatchError ? (
        <InlineAlert message={profanityWarning || error || startMatchError} />
      ) : null}
    </div>
  );

  const hubTitle =
    hubTab === "play"
      ? playSection === "daily"
        ? "Daily Draft"
        : playSection === "events"
          ? "Events"
          : playSection === "headToHead"
            ? "Head to Head"
            : "Play"
      : hubTab === "roster"
        ? "Roster"
        : "Account";

  const hubLede =
    hubTab === "play"
      ? playSection === "daily"
        ? `Hidden stats. ${DAILY_PICK_TIME_LIMIT_SECONDS}s picks. One try per mode daily.`
        : playSection === "events"
          ? "Weekly live H2H. Shared board. $100M cap."
          : playSection === "headToHead"
            ? "Live matchups. Casual or Pro."
            : "Pick a mode to draft and compete."
      : hubTab === "roster"
        ? "Collection, badges, and season stats."
        : "Sign in, GM stats, and settings.";

  const playModeBack = (
    <HubFeatureReturnButton
      label="Play modes"
      onBack={() => updatePlaySection("chooser")}
    />
  );

  return (
    <HubShell
      activeTab={hubTab}
      onSelectTab={handleHubSelect}
      onPrefetchTab={onPrefetchHubTab}
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
          onDismiss={handleUnlockDismiss}
          variant="compact"
        />
      ) : null}

      {privateMatchMode ? (
        <PrivateMatchModal
          salaryCapMode={privateMatchMode === "ranked"}
          startMatchError={startMatchError}
          privateRoomCode={privateRoomCode}
          onClose={closePrivateMatchModal}
          onStart={handleStart}
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

      {showHubGuide ? (
        <HubOnboardingOverlay
          onDismiss={dismissHubGuide}
          onChooseIntent={handleHubGuideIntent}
        />
      ) : null}

      <div className="landing-hub__top">
        <h1
          className={`landing-hub__title${
            hubTab === "roster" ? " landing-hub__title--roster" : ""
          }`}
        >
          {hubTitle}
        </h1>
        <p className="landing__lede landing-hub__lede">{hubLede}</p>
      </div>

      <div className="landing-hub__content">
        {hubTab === "play" && playSection === "chooser" ? (
          <div className="play-hub-chooser" role="list">
            <button
              type="button"
              className="play-hub-chooser__option hub-accent hub-accent--daily"
              role="listitem"
              onClick={() => updatePlaySection("daily")}
            >
              <span className="play-hub-chooser__copy">
                <span className="play-hub-chooser__label">Daily Draft</span>
                <span className="play-hub-chooser__meta">
                  Hidden stats · one scored try per mode each day
                </span>
              </span>
              <span className="play-hub-chooser__chevron" aria-hidden="true">
                ›
              </span>
            </button>
            <button
              type="button"
              className="play-hub-chooser__option hub-accent hub-accent--h2h"
              role="listitem"
              onClick={() => updatePlaySection("headToHead")}
            >
              <span className="play-hub-chooser__copy">
                <span className="play-hub-chooser__label">Head to Head</span>
                <span className="play-hub-chooser__meta">
                  Casual or Pro live matchups, practice, and private games
                </span>
              </span>
              <span className="play-hub-chooser__chevron" aria-hidden="true">
                ›
              </span>
            </button>
            <button
              type="button"
              className="play-hub-chooser__option hub-accent hub-accent--event"
              role="listitem"
              onClick={() => updatePlaySection("events")}
            >
              <span className="play-hub-chooser__copy">
                <span className="play-hub-chooser__label">Events</span>
                <span className="play-hub-chooser__meta">
                  Weekly live H2H with a shared board and $100M cap
                </span>
              </span>
              <span className="play-hub-chooser__chevron" aria-hidden="true">
                ›
              </span>
            </button>
            <button
              type="button"
              className="play-hub-chooser__guide"
              onClick={() => setShowHubGuide(true)}
            >
              What should I play?
            </button>
          </div>
        ) : null}

        {hubTab === "play" && playSection === "headToHead" ? (
          <>
            {playModeBack}
            {renderTeamNameField()}
            {anyQueuedLineupLock ? (
              <p className="queue-lock-note" role="status">
                Queued lineup waiting for a live opponent at{" "}
                {LIVE_OPPONENT_ONLY_MIN_ELO}+ {RATING_LABEL}
                {queuedLineupLock.classic && queuedLineupLock.ranked
                  ? " (Casual and Pro)"
                  : queuedLineupLock.classic
                    ? " (Casual)"
                    : " (Pro)"}
                . Live Play stays locked until that match finishes — Practice and
                Private still work.
              </p>
            ) : null}
            <div className="landing-game-modes landing-game-modes--h2h">
              <div className="head-to-head-card landing-card landing-card--mode">
                <div className="mode-card__header">
                  <p className="eyebrow">{CLASSIC_HEAD_TO_HEAD_LABEL}</p>
                  <ModeCardInfo details={classicModeDetails} variant="corner" />
                </div>
                <p className="head-to-head-card__description">
                  {MODE_COPY.classicH2h.blurb} {CLASSIC_PICK_TIME_LIMIT_SECONDS}s
                  picks.
                </p>
                <ClassicModeSummary record={modeRecords.headToHead} />
                <div className="mode-card__actions mode-card__actions--split">
                  <button
                    type="button"
                    className="mode-card__cta mode-card__cta--primary"
                    disabled={classicPlayBlocked}
                    onClick={() => void handleStart()}
                  >
                    {matchmakingMode === "classic"
                      ? matchmakingLabel
                      : queuedLineupLock.classic
                        ? "Lineup queued"
                        : `Play ${CLASSIC_HEAD_TO_HEAD_LABEL}`}
                  </button>
                  <button
                    type="button"
                    className="mode-card__cta mode-card__cta--secondary"
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
                  <button
                    type="button"
                    className="mode-card__cta mode-card__cta--secondary"
                    disabled={modesBlocked}
                    onClick={() => setPrivateMatchMode("classic")}
                  >
                    Private
                  </button>
                </div>
              </div>

              <div className="ranked-cap-card landing-card landing-card--mode">
                <div className="mode-card__header">
                  <p className="eyebrow">{PRO_HEAD_TO_HEAD_LABEL}</p>
                  <ModeCardInfo details={proModeDetails} variant="corner" />
                </div>
                <p className="ranked-cap-card__description">
                  {MODE_COPY.proH2h.blurb} {PICK_TIME_LIMIT_SECONDS}s picks.
                </p>
                <RankedModeSummary record={modeRecords.ranked} />
                <div className="mode-card__actions mode-card__actions--split">
                  <button
                    type="button"
                    className="mode-card__cta mode-card__cta--primary"
                    disabled={rankedPlayBlocked}
                    onClick={() => void handleStart({ salaryCapMode: true })}
                  >
                    {matchmakingMode === "ranked"
                      ? matchmakingLabel
                      : queuedLineupLock.ranked
                        ? "Lineup queued"
                        : `Play ${PRO_HEAD_TO_HEAD_LABEL}`}
                  </button>
                  <button
                    type="button"
                    className="mode-card__cta mode-card__cta--secondary"
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
                  <button
                    type="button"
                    className="mode-card__cta mode-card__cta--secondary"
                    disabled={modesBlocked}
                    onClick={() => setPrivateMatchMode("ranked")}
                  >
                    Private
                  </button>
                </div>
              </div>

              {allTimePlayable ? (
                <div className="all-time-card landing-card landing-card--mode">
                  <p className="eyebrow">{ALL_TIME_LABEL}</p>
                  <h2 className="all-time-card__title">
                    Peak seasons &amp; legends
                  </h2>
                  <p className="all-time-card__description">
                    Draft a five with {PICK_TIME_LIMIT_SECONDS} seconds per pick
                    from active stars at their peak seasons
                    {allTimeLegendsUnlocked
                      ? ", plus legendary All-Stars from every era."
                      : `. Unlock era legends after ${ALL_TIME_WIN_THRESHOLD} All-Time wins (${allTimeWinsRemaining} to go).`}
                  </p>
                  <MatchModeRecord record={modeRecords.allTime} />
                  <button
                    type="button"
                    className="all-time-card__button"
                    disabled={modesBlocked}
                    onClick={() => void handleStart({ allTimeMode: true })}
                  >
                    Play All-Time Draft
                  </button>
                </div>
              ) : (
                <div
                  className="all-time-card all-time-card--teaser landing-card landing-card--mode"
                  aria-label={`${ALL_TIME_LABEL} unlocks with ${ALL_TIME_WIN_THRESHOLD} All-Time wins for era legends`}
                >
                  <p className="eyebrow">{ALL_TIME_LABEL}</p>
                  <p className="all-time-card__teaser-copy">
                    Peak seasons live — era legends unlock at{" "}
                    {ALL_TIME_WIN_THRESHOLD} All-Time wins
                  </p>
                </div>
              )}
            </div>
          </>
        ) : null}

        {hubTab === "play" && playSection === "daily" ? (
          <>
            {playModeBack}
            {error || startMatchError ? (
              <InlineAlert message={error || startMatchError} />
            ) : null}
            <div className="landing-game-modes landing-game-modes--daily-split">
              {renderDailyModeCard(landingBasicDaily)}
              {renderDailyModeCard(landingAdvancedDaily)}
            </div>
          </>
        ) : null}

        {hubTab === "play" && playSection === "events" ? (
          <>
            {playModeBack}
            {renderTeamNameField()}
            {weeklyEvent && eventProfile ? (
              <div className="landing-game-modes">
                <div className="event-card landing-card landing-card--mode">
                  <div className="mode-card__header">
                    <p className="eyebrow">{weeklyEvent.weekLabel}</p>
                  </div>
                  <h2 className="event-card__title">{weeklyEvent.title}</h2>
                  <p className="event-card__description">
                    <strong>{weeklyEvent.restrictionLabel}</strong>
                    {" · "}${(EVENT_SALARY_CAP / 1_000_000).toFixed(0)}M ·{" "}
                    {eventMatchesLeft}/{weeklyEvent.maxMatches} left
                  </p>
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
                  </div>
                  <div className="mode-card__actions">
                    <button
                      type="button"
                      className="mode-card__cta mode-card__cta--primary"
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
                  <details className="event-card__details">
                    <summary>Badges &amp; rules</summary>
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
                    <ul className="event-card__rules">
                      <li>
                        Bronze {EVENT_BADGE_THRESHOLDS.bronze}+ wins · Silver{" "}
                        {EVENT_BADGE_THRESHOLDS.silver}+ · Gold{" "}
                        {EVENT_BADGE_THRESHOLDS.gold}+
                      </li>
                      <li>
                        Competitor badge at{" "}
                        {EVENT_BADGE_THRESHOLDS.participation}+ matches played
                      </li>
                    </ul>
                  </details>
                </div>

                <details className="event-leaderboard landing-card">
                  <summary className="event-leaderboard__summary">
                    <span className="eyebrow">Event standings</span>
                    <span className="event-leaderboard__summary-title">
                      Top 100 wins
                    </span>
                  </summary>
                  <p className="event-card__description">
                    Ranked by wins this week. Ties break by fewer losses.
                  </p>
                  <AccountRequiredNote className="account-required-note--inline">
                    {ACCOUNT_REQUIRED_EVENT_STANDINGS_MESSAGE}
                  </AccountRequiredNote>
                  {eventLeaderboardLoading ? (
                    <p className="event-leaderboard__empty hub-empty" role="status">
                      Loading…
                    </p>
                  ) : eventLeaderboardFailed ? (
                    <InlineAlert
                      message="Couldn't load event standings."
                      action={{
                        label: "Retry",
                        onClick: () =>
                          setEventLeaderboardRetryTick((tick) => tick + 1),
                      }}
                    />
                  ) : eventLeaderboard.length === 0 ? (
                    <p className="event-leaderboard__empty hub-empty">
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
                </details>
              </div>
            ) : (
              <InlineAlert message="This week's event is unavailable. Check back soon." />
            )}
          </>
        ) : null}

        {hubTab === "roster" ? (
          <>
            <WeeklyGmRecapCard onViewGmStats={onViewGmStats} />
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
                  className={`landing-profile-strip__stat landing-profile-strip__stat--btn${
                    collectionTier === "all-star" ? " is-active" : ""
                  }`}
                  onClick={() => setCollectionTier("all-star")}
                  aria-pressed={collectionTier === "all-star"}
                  aria-label={`View unlocked All-Stars, ${collectionProgress.unlocked} of ${collectionProgress.total}`}
                >
                  <span className="landing-profile-strip__label">All-Stars</span>
                  <strong>
                    {collectionProgress.unlocked}/{collectionProgress.total}
                  </strong>
                </button>
                <button
                  type="button"
                  className={`landing-profile-strip__stat landing-profile-strip__stat--btn${
                    collectionTier === "superstar" ? " is-active" : ""
                  }`}
                  onClick={() => setCollectionTier("superstar")}
                  aria-pressed={collectionTier === "superstar"}
                  aria-label={`View unlocked Superstars, ${collectionProgress.superstarUnlocked} of ${collectionProgress.superstarTotal}`}
                >
                  <span className="landing-profile-strip__label">
                    Superstars
                  </span>
                  <strong>
                    {collectionProgress.superstarUnlocked}/
                    {collectionProgress.superstarTotal}
                  </strong>
                </button>
                <button
                  type="button"
                  className={`landing-profile-strip__stat landing-profile-strip__stat--btn${
                    collectionTier === "scrub" ? " is-active" : ""
                  }`}
                  onClick={() => setCollectionTier("scrub")}
                  aria-pressed={collectionTier === "scrub"}
                  aria-label={`View unlocked Scrubs, ${collectionProgress.unlockedScrubs} of ${collectionProgress.scrubPool}`}
                >
                  <span className="landing-profile-strip__label">Scrubs</span>
                  <strong>
                    {collectionProgress.unlockedScrubs}/
                    {collectionProgress.scrubPool}
                  </strong>
                </button>
                <button
                  type="button"
                  className={`landing-profile-strip__stat landing-profile-strip__stat--btn${
                    collectionTier === "super-scrub" ? " is-active" : ""
                  }`}
                  onClick={() => setCollectionTier("super-scrub")}
                  aria-pressed={collectionTier === "super-scrub"}
                  aria-label={`View unlocked Super Scrubs, ${collectionProgress.unlockedSuperScrubs} of ${collectionProgress.superScrubPool}`}
                >
                  <span className="landing-profile-strip__label">
                    Super Scrubs
                  </span>
                  <strong>
                    {collectionProgress.unlockedSuperScrubs}/
                    {collectionProgress.superScrubPool}
                  </strong>
                </button>
                <button
                  type="button"
                  className={`landing-profile-strip__stat landing-profile-strip__stat--btn${
                    collectionTier === "recent-all-star" ? " is-active" : ""
                  }`}
                  onClick={() => setCollectionTier("recent-all-star")}
                  aria-pressed={collectionTier === "recent-all-star"}
                  aria-label={`View unlocked Recent All-Stars, ${collectionProgress.recentUnlocked} of ${collectionProgress.recentTotal}`}
                >
                  <span className="landing-profile-strip__label">
                    Recent All-Stars
                  </span>
                  <strong>
                    {collectionProgress.recentUnlocked}/
                    {collectionProgress.recentTotal}
                  </strong>
                </button>
              </div>
              <div className="landing-profile-strip__footer">
                <p className="landing-profile-strip__meta">
                  Win to unlock All-Stars, lose to unlock Scrubs.
                </p>
                <div className="landing-profile-strip__links">
                  <button
                    type="button"
                    className="landing-profile-strip__link"
                    onClick={onViewStats}
                  >
                    Season Stats
                  </button>
                  <button
                    type="button"
                    className="landing-profile-strip__link"
                    onClick={onViewAchievements}
                  >
                    Badges
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {hubTab === "account" ? (
          <>
            <section
              className="account-section landing-team-form landing-card landing-card--form"
              aria-labelledby="account-identity-heading"
            >
              <p className="account-section__eyebrow" id="account-identity-heading">
                Identity
              </p>
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
                  Shown on leaderboards. Tap to verify or copy your full ID.
                </span>
              </p>

              <AccountAuthPanel
                playerId={playerIdentity.playerId}
                onViewPrivacy={onViewPrivacy}
                onViewTerms={onViewTerms}
              />
            </section>

            <section
              className="account-section landing-card"
              aria-labelledby="account-records-heading"
            >
              <p className="account-section__eyebrow" id="account-records-heading">
                Records
              </p>
              <div className="landing-hub__links">
                <button
                  type="button"
                  className="landing-hub__link-button hub-accent hub-accent--account"
                  onClick={onViewGmStats}
                >
                  GM stats
                </button>
              </div>
            </section>

            <section
              className="account-section account-section--legal"
              aria-labelledby="account-legal-heading"
            >
              <p className="account-section__eyebrow" id="account-legal-heading">
                Legal
              </p>
              <p className="landing-disclaimer">
                Draft Day GM is an independent project. It is not affiliated with,
                endorsed by, or connected to the NBA, its teams, players, or
                partners.
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
                  Privacy
                </button>
                <span className="landing-footer__sep" aria-hidden="true">
                  ·
                </span>
                <button
                  type="button"
                  className="landing-footer__link"
                  onClick={onViewTerms}
                >
                  Terms
                </button>
              </nav>

              <p className="landing-credit">Powered by BALLACADEMY</p>
            </section>
          </>
        ) : null}
      </div>
    </HubShell>
  );
}
