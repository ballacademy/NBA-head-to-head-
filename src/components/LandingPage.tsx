import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scrollHubToTop } from "../lib/hubScroll";
import {
  completeUnlock,
  dismissPendingUnlock,
  getCollectionProgress,
  getCollectionTierTotal,
  getUnlockedPlayersByTier,
  COLLECTION_UNLOCK_COPY,
  type CollectionTier,
  type PlayerCollection,
} from "../lib/playerCollection";
import { CollectionTierModal } from "./CollectionTierModal";
import { FranchiseHubPanel } from "./FranchiseHubPanel";
import { PlayerUnlockModal } from "./PlayerUnlockModal";
import type { DailyDraftMode } from "../lib/dailyDraftMode";
import {
  formatDailyDraftModeLabel,
  formatDailyDraftProductName,
  getDailyDraftScoringTwistCopy,
} from "../lib/dailyDraftMode";
import type { LandingDailyDraftSnapshot } from "../lib/landingDailyDraft";
import { formatDailyDraftChooserStatus } from "../lib/landingDailyDraft";
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
import { PICK_TIME_LIMIT_SECONDS, CLASSIC_PICK_TIME_LIMIT_SECONDS } from "../lib/match";
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
import { AddToHomeScreenCard } from "./AddToHomeScreenCard";
import { AccountAuthPanel } from "./AccountAuthPanel";
import { AccountRequiredNote } from "./AccountRequiredNote";
import { ACCOUNT_REQUIRED_EVENT_STANDINGS_MESSAGE } from "../lib/accountGate";
import { InlineAlert } from "./InlineAlert";
import { EmptyState } from "./EmptyState";
import { RecordWithStreak } from "./RecordWithStreak";
import { type LandingHubTab } from "./LandingBottomNav";
import { HubFeatureReturnButton } from "./HubFeatureReturnButton";
import { HubShell } from "./HubShell";
import {
  loadLandingH2hMode,
  loadLandingPlaySection,
  saveLandingH2hMode,
  saveLandingPlaySection,
  syncLandingDeepLinkUrl,
  type LandingContentTab,
  type LandingH2hMode,
  type LandingPlaySection,
} from "../lib/landingHub";
import { trackProductEvent } from "../lib/productAnalytics";
import { getOrCreatePlayerIdentity } from "../lib/playerIdentity";
import type { GhostMatchmakingMode } from "../lib/ghostMatchmaking";
import type { StartDraftOptions, StartMatchResult } from "../lib/match";
import { players as allPlayers } from "../data/players";
import {
  canPlayEventMatch,
  loadAllEventProfiles,
  loadEventProfile,
  remainingEventMatches,
} from "../lib/eventProfile";
import {
  buildEventHistoryRows,
  formatEventPresenceLabel,
} from "../lib/eventHistory";
import {
  fetchEventLeaderboard,
  type EventLeaderboardEntry,
} from "../lib/eventLeaderboard";
import {
  EVENT_BADGE_THRESHOLDS,
  formatEventBadgeLabel,
  formatWeeklyEventChooserMeta,
  getCurrentWeeklyEvent,
  getLegacyUtcEventId,
  getScheduledWeeklyEventMeta,
  getWeeklyEventForEventId,
} from "../lib/weeklyEvents";
import { ensureClassicProfile } from "../lib/classicProfile";
import { ensureCurrentRankedSeason } from "../lib/rankedProfile";
import { isHeadToHeadLineupLocked } from "../lib/matchmaking";
import { loadPendingLineupState } from "../lib/pendingLineup";
import { RATING_LABEL } from "../lib/rankedElo";
import { getHighBannerQueueLockNote } from "../lib/highBannerQueueWait";
import {
  hasSeenFirstSessionGuide,
  markFirstSessionGuideSeen,
} from "../lib/firstSessionOnboarding";
import {
  BANNERS_EXPLAINER_COPY,
  hasSeenBannersExplainer,
  markBannersExplainerSeen,
} from "../lib/bannersExplainer";
import { FirstSessionOnboardingOverlay, FirstSessionWelcomeBar } from "./FirstSessionOnboardingOverlay";
import { PlayHubStrip } from "./PlayHubStrip";
import { getNextBadgeTeaser } from "../lib/nextBadgeTeaser";
import {
  buildWeeklyGmRecap,
  hasSeenWeeklyRecap,
} from "../lib/gmWeeklyRecap";
import {
  buildPlayHubChips,
  formatPlayHubDailyStreakLabel,
  getPlayNavBadgeCount,
  type PlayHubChip,
} from "../lib/playHubRetention";

const buildHeadToHeadModeDetails = (baseDetails: string[]) => [
  ...baseDetails,
  COLLECTION_UNLOCK_COPY,
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
  pendingPrivateJoinCode?: string | null;
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
  onCareerSynced?: () => void;
  onViewStats: () => void;
  onViewTierList: () => void;
  onViewGmStats: () => void;
  onViewWeeklyRecap: (source?: "play" | "roster") => void;
  onViewAchievements: () => void;
  onViewLeaderboard: () => void;
  onViewPrivacy: () => void;
  onViewTerms: () => void;
  onViewBetaNotes: () => void;
  hubTab: LandingContentTab;
  onHubTabChange: (tab: LandingContentTab) => void;
  onPrefetchHubTab?: (tab: LandingHubTab) => void;
  pendingOwnerResultCount?: number;
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
  pendingPrivateJoinCode = null,
  onPendingPrivateMatchModeConsumed,
  onStartDraft,
  onViewDailyLineup,
  onViewYesterdayBestDailyLineup,
  landingBasicDaily,
  landingAdvancedDaily,
  onCollectionChange,
  onCareerSynced,
  onViewStats,
  onViewTierList,
  onViewGmStats,
  onViewWeeklyRecap,
  onViewAchievements,
  onViewLeaderboard,
  onViewPrivacy,
  onViewTerms,
  onViewBetaNotes,
  hubTab,
  onHubTabChange,
  onPrefetchHubTab,
  pendingOwnerResultCount = 0,
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
  const [teamNameExpanded, setTeamNameExpanded] = useState(false);
  const [recapSeenTick, setRecapSeenTick] = useState(0);
  const [playSection, setPlaySection] = useState<LandingPlaySection>(() =>
    loadLandingPlaySection(),
  );
  const [rosterVisited, setRosterVisited] = useState(hubTab === "roster");
  const [accountVisited, setAccountVisited] = useState(hubTab === "account");
  const [h2hIntentTarget, setH2hIntentTarget] = useState<LandingH2hMode | null>(
    () =>
      loadLandingPlaySection() === "headToHead" ? loadLandingH2hMode() : null,
  );
  const [showFirstSessionGuide, setShowFirstSessionGuide] = useState(
    () => !hasSeenFirstSessionGuide(),
  );
  const [showBannersExplainer, setShowBannersExplainer] = useState(
    () => !hasSeenBannersExplainer(),
  );
  const classicH2hCardRef = useRef<HTMLDivElement | null>(null);
  const proH2hCardRef = useRef<HTMLDivElement | null>(null);
  const [queuedLineupLock, setQueuedLineupLock] = useState(() => {
    const playerId = getOrCreatePlayerIdentity().playerId;
    return {
      classic: Boolean(loadPendingLineupState("classic", playerId)),
      ranked: Boolean(loadPendingLineupState("ranked", playerId)),
    };
  });
  const [privateJoinPrefill, setPrivateJoinPrefill] = useState("");
  const closePrivateMatchModal = useCallback(() => {
    setPrivateMatchMode(null);
    setPrivateJoinPrefill("");
  }, []);

  const updatePlaySection = useCallback((section: LandingPlaySection) => {
    setPlaySection(section);
    saveLandingPlaySection(section);
    syncLandingDeepLinkUrl({
      hub: "play",
      play: section,
      h2hMode: section === "headToHead" ? loadLandingH2hMode() : null,
    });
    if (section !== "headToHead") {
      setH2hIntentTarget(null);
    }
    if (section !== "chooser") {
      trackProductEvent("play_mode_open", { section });
    }
    scrollHubToTop();
  }, []);

  useEffect(() => {
    if (hubTab !== "play" || playSection !== "chooser") {
      return;
    }

    const onReturn = () => {
      if (document.visibilityState === "visible") {
        scrollHubToTop();
      }
    };

    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("pageshow", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("pageshow", onReturn);
    };
  }, [hubTab, playSection]);

  useEffect(() => {
    if (hubTab !== "play" || playSection !== "headToHead" || !h2hIntentTarget) {
      if (h2hIntentTarget && (hubTab !== "play" || playSection !== "headToHead")) {
        setH2hIntentTarget(null);
      }
      return;
    }

    const node =
      h2hIntentTarget === "classic"
        ? classicH2hCardRef.current
        : proH2hCardRef.current;
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setH2hIntentTarget(null), 4000);
    return () => window.clearTimeout(timer);
  }, [hubTab, h2hIntentTarget, playSection]);

  useEffect(() => {
    if (!pendingPrivateMatchMode) {
      return;
    }
    if (pendingPrivateJoinCode) {
      setPrivateJoinPrefill(pendingPrivateJoinCode.trim().toUpperCase());
    }
    setPrivateMatchMode(pendingPrivateMatchMode);
    onPendingPrivateMatchModeConsumed?.();
  }, [
    pendingPrivateMatchMode,
    pendingPrivateJoinCode,
    onPendingPrivateMatchModeConsumed,
  ]);

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
      buildHeadToHeadModeDetails([
        `$${(CLASSIC_HEAD_TO_HEAD_SALARY_CAP / 1_000_000).toFixed(0)}M salary cap.`,
        `${CLASSIC_PICK_TIME_LIMIT_SECONDS}-second picks.`,
        `${RATING_LABEL} matchmaking pairs similar Front Offices.`,
        "Monthly Top 500 on the Casual board.",
        "Practice H2H vs a bot, or start a private match — neither changes Banners, badges, or board placement.",
      ]),
    [],
  );
  const proModeDetails = useMemo(
    () =>
      buildHeadToHeadModeDetails([
        `$${(RANKED_SALARY_CAP / 1_000_000).toFixed(0)}M salary cap.`,
        `${PICK_TIME_LIMIT_SECONDS}-second picks.`,
        `${RATING_LABEL} matchmaking pairs similar Front Offices.`,
        "Monthly Top 500 on the Pro board.",
        "Practice H2H vs a bot, or start a private match — neither changes Banners, badges, or board placement.",
      ]),
    [],
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
  }, [playerIdentity.playerId, playSection, startMatchError]);

  useEffect(() => {
    if (hubTab === "roster") {
      setRosterVisited(true);
    }
    if (hubTab === "account") {
      setAccountVisited(true);
    }
  }, [hubTab]);

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
      setTeamNameExpanded(true);
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

  const weeklyEvent = useMemo(() => {
    const current = getCurrentWeeklyEvent(allPlayers);
    const legacyId = getLegacyUtcEventId();
    if (!legacyId || loadEventProfile(legacyId).matchesPlayed <= 0) {
      return current;
    }
    return getWeeklyEventForEventId(legacyId, allPlayers) ?? current;
  }, []);
  const eventProfile = weeklyEvent
    ? loadEventProfile(weeklyEvent.id)
    : null;
  const eventMatchesLeft = weeklyEvent
    ? remainingEventMatches(weeklyEvent.id)
    : 0;
  const eventPlayable = weeklyEvent
    ? canPlayEventMatch(weeklyEvent.id)
    : false;
  const eventPresenceLabel = weeklyEvent
    ? formatEventPresenceLabel({
        matchesPlayed: eventProfile?.matchesPlayed ?? 0,
        matchesLeft: eventMatchesLeft,
        maxMatches: weeklyEvent.maxMatches,
      })
    : null;
  const eventHistory = useMemo(
    () =>
      buildEventHistoryRows(
        loadAllEventProfiles(),
        weeklyEvent?.id ?? null,
      ),
    [weeklyEvent?.id],
  );
  const pastEventHistory = eventHistory.filter((row) => !row.isCurrent);
  const scheduledWeeklyEvent = useMemo(
    () => getScheduledWeeklyEventMeta(),
    [],
  );
  const eventChooserMeta = formatWeeklyEventChooserMeta(
    weeklyEvent,
    scheduledWeeklyEvent,
  );
  const dailyChooserStatus = useMemo(
    () =>
      formatDailyDraftChooserStatus({
        basicDone: Boolean(landingBasicDaily.entry),
        advancedDone: Boolean(landingAdvancedDaily.entry),
      }),
    [landingAdvancedDaily.entry, landingBasicDaily.entry],
  );
  const playHubChips = useMemo(() => {
    const recap = buildWeeklyGmRecap();
    const nextBadge = getNextBadgeTeaser();
    const nextBadgeIsDaily = Boolean(
      nextBadge?.id.startsWith("daily-streak-"),
    );
    return buildPlayHubChips({
      pendingResultCount: pendingOwnerResultCount,
      queuedClassic: queuedLineupLock.classic,
      queuedRanked: queuedLineupLock.ranked,
      recapReady:
        recap.dailyPuzzles > 0 && !hasSeenWeeklyRecap(recap.weekKey),
      recapDetail: `Daily Draft · ${recap.periodLabel.toLowerCase()}`,
      nextBadgeTitle: nextBadge?.title ?? null,
      nextBadgeIsDaily,
      nextBadgePlaySection: nextBadge?.hint.playSection,
      nextBadgeH2hMode: nextBadge?.hint.h2hMode,
      dailyStreakLabel: formatPlayHubDailyStreakLabel(
        getDailyDraftPlayStreak("basic"),
        getDailyDraftPlayStreak("advanced"),
      ),
      dailyOpen: dailyChooserStatus.tag !== "completed",
      dailyOpenDetail: dailyChooserStatus.meta,
    });
  }, [
    pendingOwnerResultCount,
    queuedLineupLock.classic,
    queuedLineupLock.ranked,
    recapSeenTick,
    dailyChooserStatus,
  ]);
  const playNavBadgeCount = getPlayNavBadgeCount({
    pendingResultCount: pendingOwnerResultCount,
    queuedClassic: queuedLineupLock.classic,
    queuedRanked: queuedLineupLock.ranked,
  });

  const handlePlayHubChip = (chip: PlayHubChip) => {
    if (chip.action.type === "inbox" || chip.action.type === "h2h") {
      updatePlaySection("headToHead");
      return;
    }
    if (chip.action.type === "roster") {
      onHubTabChange("roster");
      return;
    }
    if (chip.action.type === "recap") {
      setRecapSeenTick((tick) => tick + 1);
      onViewWeeklyRecap("play");
      return;
    }
    if (chip.action.type === "play") {
      handlePlayIntent({
        playSection: chip.action.playSection,
        h2hMode: chip.action.h2hMode,
      });
    }
  };

  const dismissFirstSessionGuide = useCallback(() => {
    markFirstSessionGuideSeen();
    setShowFirstSessionGuide(false);
  }, []);

  const handlePlayIntent = useCallback(
    (intent: {
      playSection: LandingPlaySection;
      h2hMode?: "classic" | "ranked";
    }) => {
      if (intent.h2hMode) {
        saveLandingH2hMode(intent.h2hMode);
        setH2hIntentTarget(intent.h2hMode);
      }
      updatePlaySection(intent.playSection);
      if (hubTab !== "play") {
        onHubTabChange("play");
      }
    },
    [hubTab, onHubTabChange, updatePlaySection],
  );

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

    // Daily and Practice only use a name for results labeling — reuse a saved
    // profile when present, otherwise a local default (no team-name gate).
    const team =
      options?.isDailyDraft || options?.practiceMode
        ? (loadTeamProfile() ??
          ({
            name: options?.isDailyDraft ? "Daily Draft" : "Practice",
          } satisfies TeamProfile))
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
      snapshot.entry ? snapshot.entry.formattedResult : "Not played",
      snapshot.entry ? snapshot.percentileLabel : null,
      playStreak.current > 0 ? formatDailyDraftPlayStreak(playStreak) : null,
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
          {dailyCompleted ? (
            <span className="daily-draft-card__completed-tag">
              {snapshot.canViewLineup ? "Completed" : "Played"}
            </span>
          ) : null}
        </div>
        <h3 className="daily-draft-card__challenge-title">
          {snapshot.goal.title}
        </h3>
        <p className="daily-draft-card__challenge-copy">
          {getDailyDraftScoringTwistCopy(mode)}
        </p>
        <p className="daily-draft-card__goal-copy">{snapshot.goal.description}</p>
        <p className="daily-draft-card__status">{statusParts.join(" · ")}</p>
        <div className="daily-draft-card__actions">
          <button
            type="button"
            className={`daily-draft-card__button${dailyCompleted ? " daily-draft-card__button--completed" : ""}`}
            disabled={modesBlocked || (dailyCompleted && !snapshot.canViewLineup)}
            onClick={() => void handleDailyAction(mode)}
          >
            {dailyCompleted
              ? snapshot.canViewLineup
                ? `View ${formatDailyDraftModeLabel(mode)} lineup`
                : "Lineup not saved"
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
    scrollHubToTop();
  };

  const renderTeamNameField = () => {
    const forceExpanded = Boolean(profanityWarning || error || startMatchError);
    const showCompactChip =
      teamValidation.ok && !teamNameExpanded && !forceExpanded;

    if (showCompactChip) {
      return (
        <div
          ref={teamFormRef}
          className="landing-team-chip"
          data-testid="landing-team-chip"
        >
          <span className="landing-team-chip__label">Team</span>
          <strong className="landing-team-chip__name">{name.trim()}</strong>
          <button
            type="button"
            className="landing-team-chip__edit"
            onClick={() => onHubTabChange("account")}
          >
            Edit in Account
          </button>
        </div>
      );
    }

    return (
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
            onBlur={() => {
              handleTeamNameBlur();
              if (validateTeamProfile(name).ok) {
                setTeamNameExpanded(false);
              }
            }}
            onChange={(event) => {
              setName(event.target.value);
              if (error) {
                setError("");
              }
            }}
          />
        </label>
        {profanityWarning || error || startMatchError ? (
          <InlineAlert message={profanityWarning || error || startMatchError} />
        ) : null}
      </div>
    );
  };

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
        ? "Franchise"
        : "Account";

  const hubLede =
    hubTab === "play"
      ? playSection === "daily"
        ? "Hidden stats. One try per mode."
        : playSection === "events"
          ? "Weekly live H2H · rotating rules."
          : playSection === "headToHead"
            ? "Live matchups · Casual or Pro."
            : "Draft. Match up. Prove your GM eye."
      : hubTab === "roster"
        ? "Your collection and career."
        : "Sign in and settings.";

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
      playBadgeCount={playNavBadgeCount}
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
          initialJoinCode={privateJoinPrefill || pendingPrivateJoinCode}
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

      <div className="landing-hub__top">
        <h1 className="landing-hub__title">{hubTitle}</h1>
        <p className="landing__lede landing-hub__lede">{hubLede}</p>
      </div>

      {hubTab === "play" && playSection !== "chooser" ? playModeBack : null}

      {showFirstSessionGuide &&
      hubTab === "play" &&
      playSection !== "chooser" ? (
        <FirstSessionWelcomeBar
          onSeePlay={() => updatePlaySection("chooser")}
          onDismiss={dismissFirstSessionGuide}
        />
      ) : null}

      <div className="landing-hub__content">
        {liveRestoreNotice ? (
          <InlineAlert
            tone="info"
            role="status"
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
                    label: "Resume match",
                    onClick: onRetryLiveRestore,
                  }
                : undefined
            }
          />
        ) : null}
        <div hidden={hubTab !== "play"}>
        {playSection === "chooser" ? (
          <>
            <PlayHubStrip chips={playHubChips} onChip={handlePlayHubChip} />
            <div className="play-hub-chooser" role="list">
            <button
              type="button"
              className="play-hub-chooser__option hub-accent hub-accent--daily"
              role="listitem"
              aria-label={`Daily Draft, ${dailyChooserStatus.meta}`}
              onClick={() => updatePlaySection("daily")}
            >
              <span className="play-hub-chooser__copy">
                <span className="play-hub-chooser__label-row">
                  <span className="play-hub-chooser__label">Daily Draft</span>
                  {dailyChooserStatus.tagLabel ? (
                    <span
                      className={`play-hub-chooser__tag play-hub-chooser__tag--${dailyChooserStatus.tag}`}
                    >
                      {dailyChooserStatus.tagLabel}
                    </span>
                  ) : null}
                </span>
                <span className="play-hub-chooser__meta">
                  {dailyChooserStatus.meta}
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
                  Casual · Pro · practice · private match
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
                  {eventChooserMeta}
                </span>
              </span>
              <span className="play-hub-chooser__chevron" aria-hidden="true">
                ›
              </span>
            </button>
          </div>
          </>
        ) : null}

        {playSection === "headToHead" ? (
          <>
            {renderTeamNameField()}
            {anyQueuedLineupLock ? (
              <p className="queue-lock-note" role="status">
                {getHighBannerQueueLockNote(
                  queuedLineupLock.classic && queuedLineupLock.ranked
                    ? " (Casual and Pro)"
                    : queuedLineupLock.classic
                      ? " (Casual)"
                      : " (Pro)",
                )}
              </p>
            ) : null}
            {showBannersExplainer ? (
              <p className="banners-explainer" role="note">
                <span>{BANNERS_EXPLAINER_COPY}</span>
                <button
                  type="button"
                  className="banners-explainer__dismiss"
                  onClick={() => {
                    markBannersExplainerSeen();
                    setShowBannersExplainer(false);
                  }}
                >
                  Got it
                </button>
              </p>
            ) : null}
            <div className="landing-game-modes landing-game-modes--h2h">
              <div
                ref={classicH2hCardRef}
                className={`head-to-head-card landing-card landing-card--mode${
                  h2hIntentTarget === "classic" ? " is-intent-target" : ""
                }`}
              >
                <div className="mode-card__header">
                  <p className="eyebrow">{CLASSIC_HEAD_TO_HEAD_LABEL}</p>
                  <ModeCardInfo details={classicModeDetails} variant="corner" />
                </div>
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

              <div
                ref={proH2hCardRef}
                className={`ranked-cap-card landing-card landing-card--mode${
                  h2hIntentTarget === "ranked" ? " is-intent-target" : ""
                }`}
              >
                <div className="mode-card__header">
                  <p className="eyebrow">{PRO_HEAD_TO_HEAD_LABEL}</p>
                  <ModeCardInfo details={proModeDetails} variant="corner" />
                </div>
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
                    from active stars at their peak seasons, plus legendary
                    All-Stars from every era.
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
                  aria-label={`${ALL_TIME_LABEL} coming soon`}
                >
                  <p className="eyebrow">{ALL_TIME_LABEL}</p>
                  <h2 className="all-time-card__title">
                    Peak seasons &amp; legends
                  </h2>
                  <p className="all-time-card__description">
                    Draft active stars at their peak seasons plus legendary
                    All-Stars from every era. Coming soon.
                  </p>
                  <button
                    type="button"
                    className="all-time-card__button all-time-card__button--locked"
                    disabled
                  >
                    Coming soon
                  </button>
                </div>
              )}
            </div>
          </>
        ) : null}

        {playSection === "daily" ? (
          <>
            {error || startMatchError ? (
              <InlineAlert message={error || startMatchError} />
            ) : null}
            <div className="landing-game-modes landing-game-modes--daily-split">
              {renderDailyModeCard(landingBasicDaily)}
              {renderDailyModeCard(landingAdvancedDaily)}
            </div>
          </>
        ) : null}

        {playSection === "events" ? (
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
                    <strong>{weeklyEvent.restrictionLabel}</strong>
                    {" · "}${(weeklyEvent.salaryCapLimit / 1_000_000).toFixed(0)}
                    M · {eventMatchesLeft}/{weeklyEvent.maxMatches} left
                  </p>
                  <p className="event-card__description">
                    {weeklyEvent.description}
                  </p>
                  {eventPresenceLabel ? (
                    <p className="event-card__presence" role="status">
                      {eventPresenceLabel}
                    </p>
                  ) : null}
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
                    <EmptyState message="Loading…" loading />
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
                    <EmptyState message="No event results yet. Be the first on the board." />
                  ) : (
                    <ol className="event-leaderboard__list">
                      {eventLeaderboard.map((entry) => {
                        const podiumClass =
                          entry.rank === 1
                            ? " event-leaderboard__row--podium-1"
                            : entry.rank === 2
                              ? " event-leaderboard__row--podium-2"
                              : entry.rank === 3
                                ? " event-leaderboard__row--podium-3"
                                : "";

                        return (
                          <li
                            key={`${entry.playerId}-${entry.rank}`}
                            className={`event-leaderboard__row${
                              entry.isViewer
                                ? " event-leaderboard__row--you"
                                : ""
                            }${podiumClass}`}
                          >
                            <span className="event-leaderboard__rank">
                              {entry.rank}
                            </span>
                            <span className="event-leaderboard__identity">
                              <span className="event-leaderboard__team">
                                {entry.teamName}
                              </span>
                              {entry.isViewer ? (
                                <span className="leaderboard-row__you-chip">
                                  You
                                </span>
                              ) : null}
                            </span>
                            <span className="event-leaderboard__wins">
                              {entry.wins}-{entry.losses}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </details>

                {pastEventHistory.length > 0 ? (
                  <section
                    className="event-history landing-card"
                    aria-label="Event history"
                  >
                    <p className="eyebrow">Your event history</p>
                    <p className="event-history__lede">
                      Past weekly events beyond this week&apos;s card.
                    </p>
                    <ul className="event-history__list">
                      {pastEventHistory.map((row) => (
                        <li
                          key={row.eventId}
                          className={`event-history__row${
                            row.isCurrent ? " event-history__row--current" : ""
                          }`}
                        >
                          <div className="event-history__copy">
                            <strong>
                              {row.title}
                              {row.isCurrent ? " · This week" : ""}
                            </strong>
                            <span>
                              {row.weekLabel} · {row.restrictionLabel}
                            </span>
                          </div>
                          <div className="event-history__meta">
                            <span>
                              {row.wins}-{row.losses}
                              {row.ties > 0 ? `-${row.ties}` : ""}
                            </span>
                            {row.topBadgeLabel ? (
                              <span className="event-history__badge">
                                {row.topBadgeEmoji} {row.topBadgeLabel}
                              </span>
                            ) : (
                              <span className="event-history__badge">
                                {row.matchesPlayed} played
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : (
              <InlineAlert
                message={`This week's ${scheduledWeeklyEvent.title} isn't available right now. Check back later this week.`}
              />
            )}
          </>
        ) : null}
        </div>

        {hubTab === "roster" || rosterVisited ? (
          <div hidden={hubTab !== "roster"}>
          <FranchiseHubPanel
            collectionProgress={collectionProgress}
            collectionTier={collectionTier}
            onSelectTier={setCollectionTier}
            onViewStats={onViewStats}
            onViewAchievements={onViewAchievements}
            onViewGmStats={onViewGmStats}
            onViewWeeklyRecap={() => {
              setRecapSeenTick((tick) => tick + 1);
              onViewWeeklyRecap("roster");
            }}
            dailyChooserStatus={dailyChooserStatus}
            onPlayDaily={() => {
              updatePlaySection("daily");
              onHubTabChange("play");
            }}
            onPlayIntent={handlePlayIntent}
          />
          </div>
        ) : null}

        {hubTab === "account" || accountVisited ? (
          <div hidden={hubTab !== "account"}>
          <section
            className="account-section account-section--unified landing-team-form landing-card landing-card--form"
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

            <label className="field landing-team-form__field">
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
            {profanityWarning || error ? (
              <InlineAlert message={profanityWarning || error} />
            ) : null}

            <AccountAuthPanel
              playerId={playerIdentity.playerId}
              onViewPrivacy={onViewPrivacy}
              onViewTerms={onViewTerms}
              onCollectionChange={onCollectionChange}
              onCareerSynced={onCareerSynced}
            />

            <AddToHomeScreenCard />

            <div className="account-section__legal-strip">
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
            </div>
          </section>
          </div>
        ) : null}
      </div>

      {showFirstSessionGuide &&
      hubTab === "play" &&
      playSection === "chooser" ? (
        <FirstSessionOnboardingOverlay
          onDismiss={dismissFirstSessionGuide}
          onPractice={() => {
            void handleStart({
              practiceMode: true,
              salaryCapLimit: CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
            }).then((result) => {
              if (result === "started") {
                dismissFirstSessionGuide();
              }
            });
          }}
          onDaily={() => {
            dismissFirstSessionGuide();
            handlePlayIntent({ playSection: "daily" });
          }}
        />
      ) : null}
    </HubShell>
  );
}
