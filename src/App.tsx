import {
  Suspense,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { lazyWithChunkReload } from "./lib/lazyChunk";
import {
  prefetchFeaturePhase,
  prefetchHubFeatureTab,
  scheduleIdleHubPrefetch,
} from "./lib/hubPrefetch";
import { scrollHubToTop } from "./lib/hubScroll";
import { unlockDraftClockAudio } from "./lib/draftClockSound";
import { forceUnlockBackgroundScroll } from "./hooks/useDialogA11y";
import { DailyDraftResults } from "./components/DailyDraftResults";
import { MatchResults } from "./components/MatchResults";
import { players } from "./data/players";
import { DraftOnboardingOverlay } from "./components/DraftOnboardingOverlay";
import { DraftRoom } from "./components/DraftRoom";
import { LandingPage } from "./components/LandingPage";
import { HubShell } from "./components/HubShell";
import type { LandingHubTab } from "./components/LandingBottomNav";
import {
  applyLandingDeepLinksFromSearch,
  hubParamForFeature,
  loadLandingHubTab,
  parentTabForFeature,
  saveLandingHubTab,
  saveLandingH2hMode,
  saveLandingPlaySection,
  syncLandingDeepLinkUrl,
  syncLandingHubTabUrl,
  type LandingContentTab,
  type LandingDeepLinkFeature,
  type LandingH2hMode,
  type LandingPlaySection,
} from "./lib/landingHub";
import { capturePwaInstallPrompt } from "./lib/pwaInstall";
import { trackProductEvent } from "./lib/productAnalytics";
import { isQaRuntimeHost } from "./lib/qaRuntime";
import { PendingQueueResults } from "./components/PendingQueueResults";
import { PendingOwnerResults } from "./components/PendingOwnerResults";
import { MatchmakingOverlay } from "./components/MatchmakingOverlay";
import { WaitingRoom } from "./components/WaitingRoom";
import { getActivePlayerPool, getPlayersByIdFromActivePool, isCompleteLineupFromActivePool } from "./lib/activePlayerPool";
import { statsPlayers } from "./lib/playerPool";
import { getTierListPlayers } from "./lib/tierList";
import {
  generateFeasibleDraftSlots,
  generateFeasibleDraftSlotsUnderSalaryCap,
  completeSalaryCapDraftFromPartial,
  pickBestForSlot,
  pickRandomTopCandidateForSlot,
  validateDraftSlotsFeasible,
  validateDraftSlotsFeasibleUnderSalaryCap,
} from "./lib/draft";
import {
  getDailyDateKey,
  getDailyDraftSetup,
} from "./lib/dailyDraft";
import {
  getResolvedDailyDraftSetup,
  getYesterdayBestDailyDraftSetup,
  refreshCanonicalDailyGoalData,
} from "./lib/dailyDraftGoalResolve";
import type { DailyDraftMode } from "./lib/dailyDraftMode";
import { DAILY_DRAFT_MODES } from "./lib/dailyDraftMode";
import { solveBestDailyDraftLineup } from "./lib/dailyDraftSolver";
import {
  hasSeenDraftOnboarding,
  markDraftOnboardingSeen,
  type DraftOnboardingContext,
} from "./lib/draftOnboarding";
import { getPlayNavBadgeCount } from "./lib/playHubRetention";
import { loadPendingLineupState } from "./lib/pendingLineup";
import { getMatchModeTheme } from "./lib/matchModeTheme";
import {
  findPlayerDailyDraftEntry,
  formatPlayerDailyDraftPercentile,
  hasCompletedDailyDraft,
  resolvePlayerDailyDraftPercentile,
  refreshDailyDraftScoresFromApi,
  simulateDailyBenchmarkValues,
} from "./lib/dailyDraftScores";
import { getDailyGoalById } from "./lib/dailyDraftGoals";
import { useDailyDateKey } from "./lib/useDailyDateKey";
import {
  createOpponentDraftSlots,
  createRandomOpponent,
  createAllTimeOpponent,
  createClassicOpponent,
  createRankedOpponent,
  createGhostOpponent,
  createLiveOpponent,
  createUserDrafter,
  finalizeOpponentLineup,
  getOpponentPickDelayMs,
  sleep,
  type StartDraftOptions,
  type StartMatchResult,
} from "./lib/match";
import {
  getStartMatchErrorMessage,
  planEventLiveMatchmaking,
  planHeadToHeadMatchmaking,
} from "./lib/matchmaking";
import { canPlayEventMatch, loadEventProfile } from "./lib/eventProfile";
import {
  filterPlayersForEventRestriction,
  getCurrentWeeklyEvent,
  getWeeklyEventForEventId,
  isCurrentEventId,
  type EventRestrictionId,
} from "./lib/weeklyEvents";
import { getOrCreatePlayerIdentity } from "./lib/playerIdentity";
import type { GhostMatchmakingMode } from "./lib/ghostMatchmaking";
import type { GhostOpponentSnapshot } from "./lib/ghostMatchmaking";
import type { LiveOpponentSnapshot } from "./lib/liveMatchmaking";
import {
  fetchLiveMatchState,
  leaveMatchmakingQueue,
  resolveLiveOpponentLineup,
  submitLiveMatchLineup,
} from "./lib/liveMatchmaking";
import {
  cancelPrivateRoom,
  createPrivateRoom,
  joinPrivateRoom,
  waitForPrivateRoomGuest,
} from "./lib/privateMatchmaking";
import {
  cancelPrivateRematch,
  offerPrivateRematch,
  waitForPrivateRematch,
} from "./lib/privateRematch";
import { formatOpponentDisplayName } from "./lib/opponentDisplayName";
import {
  clearLiveDraftSession,
  saveLiveDraftSession,
} from "./lib/liveDraftSession";
import { restoreLiveDraftSession } from "./lib/restoreLiveDraftSession";
import {
  fetchDeliverableOwnerResults,
  finalizeDeliveredOwnerResults,
  type DeliveredOwnerResult,
} from "./lib/pendingOwnerResults";
import { RANKED_STARTING_ELO, requiresLiveOpponentOnly } from "./lib/rankedElo";
import { LEADERBOARD_LIMIT } from "./lib/leaderboard";
import { RANKED_LEADERBOARD_LIMIT } from "./lib/rankedLeaderboard";
import { refreshLeaderboardFromApi } from "./lib/leaderboardRemote";
import { getCurrentSeasonId } from "./lib/rankedSeason";
import {
  ensurePlayerCollection,
  getDraftablePlayers,
  resolveOpponentCollectionForMatch,
  countUnlockedAllStars,
  type PlayerCollection,
} from "./lib/playerCollection";
import {
  filterOutRankedEventBannedPlayers,
  isBannedFromRankedAndEvents,
  shouldApplyRankedEventPlayerBans,
} from "./lib/competitivePlayerBans";
import { pullAndMergeCollection } from "./lib/collectionRemote";
import { pullAndMergeAchievements } from "./lib/achievementsRemote";
import { pullAndMergeCareerStats } from "./lib/careerStatsRemote";
import { pullAndMergeNbaPlayerUsage } from "./lib/nbaPlayerUsageRemote";
import { pullAndMergeEventProfiles } from "./lib/eventProfileRemote";
import { pullAndMergeTierListLibrary } from "./lib/tierListLibraryRemote";
import { pullAndMergeDailyDraftHistory } from "./lib/dailyDraftHistoryRemote";
import { isAllTimeModePlayable } from "./lib/eraUnlocks";
import { loadAllModeRecords, loadPlayerRecord } from "./lib/playerRecord";
import { ensureNpcOpponentPool } from "./lib/rankedLeaderboard";
import { ensureClassicProfile } from "./lib/classicProfile";
import { ensureCurrentRankedSeason } from "./lib/rankedProfile";
import { getSalaryCapDraftOptions } from "./lib/salaryCapDraft";
import {
  CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
  RANKED_SALARY_CAP,
} from "./lib/salaryCap";
import { saveTeamProfile, loadTeamProfile } from "./lib/teamProfile";
import type { TeamProfile } from "./lib/teamProfile";
import { getMatchmakingElapsedSeconds } from "./lib/matchmakingTiming";
import type { Drafter } from "./lib/types";

const AchievementsPage = lazyWithChunkReload(() =>
  import("./components/AchievementsPage").then((m) => ({
    default: m.AchievementsPage,
  })),
);
const GmStatsPage = lazyWithChunkReload(() =>
  import("./components/GmStatsPage").then((m) => ({ default: m.GmStatsPage })),
);
const WeeklyRecapPage = lazyWithChunkReload(() =>
  import("./components/WeeklyRecapPage").then((m) => ({
    default: m.WeeklyRecapPage,
  })),
);
const GameLogPage = lazyWithChunkReload(() =>
  import("./components/GameLogPage").then((m) => ({ default: m.GameLogPage })),
);
const InternalPlayerUsagePage = lazyWithChunkReload(() =>
  import("./components/InternalPlayerUsagePage").then((m) => ({
    default: m.InternalPlayerUsagePage,
  })),
);
const LegalPage = lazyWithChunkReload(() =>
  import("./components/LegalPage").then((m) => ({ default: m.LegalPage })),
);
const BetaNotesPage = lazyWithChunkReload(() =>
  import("./components/BetaNotesPage").then((m) => ({
    default: m.BetaNotesPage,
  })),
);
const PlayerStatsTable = lazyWithChunkReload(() =>
  import("./components/PlayerStatsTable").then((m) => ({
    default: m.PlayerStatsTable,
  })),
);
const LeaderboardPage = lazyWithChunkReload(() =>
  import("./components/LeaderboardPage").then((m) => ({
    default: m.LeaderboardPage,
  })),
);
const TierListPage = lazyWithChunkReload(() =>
  import("./components/TierListPage").then((m) => ({
    default: m.TierListPage,
  })),
);

const FeaturePageFallback = () => (
  <div className="feature-page-fallback hub-empty" role="status" aria-live="polite">
    <p>Loading…</p>
  </div>
);

type AppPhase =
  | "landing"
  | "drafting"
  | "waiting"
  | "results"
  | "stats"
  | "tierList"
  | "gmStats"
  | "gameLog"
  | "weeklyRecap"
  | "playerUsage"
  | "leaderboard"
  | "achievements"
  | "privacy"
  | "terms"
  | "beta";

const FEATURE_PHASES = new Set<AppPhase>([
  "stats",
  "tierList",
  "gmStats",
  "gameLog",
  "weeklyRecap",
  "playerUsage",
  "leaderboard",
  "achievements",
  "privacy",
  "terms",
  "beta",
]);

const readInitialInternalPlayerUsage = () => {
  try {
    if (!isQaRuntimeHost()) {
      return false;
    }
    const hub = new URLSearchParams(window.location.search).get("hub");
    const token = hub?.trim().toLowerCase();
    return token === "player-rates" || token === "player-usage";
  } catch {
    return false;
  }
};

const featurePhaseFromDeepLink = (
  feature: LandingDeepLinkFeature | null | undefined,
): AppPhase | null => {
  if (!feature) {
    return null;
  }
  switch (feature) {
    case "tierList":
      return "tierList";
    case "leaderboard":
      return "leaderboard";
    case "stats":
      return "stats";
    case "achievements":
      return "achievements";
    case "gmStats":
      return "gmStats";
    case "privacy":
      return "privacy";
    case "terms":
      return "terms";
    case "beta":
      return "beta";
  }
};

const deepLinkFeatureFromPhase = (
  phase: AppPhase,
): LandingDeepLinkFeature | null => {
  switch (phase) {
    case "tierList":
      return "tierList";
    case "leaderboard":
      return "leaderboard";
    case "stats":
      return "stats";
    case "achievements":
      return "achievements";
    case "gmStats":
      return "gmStats";
    case "privacy":
      return "privacy";
    case "terms":
      return "terms";
    case "beta":
      return "beta";
    default:
      return null;
  }
};

type FeatureHistoryState = {
  appPhase?: AppPhase;
  returnTo?: AppPhase;
};

const readInitialPublicTierListId = () => {
  try {
    const id = new URLSearchParams(window.location.search).get("tierList");
    return id && id.trim() ? id.trim().slice(0, 64) : null;
  } catch {
    return null;
  }
};

const readInitialLandingDeepLinks = () => {
  try {
    return applyLandingDeepLinksFromSearch(window.location.search);
  } catch {
    return {
      contentTab: null,
      playSection: null,
      h2hMode: null,
      feature: null,
      communityView: null,
      communityPostId: null,
      betaSection: null,
      privateRoomCode: null,
    };
  }
};

function App() {
  const [initialPublicTierListId] = useState<string | null>(
    readInitialPublicTierListId,
  );
  const [initialLandingDeepLinks] = useState(readInitialLandingDeepLinks);
  const [phase, setPhase] = useState<AppPhase>(() => {
    if (initialPublicTierListId) {
      return "tierList";
    }
    if (readInitialInternalPlayerUsage()) {
      return "playerUsage";
    }
    const fromDeepLink = featurePhaseFromDeepLink(
      initialLandingDeepLinks.feature,
    );
    if (fromDeepLink) {
      return fromDeepLink;
    }
    return "landing";
  });
  const [showDraftOnboarding, setShowDraftOnboarding] = useState(false);
  const [draftOnboarding, setDraftOnboarding] = useState<DraftOnboardingContext>(
    {
      hasSalaryCap: false,
      isDailyDraft: false,
      isCompetitive: false,
    },
  );
  const [matchedOpponentName, setMatchedOpponentName] = useState<string | null>(
    null,
  );
  const draftOnboardingResolverRef = useRef<(() => void) | null>(null);
  const [user, setUser] = useState<Drafter | null>(null);
  const [opponent, setOpponent] = useState<Drafter | null>(null);
  const [draftStep, setDraftStep] = useState(0);
  const [opponentPickCount, setOpponentPickCount] = useState(0);
  const [opponentComplete, setOpponentComplete] = useState(false);
  const [opponentAutoDrafted, setOpponentAutoDrafted] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [draftSessionKey, setDraftSessionKey] = useState<string | null>(null);
  const [isDailyDraft, setIsDailyDraft] = useState(false);
  const [dailyDraftMode, setDailyDraftMode] = useState<DailyDraftMode>("basic");
  const [isDailyReview, setIsDailyReview] = useState(false);
  const [isDailyOptimalReview, setIsDailyOptimalReview] = useState(false);
  const [allTimeMode, setAllTimeMode] = useState(false);
  const [dailyDateKey, setDailyDateKey] = useState(getDailyDateKey());
  const [dailyScoresRefreshTick, setDailyScoresRefreshTick] = useState(0);
  const [modeRecords, setModeRecords] = useState(loadAllModeRecords);
  const [collection, setCollection] = useState<PlayerCollection>(() =>
    ensurePlayerCollection(),
  );
  const collectionSyncAttemptedRef = useRef(false);
  const achievementsSyncAttemptedRef = useRef(false);
  const careerSyncAttemptedRef = useRef(false);
  const usageSyncAttemptedRef = useRef(false);
  const eventProfilesSyncAttemptedRef = useRef(false);
  const tierListLibrarySyncAttemptedRef = useRef(false);
  const dailyHistorySyncAttemptedRef = useRef(false);
  const weeklyRecapReturnTabRef = useRef<LandingContentTab>("play");
  const [isPendingQueueMatch, setIsPendingQueueMatch] = useState(false);
  const [matchmakingMode, setMatchmakingMode] = useState<
    GhostMatchmakingMode | null
  >(null);
  const [matchmakingStartedAt, setMatchmakingStartedAt] = useState<number | null>(
    null,
  );
  const [matchmakingElapsedSeconds, setMatchmakingElapsedSeconds] = useState(0);
  const [isCancellingMatchmaking, setIsCancellingMatchmaking] = useState(false);
  const [isMatchmakingInFlight, setIsMatchmakingInFlight] = useState(false);
  const [startMatchError, setStartMatchError] = useState<string | null>(null);
  const [matchmakingNotice, setMatchmakingNotice] = useState<string | null>(null);
  const [deliveredOwnerResults, setDeliveredOwnerResults] = useState<
    DeliveredOwnerResult[]
  >([]);
  const [liveRestoreNotice, setLiveRestoreNotice] = useState<string | null>(null);
  const [privateRoomCode, setPrivateRoomCode] = useState<string | null>(null);
  const [privateRoomExpiresAt, setPrivateRoomExpiresAt] = useState<string | null>(
    null,
  );
  const [opponentCollection, setOpponentCollection] = useState<PlayerCollection | null>(
    null,
  );
  const [landingRenderKey, setLandingRenderKey] = useState(0);
  const [communityHubReturnToken, setCommunityHubReturnToken] = useState(0);
  const [communityComposeToken, setCommunityComposeToken] = useState(0);
  const [landingHubTab, setLandingHubTab] = useState<LandingContentTab>(() =>
    initialLandingDeepLinks.contentTab ?? loadLandingHubTab(),
  );
  const skipPopStateResetRef = useRef(false);
  const pendingFeatureNavigationRef = useRef(false);
  const matchmakingGenerationRef = useRef(0);
  const matchmakingSessionRef = useRef<{
    generation: number;
    mode: GhostMatchmakingMode;
    playerId: string;
    cancelled: boolean;
    privateRoomCode?: string;
    privateRoomRole?: "host" | "guest";
    privateRematchSourceMatchId?: string;
    /** Once set, cancel is ignored — a live match already exists. */
    matchId?: string;
  } | null>(null);
  const [privateRoomRole, setPrivateRoomRole] = useState<
    "host" | "guest" | null
  >(null);
  const [privateRematchWaiting, setPrivateRematchWaiting] = useState(false);
  const [pendingPrivateMatchMode, setPendingPrivateMatchMode] = useState<
    "classic" | "ranked" | null
  >(() =>
    initialLandingDeepLinks.privateRoomCode
      ? (initialLandingDeepLinks.h2hMode ?? "classic")
      : null,
  );
  const [pendingPrivateJoinCode, setPendingPrivateJoinCode] = useState<
    string | null
  >(() => initialLandingDeepLinks.privateRoomCode);
  const liveRecoveryAttemptedRef = useRef(false);
  const todaysDailyDateKey = useDailyDateKey();

  useEffect(() => {
    return capturePwaInstallPrompt();
  }, []);

  useEffect(() => {
    if (phase === "playerUsage" && !isQaRuntimeHost()) {
      setLandingHubTab("account");
      saveLandingHubTab("account");
      setPhase("landing");
      syncLandingDeepLinkUrl({
        hub: "account",
        play: null,
        view: null,
        post: null,
      });
    }
  }, [phase]);

  useEffect(() => {
    if (!initialPublicTierListId) {
      return;
    }

    const state = window.history.state as FeatureHistoryState | null;
    if (!state?.appPhase) {
      window.history.replaceState({ appPhase: "tierList" }, "");
    }
  }, [initialPublicTierListId]);

  useEffect(() => {
    if (initialPublicTierListId) {
      return;
    }

    if (readInitialInternalPlayerUsage()) {
      const state = window.history.state as FeatureHistoryState | null;
      if (!state?.appPhase) {
        window.history.replaceState({ appPhase: "playerUsage" }, "");
      }
      setLandingHubTab("account");
      saveLandingHubTab("account");
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("hub", "player-rates");
        window.history.replaceState(
          { appPhase: "playerUsage" },
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      } catch {
        // Ignore URL rewrite failures.
      }
      return;
    }

    const feature = initialLandingDeepLinks.feature;
    const featurePhase = featurePhaseFromDeepLink(feature);
    if (feature && featurePhase) {
      const state = window.history.state as FeatureHistoryState | null;
      if (!state?.appPhase) {
        window.history.replaceState({ appPhase: featurePhase }, "");
      }
      syncLandingDeepLinkUrl({
        hub: hubParamForFeature(feature),
        view:
          feature === "tierList"
            ? initialLandingDeepLinks.communityView
            : null,
        post:
          feature === "tierList"
            ? initialLandingDeepLinks.communityPostId
            : null,
      });
      return;
    }

    if (
      initialLandingDeepLinks.contentTab ||
      initialLandingDeepLinks.playSection
    ) {
      syncLandingDeepLinkUrl({
        hub: initialLandingDeepLinks.contentTab ?? "play",
        play:
          initialLandingDeepLinks.contentTab === "play" ||
          initialLandingDeepLinks.playSection
            ? initialLandingDeepLinks.playSection ?? undefined
            : undefined,
        h2hMode: initialLandingDeepLinks.h2hMode,
        room: null,
      });
    }
  }, [initialLandingDeepLinks, initialPublicTierListId]);

  useEffect(() => {
    if (collectionSyncAttemptedRef.current || phase !== "landing") {
      return;
    }

    collectionSyncAttemptedRef.current = true;

    void (async () => {
      const merged = await pullAndMergeCollection();
      if (merged) {
        setCollection(merged);
      }
    })();
  }, [phase]);

  useEffect(() => {
    if (achievementsSyncAttemptedRef.current || phase !== "landing") {
      return;
    }

    achievementsSyncAttemptedRef.current = true;
    void pullAndMergeAchievements();
  }, [phase]);

  useEffect(() => {
    if (careerSyncAttemptedRef.current || phase !== "landing") {
      return;
    }

    careerSyncAttemptedRef.current = true;
    void (async () => {
      const merged = await pullAndMergeCareerStats();
      if (merged) {
        setModeRecords(loadAllModeRecords());
      }
    })();
  }, [phase]);

  useEffect(() => {
    if (usageSyncAttemptedRef.current || phase !== "landing") {
      return;
    }

    usageSyncAttemptedRef.current = true;
    void pullAndMergeNbaPlayerUsage();
  }, [phase]);

  useEffect(() => {
    if (eventProfilesSyncAttemptedRef.current || phase !== "landing") {
      return;
    }

    eventProfilesSyncAttemptedRef.current = true;
    void pullAndMergeEventProfiles();
  }, [phase]);

  useEffect(() => {
    if (tierListLibrarySyncAttemptedRef.current || phase !== "landing") {
      return;
    }

    tierListLibrarySyncAttemptedRef.current = true;
    void pullAndMergeTierListLibrary();
  }, [phase]);

  useEffect(() => {
    if (dailyHistorySyncAttemptedRef.current || phase !== "landing") {
      return;
    }

    dailyHistorySyncAttemptedRef.current = true;
    void pullAndMergeDailyDraftHistory();
  }, [phase]);

  useEffect(() => {
    if (liveRecoveryAttemptedRef.current || phase !== "landing") {
      return;
    }

    liveRecoveryAttemptedRef.current = true;

    void (async () => {
      const restored = await restoreLiveDraftSession();

      if (restored.status === "unavailable") {
        // Keep session and allow a manual retry — do not permanently burn recovery.
        liveRecoveryAttemptedRef.current = false;
        setLiveRestoreNotice(
          "Couldn't reconnect to your live draft. Check your connection and try again.",
        );
        return;
      }

      if (restored.status !== "restored") {
        setLiveRestoreNotice(null);
        return;
      }

      setLiveRestoreNotice(null);
      setUser(restored.state.user);
      setOpponent(restored.state.opponent);
      setDraftStep(restored.state.draftStep);
      setMatchId(restored.state.matchId);
      setDraftSessionKey(restored.state.matchId);
      setOpponentPickCount(restored.state.opponent.lineup.length);
      setOpponentComplete(restored.state.opponentComplete);
      setOpponentAutoDrafted(Boolean(restored.state.opponentAutoDrafted));
      setIsPendingQueueMatch(false);
      setIsDailyDraft(false);
      setPhase(restored.state.opponentComplete ? "results" : restored.state.phase);
    })();
  }, [phase, landingRenderKey]);

  useEffect(() => {
    if (phase !== "landing" || deliveredOwnerResults.length > 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const playerId = getOrCreatePlayerIdentity().playerId;
      const deliveries: DeliveredOwnerResult[] = [];

      for (const mode of ["classic", "ranked"] as const) {
        if (cancelled) {
          break;
        }

        const batch = await fetchDeliverableOwnerResults(mode, playerId);
        deliveries.push(...batch);
      }

      if (!cancelled && deliveries.length > 0) {
        setDeliveredOwnerResults(deliveries);
        setModeRecords(loadAllModeRecords());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deliveredOwnerResults.length, phase, landingRenderKey]);

  useEffect(() => {
    if (!user || !opponent?.isLiveOpponent || !opponent.liveMatchId) {
      return;
    }

    if (!opponent.liveOpponentPlayerId) {
      return;
    }

    saveLiveDraftSession({
      matchId: opponent.liveMatchId,
      mode: user.eventId ? "event" : user.salaryCapMode ? "ranked" : "classic",
      playerId: getOrCreatePlayerIdentity().playerId,
      teamName: user.name,
      teamAccent: user.accent,
      draftSlots: user.draftSlots,
      lineup: user.lineup.filter((playerId): playerId is string => Boolean(playerId)),
      draftStep,
      opponentTeamName: opponent.name,
      opponentElo:
        opponent.rankedOpponentElo ??
        opponent.classicOpponentElo ??
        RANKED_STARTING_ELO,
      opponentPlayerId: opponent.liveOpponentPlayerId,
      opponentUsername: opponent.username,
      opponentDraftSlots: opponent.draftSlots,
      salaryCapMode: Boolean(user.salaryCapMode),
      salaryCapLimit: user.salaryCapLimit,
      privateMatch: Boolean(user.privateMatch),
      eventId: user.eventId,
      eventRestriction: user.eventRestriction,
      phase: phase === "waiting" ? "waiting" : "drafting",
      savedAt: new Date().toISOString(),
    });
  }, [draftStep, opponent, phase, user]);

  useEffect(() => {
    if (phase === "results" && opponent?.isLiveOpponent) {
      clearLiveDraftSession();
    }
  }, [opponent?.isLiveOpponent, phase]);

  useEffect(() => {
    ensureCurrentRankedSeason();
    ensureClassicProfile();
    ensureNpcOpponentPool();
  }, []);

  useEffect(() => {
    if (!matchmakingMode || matchmakingStartedAt == null) {
      setMatchmakingElapsedSeconds(0);
      return;
    }

    const tick = () => {
      setMatchmakingElapsedSeconds(
        getMatchmakingElapsedSeconds(matchmakingStartedAt, Date.now()),
      );
    };

    tick();
    const intervalId = window.setInterval(tick, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [matchmakingMode, matchmakingStartedAt]);

  useEffect(() => {
    if (phase !== "landing") {
      return;
    }

    const refreshDailyScores = async () => {
      const todayKey = getDailyDateKey();
      const playerId = getOrCreatePlayerIdentity().playerId;

      await Promise.all(
        DAILY_DRAFT_MODES.map(async (mode) => {
          const entry = findPlayerDailyDraftEntry(todayKey, playerId, mode);
          const goalId =
            entry?.goalId ?? getDailyDraftSetup(todayKey, mode).goal.id;

          await refreshDailyDraftScoresFromApi(
            todayKey,
            goalId,
            playerId,
            mode,
          );
        }),
      );
      setDailyScoresRefreshTick((current) => current + 1);
    };

    const refreshSeasonLeaderboards = async () => {
      const seasonId = getCurrentSeasonId();
      await Promise.all([
        refreshLeaderboardFromApi({
          mode: "classic",
          sort: "elo",
          limit: LEADERBOARD_LIMIT,
          seasonId,
        }),
        refreshLeaderboardFromApi({
          mode: "ranked",
          sort: "elo",
          limit: RANKED_LEADERBOARD_LIMIT,
          seasonId,
        }),
      ]);
    };

    void refreshDailyScores();
    void refreshSeasonLeaderboards();
    const intervalId = window.setInterval(() => {
      void refreshDailyScores();
    }, 15_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "landing") {
      return;
    }
    return scheduleIdleHubPrefetch();
  }, [phase]);

  const activePlayers = useMemo(
    () => getActivePlayerPool({ allTimeMode }),
    [allTimeMode],
  );

  const eventRestriction = user?.eventRestriction;

  const applyRankedEventBans = shouldApplyRankedEventPlayerBans({
    isDailyDraft,
    practiceMode: user?.practiceMode,
    eventId: user?.eventId,
    salaryCapMode: user?.salaryCapMode,
    classicLive:
      Boolean(user) &&
      !isDailyDraft &&
      !user?.practiceMode &&
      !user?.eventId &&
      !user?.salaryCapMode,
  });

  // Full board pool (banned players stay visible with a Banned label).
  const draftablePlayers = useMemo(() => {
    if (isDailyDraft) {
      return activePlayers;
    }

    return eventRestriction
      ? filterPlayersForEventRestriction(activePlayers, eventRestriction)
      : getDraftablePlayers(activePlayers, collection);
  }, [activePlayers, collection, eventRestriction, isDailyDraft]);

  // Auto-draft / bots never select competitively banned players.
  const pickableDraftPlayers = useMemo(
    () =>
      applyRankedEventBans
        ? filterOutRankedEventBannedPlayers(draftablePlayers)
        : draftablePlayers,
    [applyRankedEventBans, draftablePlayers],
  );

  const opponentDraftablePlayers = useMemo(() => {
    const pool = eventRestriction
      ? filterPlayersForEventRestriction(activePlayers, eventRestriction)
      : user?.practiceMode
        ? // Practice bots always mirror the user's unlocked/draftable pool.
          getDraftablePlayers(activePlayers, collection)
        : opponentCollection
          ? getDraftablePlayers(activePlayers, opponentCollection)
          : activePlayers;

    return applyRankedEventBans
      ? filterOutRankedEventBannedPlayers(pool)
      : pool;
  }, [
    activePlayers,
    applyRankedEventBans,
    collection,
    eventRestriction,
    opponentCollection,
    user?.practiceMode,
  ]);
  const opponentDraftablePlayersRef = useRef(opponentDraftablePlayers);

  opponentDraftablePlayersRef.current = opponentDraftablePlayers;

  const dailySetup = useMemo(() => {
    if (!isDailyDraft) {
      return null;
    }

    if (isDailyOptimalReview) {
      return getDailyDraftSetup(dailyDateKey, dailyDraftMode);
    }

    if (isDailyReview) {
      return getResolvedDailyDraftSetup(dailyDateKey, undefined, dailyDraftMode);
    }

    return getDailyDraftSetup(dailyDateKey, dailyDraftMode);
  }, [
    dailyDateKey,
    dailyDraftMode,
    isDailyDraft,
    isDailyOptimalReview,
    isDailyReview,
  ]);

  const buildLandingDailySnapshot = useCallback(
    (mode: DailyDraftMode) => {
      const setup = getDailyDraftSetup(todaysDailyDateKey, mode);
      const entry = findPlayerDailyDraftEntry(todaysDailyDateKey, undefined, mode);
      const goal =
        entry?.goalId && getDailyGoalById(entry.goalId)?.mode === mode
          ? getDailyGoalById(entry.goalId)!
          : setup.goal;
      const benchmarkValues = simulateDailyBenchmarkValues(
        activePlayers,
        setup.slots,
        goal,
        todaysDailyDateKey,
      );
      const percentileLabel = entry
        ? formatPlayerDailyDraftPercentile(
            resolvePlayerDailyDraftPercentile(
              todaysDailyDateKey,
              entry,
              goal,
              benchmarkValues,
            ),
          )
        : null;

      return {
        setup,
        entry,
        goal,
        percentileLabel,
        canViewLineup: Boolean(entry?.lineup && entry.lineup.length >= 5),
      };
    },
    [activePlayers, todaysDailyDateKey, dailyScoresRefreshTick],
  );

  const landingBasicDaily = useMemo(
    () => buildLandingDailySnapshot("basic"),
    [buildLandingDailySnapshot],
  );

  const landingAdvancedDaily = useMemo(
    () => buildLandingDailySnapshot("advanced"),
    [buildLandingDailySnapshot],
  );

  const dailyBenchmarkValues = useMemo(() => {
    if (!dailySetup) {
      return [];
    }

    return simulateDailyBenchmarkValues(
      activePlayers,
      dailySetup.slots,
      dailySetup.goal,
      dailyDateKey,
    );
  }, [activePlayers, dailyDateKey, dailySetup]);

  const userLineupIds = (user?.lineup ?? []).filter(
    (playerId): playerId is string => Boolean(playerId),
  );
  const opponentLineupIds = (opponent?.lineup ?? []).filter(
    (playerId): playerId is string => Boolean(playerId),
  );
  const userLineup = getPlayersByIdFromActivePool(userLineupIds, {
    allTimeMode,
  });
  const opponentLineup = getPlayersByIdFromActivePool(opponentLineupIds, {
    allTimeMode,
  });
  const userLineupComplete = isCompleteLineupFromActivePool(userLineupIds, {
    allTimeMode,
  });
  const opponentLineupComplete = isCompleteLineupFromActivePool(
    opponentLineupIds,
    { allTimeMode },
  );
  const userDraftComplete =
    draftStep >= 5 &&
    (user?.lineup.filter((playerId): playerId is string => Boolean(playerId))
      .length ?? 0) >= 5;

  const ensureDraftOnboarding = useCallback(
    (context: DraftOnboardingContext) => {
      if (hasSeenDraftOnboarding()) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        draftOnboardingResolverRef.current = resolve;
        setDraftOnboarding(context);
        setShowDraftOnboarding(true);
      });
    },
    [],
  );

  const dismissDraftOnboarding = useCallback(() => {
    markDraftOnboardingSeen();
    setShowDraftOnboarding(false);
    const resolve = draftOnboardingResolverRef.current;
    draftOnboardingResolverRef.current = null;
    resolve?.();
  }, []);

  const startMatch = async (
    team: TeamProfile,
    options: StartDraftOptions = {},
  ): Promise<StartMatchResult> => {
    // Unlock while still in the click gesture so countdown ticks can play later.
    unlockDraftClockAudio();

    const practiceMode = Boolean(options.practiceMode);
    const privateMatch = Boolean(options.privateMatch);

    // Practice can always restart; pending unlocks only block ranked/classic starts.
    if (collection.pendingUnlock && !practiceMode) {
      setStartMatchError(getStartMatchErrorMessage("pending_unlock"));
      return "failed";
    }

    setStartMatchError(null);
    setMatchmakingNotice(null);

    if (options.allTimeMode && !isAllTimeModePlayable()) {
      return "failed";
    }

    const daily = Boolean(options.isDailyDraft);
    const nextDailyDraftMode = options.dailyDraftMode ?? "basic";
    let salaryCapMode = Boolean(options.salaryCapMode);
    const nextAllTimeMode = Boolean(options.allTimeMode);
    const eventId = options.eventId;
    const eventMode = Boolean(eventId);
    const eventRestriction = options.eventRestriction as
      | EventRestrictionId
      | undefined;
    const dateKey = getDailyDateKey();
    const setup = daily ? getDailyDraftSetup(dateKey, nextDailyDraftMode) : null;

    if (daily && hasCompletedDailyDraft(dateKey, nextDailyDraftMode)) {
      return "failed";
    }

    if (eventMode && eventId && !canPlayEventMatch(eventId)) {
      setStartMatchError(getStartMatchErrorMessage("event_limit_reached"));
      return "failed";
    }

    const pool = getActivePlayerPool({
      allTimeMode: nextAllTimeMode,
    });
    let salaryCapLimit =
      eventMode
        ? options.salaryCapLimit ?? RANKED_SALARY_CAP
        : practiceMode
          ? options.salaryCapLimit ?? RANKED_SALARY_CAP
          : daily || nextAllTimeMode
            ? undefined
            : salaryCapMode
              ? RANKED_SALARY_CAP
              : CLASSIC_HEAD_TO_HEAD_SALARY_CAP;

    // Show first-draft instructions before matchmaking or the pick timer starts.
    await ensureDraftOnboarding({
      hasSalaryCap: salaryCapLimit != null,
      isDailyDraft: daily,
      isCompetitive: !daily && !practiceMode && !privateMatch,
    });

    const applyStartBans = shouldApplyRankedEventPlayerBans({
      isDailyDraft: daily,
      practiceMode,
      eventId,
      salaryCapMode,
      classicLive:
        !daily && !practiceMode && !eventId && !salaryCapMode && !nextAllTimeMode,
    });
    const withStartBans = <T extends { id: string }>(candidatePool: T[]) =>
      applyStartBans
        ? filterOutRankedEventBannedPlayers(candidatePool)
        : candidatePool;
    const eventPool =
      eventMode && eventRestriction
        ? withStartBans(
            filterPlayersForEventRestriction(pool, eventRestriction),
          )
        : null;
    const draftPool = daily
      ? pool
      : eventPool
        ? eventPool
        : withStartBans(getDraftablePlayers(pool, collection));
    let ghostOpponent: GhostOpponentSnapshot | null = null;
    let liveOpponent: LiveOpponentSnapshot | null = null;
    let isPendingQueue = false;
    let activeMatchmakingGeneration: number | null = null;

    if (privateMatch) {
      const privateRematch = options.privateRematch;
      const privateRoom = options.privateRoom;
      if (!privateRoom && !privateRematch) {
        setStartMatchError(getStartMatchErrorMessage("setup_failed"));
        return "failed";
      }

      const requestedMode: GhostMatchmakingMode = salaryCapMode
        ? "ranked"
        : "classic";
      const playerId = getOrCreatePlayerIdentity().playerId;
      const previousSession = matchmakingSessionRef.current;

      if (previousSession) {
        previousSession.cancelled = true;
      }

      const generation = ++matchmakingGenerationRef.current;
      activeMatchmakingGeneration = generation;
      const session = {
        generation,
        mode: requestedMode,
        playerId,
        cancelled: false,
        privateRoomCode: undefined as string | undefined,
        privateRoomRole: privateRoom?.role as "host" | "guest" | undefined,
        privateRematchSourceMatchId: privateRematch?.previousMatchId,
        matchId: undefined as string | undefined,
      };
      matchmakingSessionRef.current = session;
      setIsMatchmakingInFlight(true);
      setIsCancellingMatchmaking(false);
      setMatchmakingStartedAt(Date.now());
      // Keep the private-match modal open until host create / guest join
      // succeeds — opening the overlay early closed the modal and could leave
      // hub scroll locked when the room code was invalid.
      // Rematch shows the overlay immediately while waiting on the opponent.
      setMatchmakingMode(privateRematch ? requestedMode : null);
      setMatchedOpponentName(null);
      setPrivateRoomCode(null);
      setPrivateRoomExpiresAt(null);
      setPrivateRoomRole(privateRoom?.role ?? null);
      setPrivateRematchWaiting(Boolean(privateRematch));

      const elo = salaryCapMode
        ? ensureCurrentRankedSeason().elo
        : ensureClassicProfile().elo;

      try {
        if (privateRematch) {
          const offered = await offerPrivateRematch({
            sourceMatchId: privateRematch.previousMatchId,
            playerId,
            teamName: team.name,
            elo,
          });

          if ("error" in offered) {
            setStartMatchError(offered.error);
            return "failed";
          }

          setPrivateRoomExpiresAt(offered.status === "waiting" ? offered.expiresAt : null);

          let matched =
            offered.status === "matched"
              ? offered
              : null;

          if (!matched) {
            const waited = await waitForPrivateRematch(
              {
                sourceMatchId: privateRematch.previousMatchId,
                playerId,
              },
              { isCancelled: () => session.cancelled && !session.matchId },
            );

            if (!waited.ok) {
              if (waited.error === "expired") {
                setStartMatchError(
                  "Rematch timed out. Ask your opponent to press Rematch again.",
                );
                return "failed";
              }
              if (waited.error === "setup_failed") {
                setStartMatchError(
                  "Private rematch is temporarily unavailable. Try again in a moment.",
                );
                return "failed";
              }
              return "cancelled";
            }

            matched = waited.matched;
          }

          liveOpponent = matched.opponent;
          session.matchId = matched.matchId;
          salaryCapMode = matched.mode === "ranked";
          salaryCapLimit = salaryCapMode
            ? RANKED_SALARY_CAP
            : CLASSIC_HEAD_TO_HEAD_SALARY_CAP;
          session.mode = matched.mode;
          setMatchmakingMode(matched.mode);
        } else if (privateRoom!.role === "host") {
          const created = await createPrivateRoom({
            mode: requestedMode,
            playerId,
            teamName: team.name,
            elo,
          });

          if ("error" in created) {
            setStartMatchError(created.error);
            return "failed";
          }

          session.privateRoomCode = created.roomCode;
          setPrivateRoomCode(created.roomCode);
          setPrivateRoomExpiresAt(created.expiresAt);
          setMatchmakingMode(requestedMode);

          const waited = await waitForPrivateRoomGuest(
            { roomCode: created.roomCode, playerId },
            { isCancelled: () => session.cancelled && !session.matchId },
          );

          if (!waited.ok) {
            if (waited.error === "expired") {
              setStartMatchError("Private room expired. Create a new one.");
              return "failed";
            }
            if (waited.error === "setup_failed") {
              setStartMatchError(
                "Private match servers are temporarily unavailable. Try again in a moment.",
              );
              return "failed";
            }
            return "cancelled";
          }

          liveOpponent = waited.matched.opponent;
          session.matchId = waited.matched.matchId;
          salaryCapMode = waited.matched.mode === "ranked";
          salaryCapLimit = salaryCapMode
            ? RANKED_SALARY_CAP
            : CLASSIC_HEAD_TO_HEAD_SALARY_CAP;
          session.mode = waited.matched.mode;
          setMatchmakingMode(waited.matched.mode);
        } else {
          const joined = await joinPrivateRoom({
            roomCode: privateRoom!.roomCode,
            playerId,
            teamName: team.name,
            elo,
            expectedMode: requestedMode,
          });

          if ("error" in joined) {
            setStartMatchError(joined.error);
            return "failed";
          }

          session.privateRoomCode = privateRoom!.roomCode;
          setPrivateRoomCode(privateRoom!.roomCode);
          liveOpponent = joined.opponent;
          session.matchId = joined.matchId;
          salaryCapMode = joined.mode === "ranked";
          salaryCapLimit = salaryCapMode
            ? RANKED_SALARY_CAP
            : CLASSIC_HEAD_TO_HEAD_SALARY_CAP;
          session.mode = joined.mode;
          setMatchmakingMode(joined.mode);
        }

        if (!liveOpponent) {
          return session.cancelled ? "cancelled" : "failed";
        }

        setMatchedOpponentName(
          formatOpponentDisplayName(
            liveOpponent.teamName,
            liveOpponent.username,
          ),
        );
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 1200);
        });

        // Cancel is ignored once a live match exists.
        if (session.cancelled && !session.matchId) {
          return "cancelled";
        }
      } finally {
        // Clear sticky rematch ready if we never entered a live match — otherwise
        // the opponent can rematch into a lobby this client already abandoned.
        if (privateRematch && !session.matchId) {
          void cancelPrivateRematch({
            sourceMatchId: privateRematch.previousMatchId,
            playerId,
          });
        }

        if (matchmakingSessionRef.current?.generation === generation) {
          matchmakingSessionRef.current = null;
          setMatchmakingMode(null);
          setMatchmakingStartedAt(null);
          setMatchedOpponentName(null);
          setPrivateRoomCode(null);
          setPrivateRoomExpiresAt(null);
          setPrivateRoomRole(null);
          setPrivateRematchWaiting(false);
        }

        setIsCancellingMatchmaking(false);

        if (matchmakingGenerationRef.current === generation) {
          setIsMatchmakingInFlight(false);
        }
      }
    } else if (!daily && !nextAllTimeMode && !practiceMode) {
      const nextMatchmakingMode: GhostMatchmakingMode = eventMode
        ? "event"
        : salaryCapMode
          ? "ranked"
          : "classic";
      const playerId = getOrCreatePlayerIdentity().playerId;
      const previousSession = matchmakingSessionRef.current;

      if (previousSession) {
        previousSession.cancelled = true;
      }

      const generation = ++matchmakingGenerationRef.current;
      activeMatchmakingGeneration = generation;
      const session = {
        generation,
        mode: nextMatchmakingMode,
        playerId,
        cancelled: false,
        matchId: undefined as string | undefined,
      };
      matchmakingSessionRef.current = session;
      setIsMatchmakingInFlight(true);
      setIsCancellingMatchmaking(false);
      setMatchmakingStartedAt(Date.now());
      setMatchmakingMode(nextMatchmakingMode);
      setMatchedOpponentName(null);
      setPrivateRoomRole(null);

      const elo = eventMode
        ? loadEventProfile(eventId!).elo
        : salaryCapMode
          ? ensureCurrentRankedSeason().elo
          : ensureClassicProfile().elo;

      try {
        const resolution = eventMode
          ? await planEventLiveMatchmaking(
              {
                playerId,
                playerElo: elo,
                teamName: team.name,
              },
              { isCancelled: () => session.cancelled && !session.matchId },
            )
          : await planHeadToHeadMatchmaking(
              {
                mode: nextMatchmakingMode,
                playerId,
                playerElo: elo,
                teamName: team.name,
                starCount: countUnlockedAllStars(collection),
              },
              { isCancelled: () => session.cancelled && !session.matchId },
            );

        if (!resolution.ok) {
          if (resolution.error === "cancelled") {
            return "cancelled";
          }

          setStartMatchError(getStartMatchErrorMessage(resolution.error));
          return "failed";
        }

        if (resolution.plan.kind === "live") {
          liveOpponent = resolution.plan.live;
          session.matchId = liveOpponent.matchId;
        } else if (resolution.plan.kind === "ghost") {
          ghostOpponent = resolution.plan.ghost;
          setMatchmakingNotice(
            resolution.plan.liveUnavailable
              ? "Live search was unavailable — playing a recorded lineup."
              : "Matched with a recorded lineup (not a live opponent).",
          );
        } else if (resolution.plan.kind === "queue_for_live") {
          isPendingQueue = true;
          if (resolution.plan.liveUnavailable) {
            setMatchmakingNotice(
              "Live search was unavailable — your lineup will wait in the queue.",
            );
          }
        } else if (resolution.plan.kind === "npc") {
          setMatchmakingNotice(
            resolution.plan.liveUnavailable
              ? "Live search was unavailable — matched you with a simulated opponent."
              : "Matched with a simulated opponent (not a live player).",
          );
        }

        // Ghost / queue plans can still be abandoned; live matches cannot.
        if (session.cancelled && !session.matchId) {
          return "cancelled";
        }

        const foundOpponentName = liveOpponent
          ? formatOpponentDisplayName(
              liveOpponent.teamName,
              liveOpponent.username,
            )
          : ghostOpponent
            ? formatOpponentDisplayName(
                ghostOpponent.teamName,
                ghostOpponent.username,
              )
            : null;

        if (foundOpponentName) {
          setMatchedOpponentName(foundOpponentName);
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 1600);
          });
        }

        if (session.cancelled && !session.matchId) {
          return "cancelled";
        }
      } finally {
        if (matchmakingSessionRef.current?.generation === generation) {
          matchmakingSessionRef.current = null;
          setMatchmakingMode(null);
          setMatchmakingStartedAt(null);
          setMatchedOpponentName(null);
        }

        setIsCancellingMatchmaking(false);

        if (matchmakingGenerationRef.current === generation) {
          setIsMatchmakingInFlight(false);
        }
      }
    }

    if (
      activeMatchmakingGeneration != null &&
      activeMatchmakingGeneration !== matchmakingGenerationRef.current
    ) {
      return "cancelled";
    }

    if (eventMode && !liveOpponent) {
      setStartMatchError(getStartMatchErrorMessage("setup_failed"));
      return "failed";
    }

    const nextOpponentCollection = resolveOpponentCollectionForMatch({
      userCollection: collection,
      practiceMode,
      skipCollectionFilter: daily || isPendingQueue || eventMode,
    });
    const opponentPool = eventPool
      ? eventPool
      : withStartBans(
          nextOpponentCollection
            ? getDraftablePlayers(pool, nextOpponentCollection)
            : pool,
        );
    const setupSlots = setup?.slots;
    const sharedSlots = options.sharedDraftSlots;
    const slotsAreFeasible = (
      players: typeof draftPool,
      slots: ReturnType<typeof generateFeasibleDraftSlots>,
    ) =>
      salaryCapLimit != null
        ? validateDraftSlotsFeasibleUnderSalaryCap(
            players,
            slots,
            salaryCapLimit,
          )
        : validateDraftSlotsFeasible(players, slots);

    let userSlots =
      sharedSlots ?? setupSlots ?? generateFeasibleDraftSlots(draftPool);
    if (
      !sharedSlots &&
      salaryCapLimit != null &&
      !slotsAreFeasible(draftPool, userSlots)
    ) {
      userSlots = generateFeasibleDraftSlotsUnderSalaryCap(
        draftPool,
        salaryCapLimit,
      );
    }

    let opponentSlots =
      daily || isPendingQueue
        ? null
        : sharedSlots
          ? [...sharedSlots]
          : createOpponentDraftSlots(practiceMode || eventMode ? draftPool : opponentPool);
    if (
      opponentSlots &&
      !sharedSlots &&
      salaryCapLimit != null &&
      !slotsAreFeasible(opponentPool, opponentSlots)
    ) {
      opponentSlots = generateFeasibleDraftSlotsUnderSalaryCap(
        opponentPool,
        salaryCapLimit,
      );
    }

    if (
      userSlots.length === 0 ||
      !slotsAreFeasible(draftPool, userSlots) ||
      (!daily &&
        !isPendingQueue &&
        !nextAllTimeMode &&
        !practiceMode &&
        !eventMode &&
        (!opponentSlots ||
          opponentSlots.length === 0 ||
          !slotsAreFeasible(opponentPool, opponentSlots)))
    ) {
      setStartMatchError(getStartMatchErrorMessage("setup_failed"));
      return "failed";
    }

    if (
      (practiceMode || eventMode) &&
      (!opponentSlots ||
        opponentSlots.length === 0 ||
        !slotsAreFeasible(draftPool, opponentSlots))
    ) {
      setStartMatchError(getStartMatchErrorMessage("setup_failed"));
      return "failed";
    }

    // Don't persist a placeholder daily/practice name over a real team profile.
    if (!((daily || practiceMode) && loadTeamProfile() == null)) {
      saveTeamProfile(team);
    }
    setModeRecords(loadAllModeRecords());
    setIsDailyDraft(daily);
    setDailyDraftMode(daily ? nextDailyDraftMode : "basic");
    setIsDailyReview(false);
    setAllTimeMode(nextAllTimeMode);
    setIsPendingQueueMatch(isPendingQueue);
    setDailyDateKey(dateKey);
    setUser(
      createUserDrafter(team, userSlots, {
        isDailyDraft: daily,
        dailyDraftMode: daily ? nextDailyDraftMode : undefined,
        dailyChallengeTitle: setup?.challenge.title,
        salaryCapMode: eventMode ? true : salaryCapMode,
        salaryCapLimit,
        allTimeMode: nextAllTimeMode,
        practiceMode,
        privateMatch,
        eventId,
        eventRestriction,
        sharedDraftSlots: sharedSlots,
      }),
    );
    setOpponent(
      isPendingQueue
        ? null
        : liveOpponent && opponentSlots
          ? {
              ...createLiveOpponent(opponentSlots, liveOpponent, {
                salaryCapMode: eventMode || salaryCapMode,
              }),
              eventId,
              eventRestriction,
            }
          : ghostOpponent && opponentSlots
            ? createGhostOpponent(opponentSlots, ghostOpponent, { salaryCapMode })
            : opponentSlots
              ? practiceMode
                ? {
                    ...createClassicOpponent(opponentSlots, { salaryCapLimit }),
                    practiceMode: true,
                  }
                : salaryCapMode
                  ? createRankedOpponent(opponentSlots)
                  : nextAllTimeMode
                    ? createAllTimeOpponent(opponentSlots)
                    : createClassicOpponent(opponentSlots)
              : null,
    );
    setOpponentCollection(nextOpponentCollection);
    setDraftStep(0);
    setOpponentPickCount(ghostOpponent ? ghostOpponent.lineup.length : 0);
    setOpponentComplete(daily || isPendingQueue || Boolean(ghostOpponent));
    setOpponentAutoDrafted(false);
    const nextMatchId =
      liveOpponent?.matchId ??
      (!daily && !isPendingQueue
        ? typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `match-${Date.now()}`
        : null);
    setMatchId(nextMatchId);
    setDraftSessionKey(
      liveOpponent?.matchId ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `draft-${Date.now()}`),
    );

    if (liveOpponent && opponentSlots) {
      saveLiveDraftSession({
        matchId: liveOpponent.matchId,
        mode: eventMode ? "event" : salaryCapMode ? "ranked" : "classic",
        playerId: getOrCreatePlayerIdentity().playerId,
        teamName: team.name,
        teamAccent: "#2563eb",
        draftSlots: userSlots,
        lineup: [],
        draftStep: 0,
        opponentTeamName: liveOpponent.teamName,
        opponentElo: liveOpponent.elo,
        opponentPlayerId: liveOpponent.playerId,
        opponentUsername: liveOpponent.username,
        opponentDraftSlots: opponentSlots,
        salaryCapMode: eventMode || salaryCapMode,
        salaryCapLimit,
        privateMatch,
        eventId,
        eventRestriction,
        phase: "drafting",
        savedAt: new Date().toISOString(),
      });
    }

    setPhase("drafting");
    return "started";
  };

  const cancelMatchmaking = useCallback(async () => {
    const session = matchmakingSessionRef.current;

    if (!session || session.cancelled) {
      return;
    }

    // A live match already exists — cancelling would orphan the opponent.
    if (session.matchId) {
      return;
    }

    session.cancelled = true;
    setStartMatchError(null);
    setIsCancellingMatchmaking(true);
    trackProductEvent("matchmaking_cancel", { mode: session.mode });
    // Keep the overlay visible until search resolves to cancelled or matched.
    // Clearing matchmakingMode here made cancel look done while a late match
    // could still drop the player into draft.

    if (session.privateRoomCode && session.privateRoomRole === "host") {
      await cancelPrivateRoom({
        roomCode: session.privateRoomCode,
        playerId: session.playerId,
      });
      return;
    }

    if (session.privateRematchSourceMatchId) {
      await cancelPrivateRematch({
        sourceMatchId: session.privateRematchSourceMatchId,
        playerId: session.playerId,
      });
      return;
    }

    // Guest join is a single POST; aborting locally is enough.
    if (session.privateRoomRole === "guest") {
      return;
    }

    await leaveMatchmakingQueue({
      mode: session.mode,
      playerId: session.playerId,
    });
  }, []);

  const viewDailyLineup = useCallback((mode: DailyDraftMode = "basic"): boolean => {
    const dateKey = getDailyDateKey();
    const entry = findPlayerDailyDraftEntry(dateKey, undefined, mode);

    if (!entry?.lineup || entry.lineup.length < 5) {
      return false;
    }

    const setup = getResolvedDailyDraftSetup(dateKey, undefined, mode);

    const team =
      loadTeamProfile() ??
      (entry.teamName ? { name: entry.teamName } : { name: "Daily Draft" });

    setDailyDraftMode(mode);
    setIsDailyDraft(true);
    setIsDailyReview(true);
    setIsDailyOptimalReview(false);
    setDailyDateKey(dateKey);
    setUser({
      ...createUserDrafter(team, setup.slots, {
        isDailyDraft: true,
        dailyDraftMode: mode,
        dailyChallengeTitle: setup.challenge.title,
      }),
      lineup: entry.lineup,
    });
    setOpponent(null);
    setOpponentCollection(null);
    setDraftStep(5);
    setOpponentPickCount(0);
    setOpponentComplete(true);
    setMatchId(null);
    setDraftSessionKey(null);
    setIsPendingQueueMatch(false);
    setPhase("results");
    return true;
  }, []);

  const viewYesterdayBestDailyLineup = useCallback(
    async (mode: DailyDraftMode = "basic"): Promise<boolean> => {
      const setup = getYesterdayBestDailyDraftSetup(getDailyDateKey(), mode);
      const yesterdayKey = setup.dateKey;
      const playerId = getOrCreatePlayerIdentity().playerId;
      await refreshCanonicalDailyGoalData(yesterdayKey, playerId, mode);
      const pool = getActivePlayerPool({ allTimeMode: false });
      const bestLineup = solveBestDailyDraftLineup(
        pool,
        setup.slots,
        setup.goal,
        yesterdayKey,
      );

      if (bestLineup.length < 5) {
        return false;
      }

      const team =
        loadTeamProfile() ??
        ({
          name: "Daily Draft",
        } satisfies TeamProfile);

      setDailyDraftMode(mode);
      setIsDailyDraft(true);
      setIsDailyReview(true);
      setIsDailyOptimalReview(true);
      setDailyDateKey(yesterdayKey);
      setUser({
        ...createUserDrafter(team, setup.slots, {
          isDailyDraft: true,
          dailyDraftMode: mode,
          dailyChallengeTitle: setup.challenge.title,
        }),
        lineup: bestLineup.map((player) => player.id),
      });
      setOpponent(null);
      setOpponentCollection(null);
      setDraftStep(5);
      setOpponentPickCount(0);
      setOpponentComplete(true);
      setMatchId(null);
      setDraftSessionKey(null);
      setIsPendingQueueMatch(false);
      setPhase("results");
      return true;
    },
    [modeRecords.allTime],
  );

  const resetToLanding = (options?: {
    error?: string | null;
    preserveError?: boolean;
    preserveLiveSession?: boolean;
  }) => {
    if (options?.preserveLiveSession) {
      liveRecoveryAttemptedRef.current = true;
    } else {
      clearLiveDraftSession();
    }
    setUser(null);
    setOpponent(null);
    setOpponentCollection(null);
    setDraftStep(0);
    setOpponentPickCount(0);
    setOpponentComplete(false);
    setOpponentAutoDrafted(false);
    setMatchId(null);
    setDraftSessionKey(null);
    setIsPendingQueueMatch(false);
    setMatchmakingMode(null);
    setMatchmakingStartedAt(null);
    setIsCancellingMatchmaking(false);
    setIsMatchmakingInFlight(false);
    setIsDailyDraft(false);
    setDailyDraftMode("basic");
    setIsDailyReview(false);
    setIsDailyOptimalReview(false);
    setDailyDateKey(getDailyDateKey());
    setAllTimeMode(false);
    setShowDraftOnboarding(false);
    setMatchedOpponentName(null);
    setPrivateRoomCode(null);
    setPrivateRoomExpiresAt(null);
    setPrivateRoomRole(null);
    setPrivateRematchWaiting(false);
    draftOnboardingResolverRef.current = null;
    if (!options?.preserveError) {
      setStartMatchError(options?.error ?? null);
    }
    setMatchmakingNotice(null);
    setLiveRestoreNotice(
      options?.preserveLiveSession
        ? "Your match is still live. Resume to wait for results."
        : null,
    );
    setModeRecords(loadAllModeRecords());
    setPhase("landing");
    setLandingRenderKey((current) => current + 1);
    scrollHubToTop();
    if (typeof window !== "undefined") {
      const state = window.history.state as FeatureHistoryState | null;
      if (state?.appPhase) {
        window.history.replaceState({}, "", window.location.href);
      }
    }
  };

  const resetToLandingRef = useRef(resetToLanding);
  resetToLandingRef.current = resetToLanding;

  const returnToPlayHub = (playSection?: LandingPlaySection) => {
    saveLandingHubTab("play");
    if (playSection) {
      saveLandingPlaySection(playSection);
    }
    setLandingHubTab("play");
    syncLandingHubTabUrl("play");
    resetToLanding();
  };

  const openFeaturePage = useCallback(
    (nextPhase: AppPhase, options?: { returnTo?: AppPhase }) => {
      pendingFeatureNavigationRef.current = true;
      const historyState: FeatureHistoryState = {
        appPhase: nextPhase,
        returnTo: options?.returnTo,
      };
      window.history.pushState(historyState, "");
      prefetchFeaturePhase(nextPhase);
      if (nextPhase === "gameLog") {
        setLandingHubTab("play");
        saveLandingHubTab("play");
        syncLandingHubTabUrl("play");
        saveLandingPlaySection("headToHead");
      }
      startTransition(() => {
        setPhase(nextPhase);
      });
      const feature = deepLinkFeatureFromPhase(nextPhase);
      if (feature) {
        const parentTab = parentTabForFeature(feature);
        setLandingHubTab(parentTab);
        saveLandingHubTab(parentTab);
        syncLandingDeepLinkUrl({
          hub: hubParamForFeature(feature),
          play: null,
          view: null,
          post: null,
        });
      }
    },
    [],
  );

  const exitFeaturePage = useCallback(() => {
    const state = window.history.state as FeatureHistoryState | null;
    const returnTo = state?.returnTo;
    const leavingFeature = deepLinkFeatureFromPhase(phase);

    if (returnTo && FEATURE_PHASES.has(returnTo)) {
      skipPopStateResetRef.current = true;
      window.history.back();
      setPhase(returnTo);
      const returnFeature = deepLinkFeatureFromPhase(returnTo);
      if (returnFeature) {
        const syncReturn = () => {
          syncLandingDeepLinkUrl({
            hub: hubParamForFeature(returnFeature),
            play: null,
            view: null,
            post: null,
          });
        };
        syncReturn();
        window.setTimeout(syncReturn, 0);
      }
      return;
    }

    const shouldNavigateBack =
      FEATURE_PHASES.has(phase) && Boolean(state?.appPhase);

    const parentTab =
      phase === "playerUsage"
        ? "account"
        : phase === "weeklyRecap"
          ? weeklyRecapReturnTabRef.current
          : phase === "gameLog"
            ? "play"
            : leavingFeature
              ? parentTabForFeature(leavingFeature)
              : landingHubTab;
    setLandingHubTab(parentTab);
    saveLandingHubTab(parentTab);
    resetToLanding();

    scrollHubToTop();

    const syncParent = () => {
      if (parentTab === "play") {
        syncLandingHubTabUrl("play");
      } else {
        syncLandingDeepLinkUrl({
          hub: parentTab,
          play: null,
          view: null,
          post: null,
        });
      }
      const landingState = window.history.state as FeatureHistoryState | null;
      if (landingState?.appPhase) {
        window.history.replaceState({}, "", window.location.href);
      }
    };

    if (shouldNavigateBack) {
      skipPopStateResetRef.current = true;
      window.history.back();
      // History URL updates async with back(); re-sync parent hub after.
      window.setTimeout(syncParent, 0);
    } else {
      syncParent();
    }
  }, [landingHubTab, phase]);

  const replayLastMode = async () => {
    if (!user) {
      resetToLanding();
      return;
    }

    if (isDailyDraft) {
      const team = { name: user.name };
      if (
        (await startMatch(team, {
          isDailyDraft: true,
          dailyDraftMode: user.dailyDraftMode ?? dailyDraftMode,
        })) === "failed"
      ) {
        resetToLanding({ preserveError: true });
      }
      return;
    }

    const team = { name: user.name };
    if (user.practiceMode) {
      const result = await startMatch(team, {
        practiceMode: true,
        salaryCapMode: Boolean(user.salaryCapMode),
        salaryCapLimit: user.salaryCapLimit,
      });
      // Stay on results if practice restart fails instead of dumping to Play.
      if (result === "failed") {
        return;
      }
      return;
    }

    if (user.privateMatch) {
      // Prefer the live match id — fabricated client matchIds cannot rematch.
      const previousMatchId = opponent?.liveMatchId ?? matchId ?? null;
      const canRematchSameOpponent = Boolean(
        opponent?.liveMatchId && opponent?.isLiveOpponent,
      );

      if (canRematchSameOpponent && previousMatchId) {
        const result = await startMatch(team, {
          privateMatch: true,
          salaryCapMode: Boolean(user.salaryCapMode),
          privateRematch: { previousMatchId },
        });
        // Stay on results if rematch fails/cancels so the player can retry.
        if (result === "failed" || result === "cancelled") {
          return;
        }
        return;
      }

      // Fallback: reopen the private match modal for a new room code.
      setPendingPrivateMatchMode(user.salaryCapMode ? "ranked" : "classic");
      resetToLanding();
      return;
    }

    if (user.eventId) {
      if (!isCurrentEventId(user.eventId)) {
        resetToLanding({
          error: "This week's event has ended. Check back for the next one.",
        });
        return;
      }

      const event =
        getWeeklyEventForEventId(user.eventId, players) ??
        getCurrentWeeklyEvent(players);
      if (!event) {
        resetToLanding({
          error: "This week's event has ended. Check back for the next one.",
        });
        return;
      }

      // On failure, stay on results so MatchResults can show startMatchError.
      await startMatch(team, {
        eventId: event.id,
        eventRestriction: event.restriction,
        salaryCapMode: true,
        salaryCapLimit: event.salaryCapLimit,
        sharedDraftSlots: event.sharedSlots,
      });
      return;
    }

    const replayAllTime =
      Boolean(user.allTimeMode) && isAllTimeModePlayable();

    if (
      (await startMatch(team, {
        salaryCapMode: Boolean(user.salaryCapMode),
        allTimeMode: replayAllTime,
      })) === "failed"
    ) {
      resetToLanding({ preserveError: true });
    }
  };

  const handlePick = useCallback(
    (slot: number, playerId: string) => {
      if (
        shouldApplyRankedEventPlayerBans({
          isDailyDraft,
          practiceMode: user?.practiceMode,
          eventId: user?.eventId,
          salaryCapMode: user?.salaryCapMode,
          classicLive:
            !isDailyDraft &&
            !user?.practiceMode &&
            !user?.eventId &&
            !user?.salaryCapMode,
        }) &&
        isBannedFromRankedAndEvents(playerId)
      ) {
        return;
      }

      setUser((current) => {
        if (!current) {
          return current;
        }

        if (current.lineup.includes(playerId)) {
          return current;
        }

        const nextLineup = [...current.lineup];
        nextLineup[slot] = playerId;

        // Preserve any later autofilled slots (do not slice them away).
        return {
          ...current,
          lineup: nextLineup,
        };
      });

      setDraftStep((current) => Math.min(slot + 1, 5));
    },
    [
      isDailyDraft,
      user?.eventId,
      user?.practiceMode,
      user?.salaryCapMode,
    ],
  );

  const handleTimeout = useCallback(
    (slot: number) => {
      let nextStep: number | null = null;
      let failedUnfillable = false;

      setUser((current) => {
        if (!current || current.lineup[slot]) {
          return current;
        }

        const pickedIds = new Set(
          current.lineup.filter((id): id is string => Boolean(id)),
        );
        const slotConstraint = current.draftSlots[slot];
        const salaryOptions = getSalaryCapDraftOptions(
          current.lineup,
          pickableDraftPlayers,
          slot,
          current.draftSlots.length,
          current.salaryCapLimit,
          current.draftSlots,
        );
        const autoPick = pickRandomTopCandidateForSlot(
          pickableDraftPlayers,
          slotConstraint,
          pickedIds,
          salaryOptions,
          5,
          undefined,
          isDailyDraft ? "alphabetical" : "points",
        );

        if (autoPick) {
          nextStep = Math.min(slot + 1, 5);
          const nextLineup = [...current.lineup];
          nextLineup[slot] = autoPick;

          return {
            ...current,
            lineup: nextLineup,
          };
        }

        if (current.salaryCapLimit != null) {
          const partialLineupIds = current.lineup.filter(
            (playerId): playerId is string => Boolean(playerId),
          );
          const filled = completeSalaryCapDraftFromPartial(
            pickableDraftPlayers,
            partialLineupIds,
            current.draftSlots.slice(slot),
            current.salaryCapLimit,
          );

          if (filled) {
            nextStep = 5;
            return {
              ...current,
              lineup: filled,
            };
          }

          // Never fall through to uncapped picks under a salary cap.
          failedUnfillable = true;
          return current;
        }

        const nextLineup = [...current.lineup];
        let filledSlot = slot;

        while (filledSlot < current.draftSlots.length) {
          const filledIds = new Set(
            nextLineup.filter((playerId): playerId is string => Boolean(playerId)),
          );
          const selection = pickBestForSlot(
            pickableDraftPlayers,
            current.draftSlots[filledSlot]!,
            filledIds,
          );

          if (!selection) {
            break;
          }

          nextLineup[filledSlot] = selection;
          filledSlot += 1;
        }

        if (
          nextLineup.filter((playerId): playerId is string => Boolean(playerId))
            .length === current.draftSlots.length
        ) {
          nextStep = 5;
          return {
            ...current,
            lineup: nextLineup,
          };
        }

        failedUnfillable = true;
        return current;
      });

      if (failedUnfillable) {
        resetToLandingRef.current({
          error:
            "Couldn't auto-fill a legal lineup for this draft. Return to Play and try again.",
        });
        return;
      }

      if (nextStep != null) {
        setDraftStep(nextStep);
      }
    },
    [isDailyDraft, pickableDraftPlayers],
  );

  const handleCollectionChange = useCallback((next: PlayerCollection) => {
    setCollection(next);
  }, []);

  useEffect(() => {
    if (phase === "results" && !isDailyDraft && !isPendingQueueMatch && !matchId) {
      setMatchId(
        opponent?.liveMatchId ??
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `match-${Date.now()}`),
      );
    }
  }, [isDailyDraft, isPendingQueueMatch, matchId, opponent?.liveMatchId, phase]);

  // Private/matchmaking dialogs can leave body scroll locked; results must scroll.
  useLayoutEffect(() => {
    if (phase === "results") {
      forceUnlockBackgroundScroll();
    }
  }, [phase]);

  const ensureResultsMatchId = useCallback((liveMatchId?: string | null) => {
    setMatchId((current) => {
      if (current) {
        return current;
      }

      return (
        liveMatchId ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `match-${Date.now()}`)
      );
    });
  }, []);
  useEffect(() => {
    if (
      phase !== "drafting" ||
      !opponent?.isLiveOpponent ||
      !opponent.liveMatchId ||
      !user ||
      opponentComplete
    ) {
      return;
    }

    let cancelled = false;
    const playerId = getOrCreatePlayerIdentity().playerId;
    const liveMatchId = opponent.liveMatchId;

    const poll = async () => {
      const state = await fetchLiveMatchState({
        matchId: liveMatchId,
        playerId,
      });

      if (cancelled || !state) {
        return;
      }

      // Server may have already autofilled us — adopt whenever selfReady.
      if (state.selfReady && state.selfLineup?.length === 5) {
        setUser((current) =>
          current
            ? {
                ...current,
                lineup: state.selfLineup!,
              }
            : current,
        );
        setDraftStep(5);
      }

      if (state.opponentReady && state.opponentLineup?.length === 5) {
        setOpponent((current) =>
          current?.liveMatchId === liveMatchId
            ? { ...current, lineup: state.opponentLineup! }
            : current,
        );
        setOpponentPickCount(state.opponentLineup.length);
        setOpponentAutoDrafted(false);
        setOpponentComplete(true);
        setPhase("waiting");
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 3_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    opponent?.isLiveOpponent,
    opponent?.liveMatchId,
    opponentComplete,
    phase,
  ]);

  useEffect(() => {
    if (
      isDailyDraft ||
      !opponent ||
      phase !== "drafting" ||
      userDraftComplete
    ) {
      return;
    }

    const {
      id: opponentId,
      draftSlots,
      salaryCapLimit,
      isGhostOpponent,
      isLiveOpponent,
    } = opponent;

    if (draftSlots.length === 0 || isGhostOpponent || isLiveOpponent) {
      return;
    }

    let cancelled = false;

    const simulateOpponentDraft = async () => {
      if (isGhostOpponent) {
        return;
      }

      if (isLiveOpponent) {
        return;
      }

      const pickedIds = new Set<string>();
      const nextLineup: string[] = [];

      for (let index = 0; index < draftSlots.length; index += 1) {
        const slot = draftSlots[index]!;
        await sleep(getOpponentPickDelayMs());
        if (cancelled) {
          return;
        }

        const salaryOptions = getSalaryCapDraftOptions(
          nextLineup,
          opponentDraftablePlayersRef.current,
          index,
          draftSlots.length,
          salaryCapLimit,
          draftSlots,
        );
        let selection = pickBestForSlot(
          opponentDraftablePlayersRef.current,
          slot,
          pickedIds,
          salaryOptions,
        );

        if (!selection && salaryCapLimit != null) {
          const filled = completeSalaryCapDraftFromPartial(
            opponentDraftablePlayersRef.current,
            nextLineup,
            draftSlots.slice(index),
            salaryCapLimit,
          );

          if (filled) {
            nextLineup.splice(0, nextLineup.length, ...filled);
            break;
          }
        } else if (selection) {
          pickedIds.add(selection);
          nextLineup.push(selection);
        }

        const pickCount = nextLineup.length;
        setOpponentPickCount(pickCount);
        setOpponent((current) =>
          current?.id === opponentId
            ? {
                ...current,
                lineup: [...nextLineup],
              }
            : current,
        );
      }

      if (!cancelled && nextLineup.length === draftSlots.length) {
        setOpponentComplete(true);
      }
    };

    void simulateOpponentDraft();

    return () => {
      cancelled = true;
    };
  }, [isDailyDraft, opponent?.id, phase, userDraftComplete]);

  useEffect(() => {
    if (
      !userDraftComplete ||
      phase !== "waiting" ||
      !opponent?.isLiveOpponent ||
      !opponent.liveMatchId ||
      !user ||
      opponentComplete
    ) {
      return;
    }

    let cancelled = false;
    const playerId = getOrCreatePlayerIdentity().playerId;
    const liveMatchId = opponent.liveMatchId;
    const lineup = user.lineup.filter((id): id is string => Boolean(id));

    if (lineup.length !== 5) {
      return;
    }

    void (async () => {
      let locked = await submitLiveMatchLineup({
        matchId: liveMatchId,
        playerId,
        lineup,
      });

      if (!locked?.selfReady) {
        locked = await submitLiveMatchLineup({
          matchId: liveMatchId,
          playerId,
          lineup,
        });
      }

      if (cancelled) {
        return;
      }

      if (!locked?.selfReady) {
        resetToLanding({
          error:
            "Couldn't lock your lineup on the server. Check your connection and try again.",
        });
        return;
      }

      // Server may have already autofilled us (timeout) — adopt self lineup whenever ready.
      if (locked.selfLineup?.length === 5) {
        setUser((current) =>
          current
            ? {
                ...current,
                lineup: locked!.selfLineup!,
              }
            : current,
        );
      }

      if (locked.opponentReady && locked.opponentLineup?.length === 5) {
        setOpponent((current) =>
          current?.liveMatchId === liveMatchId
            ? { ...current, lineup: locked!.opponentLineup! }
            : current,
        );
        setOpponentPickCount(locked.opponentLineup.length);
        setOpponentAutoDrafted(false);
        setOpponentComplete(true);
        return;
      }

      const opponentPlayerId = opponent.liveOpponentPlayerId;

      if (!opponentPlayerId) {
        resetToLanding({
          error:
            "Your opponent did not finish drafting in time. Return to Play and try again.",
        });
        return;
      }

      const resolved = await resolveLiveOpponentLineup({
        matchId: liveMatchId,
        playerId,
        opponentPlayerId,
        // Live opponents draft from their own unlocks (unknown here). Autofill
        // from the full mode pool — never a synthetic collection gap.
        players: (() => {
          const autofillPool = eventRestriction
            ? filterPlayersForEventRestriction(
                activePlayers,
                eventRestriction,
              )
            : activePlayers;
          return shouldApplyRankedEventPlayerBans({
            practiceMode: user?.practiceMode,
            eventId: user?.eventId,
            salaryCapMode: user?.salaryCapMode,
            classicLive:
              !user?.practiceMode &&
              !user?.eventId &&
              !user?.salaryCapMode,
          })
            ? filterOutRankedEventBannedPlayers(autofillPool)
            : autofillPool;
        })(),
        salaryCapLimit: opponent.salaryCapLimit,
      });

      if (cancelled) {
        return;
      }

      if (!resolved) {
        resetToLanding({
          error:
            "Your opponent did not finish drafting in time. Return to Play and try again.",
        });
        return;
      }

      setOpponent((current) =>
        current?.liveMatchId === liveMatchId
          ? { ...current, lineup: resolved.lineup }
          : current,
      );
      setOpponentPickCount(resolved.lineup.length);
      setOpponentAutoDrafted(resolved.autoDrafted);
      setOpponentComplete(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activePlayers,
    eventRestriction,
    opponent?.id,
    opponent?.isLiveOpponent,
    opponent?.liveMatchId,
    opponent?.liveOpponentPlayerId,
    opponent?.salaryCapLimit,
    opponentComplete,
    phase,
    user,
    userDraftComplete,
  ]);

  useEffect(() => {
    if (!userDraftComplete || phase !== "drafting") {
      return;
    }

    if (isDailyDraft) {
      setPhase("results");
      return;
    }

    if (isPendingQueueMatch) {
      setPhase("results");
      return;
    }

    if (opponent?.isLiveOpponent) {
      if (opponentComplete) {
        ensureResultsMatchId(opponent.liveMatchId);
        setPhase("results");
      } else {
        setPhase("waiting");
      }
      return;
    }

    if (opponent && !opponent.isGhostOpponent) {
      const finalized = finalizeOpponentLineup(
        opponentDraftablePlayersRef.current,
        opponent,
      );
      setOpponent(finalized);
      setOpponentPickCount(finalized.lineup.length);
      setOpponentComplete(true);
    }

    ensureResultsMatchId(opponent?.liveMatchId);
    setPhase("results");
  }, [
    ensureResultsMatchId,
    isDailyDraft,
    isPendingQueueMatch,
    opponent,
    opponentComplete,
    phase,
    userDraftComplete,
  ]);

  useEffect(() => {
    if (phase === "waiting" && opponentComplete) {
      ensureResultsMatchId(opponent?.liveMatchId);
      setPhase("results");
    }
  }, [ensureResultsMatchId, opponent?.liveMatchId, opponentComplete, phase]);

  useLayoutEffect(() => {
    if (phase !== "landing" && !FEATURE_PHASES.has(phase)) {
      return;
    }

    scrollHubToTop();
  }, [phase, landingRenderKey]);

  useEffect(() => {
    if (phase === "landing") {
      return;
    }

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, [phase]);

  useEffect(() => {
    if (!FEATURE_PHASES.has(phase)) {
      return;
    }

    if (!pendingFeatureNavigationRef.current) {
      window.history.pushState({ appPhase: phase }, "");
    } else {
      pendingFeatureNavigationRef.current = false;
    }

    const handlePopState = (event: PopStateEvent) => {
      if (skipPopStateResetRef.current) {
        skipPopStateResetRef.current = false;
        return;
      }

      const state = event.state as FeatureHistoryState | null;
      const nextPhase = state?.appPhase;

      if (typeof nextPhase === "string" && FEATURE_PHASES.has(nextPhase)) {
        setPhase(nextPhase);
        return;
      }

      resetToLanding();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [phase]);

  const updateLandingHubTab = useCallback((tab: LandingContentTab) => {
    setLandingHubTab(tab);
    saveLandingHubTab(tab);
    syncLandingHubTabUrl(tab);
  }, []);

  const goToLandingHub = useCallback(
    (tab: LandingContentTab) => {
      updateLandingHubTab(tab);

      if (phase === "landing") {
        return;
      }

      const state = window.history.state as FeatureHistoryState | null;
      const shouldNavigateBack =
        FEATURE_PHASES.has(phase) && Boolean(state?.appPhase);

      resetToLanding();

      const syncParent = () => {
        if (tab === "play") {
          syncLandingHubTabUrl("play");
        } else {
          syncLandingDeepLinkUrl({
            hub: tab,
            play: null,
            view: null,
            post: null,
          });
        }
        const landingState = window.history.state as FeatureHistoryState | null;
        if (landingState?.appPhase) {
          window.history.replaceState({}, "", window.location.href);
        }
      };

      if (shouldNavigateBack) {
        skipPopStateResetRef.current = true;
        window.history.back();
        window.setTimeout(syncParent, 0);
      } else {
        syncParent();
      }
    },
    [phase, updateLandingHubTab],
  );

  const startPrivateChallenge = useCallback(
    (mode: LandingH2hMode, joinCode?: string | null) => {
      saveLandingPlaySection("headToHead");
      saveLandingH2hMode(mode);
      setPendingPrivateJoinCode(joinCode ?? null);
      setPendingPrivateMatchMode(mode);
      goToLandingHub("play");
    },
    [goToLandingHub],
  );

  /** Open Community at the hub chooser (not Posts / Tier lists). */
  const openCommunityHub = useCallback(() => {
    if (phase !== "tierList") {
      openFeaturePage("tierList");
    }
    setCommunityHubReturnToken((current) => current + 1);
    syncLandingDeepLinkUrl({ hub: "community", view: null, post: null });
  }, [openFeaturePage, phase]);

  /** Open Community Posts with the latest results shareable pre-attached. */
  const openCommunityCompose = useCallback(() => {
    if (phase !== "tierList") {
      openFeaturePage("tierList");
    }
    setCommunityComposeToken((current) => current + 1);
    syncLandingDeepLinkUrl({ hub: "community", view: "posts", post: null });
  }, [openFeaturePage, phase]);

  const handleHubNav = useCallback(
    (tab: LandingHubTab) => {
      if (tab === "standings") {
        if (phase !== "leaderboard") {
          openFeaturePage("leaderboard");
        }
        syncLandingDeepLinkUrl({ hub: "ranks" });
        return;
      }

      if (tab === "community") {
        openCommunityHub();
        return;
      }

      goToLandingHub(tab);
    },
    [goToLandingHub, openCommunityHub, openFeaturePage, phase],
  );

  const hubNavForPhase = ((): LandingHubTab => {
    if (phase === "leaderboard") {
      return "standings";
    }

    if (phase === "tierList") {
      return "community";
    }

    if (phase === "weeklyRecap") {
      return weeklyRecapReturnTabRef.current === "roster" ? "roster" : "play";
    }

    if (phase === "gameLog") {
      return "play";
    }

    if (
      phase === "playerUsage" ||
      phase === "privacy" ||
      phase === "terms" ||
      phase === "beta"
    ) {
      return "account";
    }

    if (
      phase === "achievements" ||
      phase === "stats" ||
      phase === "gmStats"
    ) {
      return "roster";
    }

    return landingHubTab;
  })();

  const playNavIdentity = getOrCreatePlayerIdentity().playerId;
  const playNavBadgeCount = getPlayNavBadgeCount({
    pendingResultCount: deliveredOwnerResults.length,
    queuedClassic: Boolean(loadPendingLineupState("classic", playNavIdentity)),
    queuedRanked: Boolean(loadPendingLineupState("ranked", playNavIdentity)),
  });

  const renderHubChrome = (
    content: ReactNode,
    options?: { layoutClass?: string; activeTab?: LandingHubTab; suspense?: boolean },
  ) => (
    <main
      className={`landing-layout${options?.layoutClass ? ` ${options.layoutClass}` : ""}`}
    >
      <HubShell
        activeTab={options?.activeTab ?? hubNavForPhase}
        onSelectTab={handleHubNav}
        onPrefetchTab={prefetchHubFeatureTab}
        playBadgeCount={playNavBadgeCount}
      >
        {options?.suspense === false ? (
          content
        ) : (
          <Suspense fallback={<FeaturePageFallback />}>{content}</Suspense>
        )}
      </HubShell>
    </main>
  );

  const renderHubFeature = (content: ReactNode, layoutClass = "") =>
    renderHubChrome(content, { layoutClass });

  const isMatchmakingSearchActive =
    matchmakingMode != null || isMatchmakingInFlight;

  const matchmakingLiveOnlySearch = useMemo(() => {
    if (!matchmakingMode || matchmakingMode === "event") {
      return matchmakingMode === "event";
    }

    const elo =
      matchmakingMode === "ranked"
        ? ensureCurrentRankedSeason().elo
        : ensureClassicProfile().elo;

    return requiresLiveOpponentOnly(elo);
  }, [matchmakingMode]);

  if (phase === "leaderboard") {
    return renderHubFeature(
      <LeaderboardPage onChallengeGm={startPrivateChallenge} />,
    );
  }

  if (phase === "gmStats") {
    return renderHubFeature(<GmStatsPage onBack={exitFeaturePage} />);
  }

  if (phase === "gameLog") {
    return renderHubFeature(<GameLogPage onBack={exitFeaturePage} />);
  }

  if (phase === "weeklyRecap") {
    return renderHubFeature(
      <WeeklyRecapPage
        onBack={exitFeaturePage}
        backLabel={
          weeklyRecapReturnTabRef.current === "roster" ? "Franchise" : "Play"
        }
      />,
    );
  }

  if (phase === "playerUsage") {
    if (!isQaRuntimeHost()) {
      return renderHubFeature(<FeaturePageFallback />);
    }
    return renderHubFeature(
      <InternalPlayerUsagePage onBack={exitFeaturePage} />,
    );
  }

  if (phase === "achievements") {
    return renderHubFeature(
      <AchievementsPage
        onBack={exitFeaturePage}
        onPlayIntent={(intent) => {
          saveLandingPlaySection(intent.playSection);
          if (intent.h2hMode) {
            saveLandingH2hMode(intent.h2hMode);
          }
          goToLandingHub("play");
        }}
      />,
    );
  }

  if (phase === "privacy") {
    return renderHubFeature(
      <LegalPage kind="privacy" onBack={exitFeaturePage} />,
    );
  }

  if (phase === "terms") {
    return renderHubFeature(
      <LegalPage
        kind="terms"
        onBack={exitFeaturePage}
        onOpenPrivacy={() => openFeaturePage("privacy", { returnTo: "terms" })}
      />,
    );
  }

  if (phase === "beta") {
    return renderHubFeature(
      <BetaNotesPage
        onBack={exitFeaturePage}
        initialSection={initialLandingDeepLinks.betaSection}
        onPlayIntent={(intent) => {
          saveLandingPlaySection(intent.playSection);
          if (intent.h2hMode) {
            saveLandingH2hMode(intent.h2hMode);
          }
          goToLandingHub("play");
        }}
        onOpenHub={(tab) => goToLandingHub(tab)}
        onOpenRanks={() => openFeaturePage("leaderboard")}
        onOpenCommunity={() => openCommunityHub()}
      />,
    );
  }

  if (phase === "stats") {
    return renderHubFeature(
      <PlayerStatsTable
        players={statsPlayers}
        collection={collection}
        onBack={exitFeaturePage}
      />,
      "landing-layout--stats",
    );
  }

  if (phase === "tierList") {
    return renderHubFeature(
      <TierListPage
        players={getTierListPlayers()}
        onBack={exitFeaturePage}
        initialPublicTierListId={initialPublicTierListId}
        initialCommunityView={
          communityHubReturnToken === 0 &&
          (initialLandingDeepLinks.communityView === "posts" ||
            initialLandingDeepLinks.communityView === "tiers")
            ? initialLandingDeepLinks.communityView
            : null
        }
        initialCommunityPostId={
          communityHubReturnToken === 0
            ? initialLandingDeepLinks.communityPostId
            : null
        }
        hubReturnToken={communityHubReturnToken}
        composeIntentToken={communityComposeToken}
        onOpenAccount={() => goToLandingHub("account")}
        onChallengeGm={startPrivateChallenge}
      />,
      "landing-layout--tier-list",
    );
  }

  // Only interrupt Play. Other hub tabs keep their page and show a Play
  // badge until the user opens Play, so Account/Franchise aren't hijacked.
  if (
    phase === "landing" &&
    landingHubTab === "play" &&
    deliveredOwnerResults.length > 0
  ) {
    return (
      <main className="landing-layout">
        <HubShell
          activeTab="play"
          onSelectTab={handleHubNav}
          onPrefetchTab={prefetchHubFeatureTab}
          playBadgeCount={playNavBadgeCount}
        >
          <PendingOwnerResults
            deliveries={deliveredOwnerResults}
            onDone={() => {
              const playerId = getOrCreatePlayerIdentity().playerId;
              const toFinalize = deliveredOwnerResults;
              setDeliveredOwnerResults([]);
              void finalizeDeliveredOwnerResults(toFinalize, playerId);
            }}
          />
        </HubShell>
      </main>
    );
  }

  if (phase === "landing") {
    return (
      <main className="landing-layout" key={landingRenderKey}>
        <LandingPage
          collection={collection}
          modeRecords={modeRecords}
          matchmakingMode={matchmakingMode}
          isMatchmakingSearchActive={isMatchmakingSearchActive}
          matchmakingElapsedSeconds={matchmakingElapsedSeconds}
          landingBasicDaily={landingBasicDaily}
          landingAdvancedDaily={landingAdvancedDaily}
          startMatchError={startMatchError}
          liveRestoreNotice={liveRestoreNotice}
          onRetryLiveRestore={() => {
            liveRecoveryAttemptedRef.current = false;
            setLiveRestoreNotice(null);
            setLandingRenderKey((current) => current + 1);
          }}
          onDismissLiveRestore={() => {
            clearLiveDraftSession();
            liveRecoveryAttemptedRef.current = true;
            setLiveRestoreNotice(null);
          }}
          privateRoomCode={privateRoomCode}
          privateRoomRole={privateRoomRole}
          pendingPrivateMatchMode={pendingPrivateMatchMode}
          pendingPrivateJoinCode={pendingPrivateJoinCode}
          onPendingPrivateMatchModeConsumed={() => {
            setPendingPrivateMatchMode(null);
            setPendingPrivateJoinCode(null);
          }}
          onStartDraft={startMatch}
          onViewDailyLineup={viewDailyLineup}
          onViewYesterdayBestDailyLineup={viewYesterdayBestDailyLineup}
          onCollectionChange={setCollection}
          onCareerSynced={() => setModeRecords(loadAllModeRecords())}
          onViewStats={() => openFeaturePage("stats")}
          onViewTierList={openCommunityHub}
          onViewGmStats={() => openFeaturePage("gmStats")}
          onViewWeeklyRecap={(source = "play") => {
            weeklyRecapReturnTabRef.current = source;
            openFeaturePage("weeklyRecap");
          }}
          onViewAchievements={() => openFeaturePage("achievements")}
          onViewLeaderboard={() => openFeaturePage("leaderboard")}
          onViewPrivacy={() => openFeaturePage("privacy")}
          onViewTerms={() => openFeaturePage("terms")}
          onViewBetaNotes={() => openFeaturePage("beta")}
          onViewGameLog={() => openFeaturePage("gameLog")}
          hubTab={landingHubTab}
          onHubTabChange={updateLandingHubTab}
          onPrefetchHubTab={prefetchHubFeatureTab}
          pendingOwnerResultCount={deliveredOwnerResults.length}
        />
        {showDraftOnboarding ? (
          <DraftOnboardingOverlay
            hasSalaryCap={draftOnboarding.hasSalaryCap}
            isDailyDraft={draftOnboarding.isDailyDraft}
            isCompetitive={draftOnboarding.isCompetitive}
            onDismiss={dismissDraftOnboarding}
          />
        ) : null}
        {matchmakingMode ? (
          <MatchmakingOverlay
            mode={matchmakingMode}
            elapsedSeconds={matchmakingElapsedSeconds}
            matchedOpponentName={matchedOpponentName}
            onCancel={cancelMatchmaking}
            isCancelling={isCancellingMatchmaking}
            privateRoomCode={privateRoomCode}
            privateRoomRole={privateRoomRole}
            privateRoomExpiresAt={privateRoomExpiresAt}
            privateRematchWaiting={privateRematchWaiting}
            liveOnlySearch={matchmakingLiveOnlySearch}
          />
        ) : null}
      </main>
    );
  }

  if (!user) {
    return renderHubChrome(
      <section className="panel landing hub-feature">
        <p className="eyebrow">Draft unavailable</p>
        <h2>We couldn&apos;t load your draft.</h2>
        <p>Return to Play and try starting again.</p>
        <button type="button" className="secondary-button" onClick={() => returnToPlayHub()}>
          Back to Play
        </button>
      </section>,
      { activeTab: landingHubTab, suspense: false },
    );
  }

  if (!isDailyDraft && !opponent && !isPendingQueueMatch) {
    return renderHubChrome(
      <section className="panel landing hub-feature">
        <p className="eyebrow">Draft unavailable</p>
        <h2>We couldn&apos;t set up this matchup.</h2>
        <p>Return to Play and try starting again.</p>
        <button type="button" className="secondary-button" onClick={() => returnToPlayHub()}>
          Back to Play
        </button>
      </section>,
      { activeTab: landingHubTab, suspense: false },
    );
  }

  const canRenderDraftRoom =
    phase === "drafting" &&
    !userDraftComplete &&
    user.draftSlots.length > 0 &&
    user.draftSlots[draftStep];

  if (phase === "drafting" && !userDraftComplete && !canRenderDraftRoom) {
    return renderHubChrome(
      <section className="panel landing hub-feature">
        <p className="eyebrow">Draft unavailable</p>
        <h2>We couldn&apos;t load this draft board.</h2>
        <p>Return to Play and try starting again.</p>
        <button type="button" className="secondary-button" onClick={() => returnToPlayHub()}>
          Back to Play
        </button>
      </section>,
      { activeTab: landingHubTab, suspense: false },
    );
  }

  return (
    <main className={phase === "drafting" ? "draft-layout-shell" : undefined}>
      {canRenderDraftRoom ? (
        <div className="draft-layout">
          <DraftRoom
            drafter={user}
            players={draftablePlayers}
            activeStep={draftStep}
            draftSessionKey={draftSessionKey}
            dailyChallengeDescription={dailySetup?.challenge.description}
            dailyChallengeTitle={dailySetup?.challenge.title}
            isDailyDraft={isDailyDraft}
            banRankedEventPlayers={applyRankedEventBans}
            opponentName={
              isDailyDraft
                ? null
                : opponent
                  ? formatOpponentDisplayName(opponent.name, opponent.username)
                  : null
            }
            onPick={handlePick}
            onTimeout={handleTimeout}
          />
        </div>
      ) : null}

      {phase === "waiting" && opponent?.isLiveOpponent ? (
        <WaitingRoom
          theme={getMatchModeTheme(user)}
          opponentName={formatOpponentDisplayName(
            opponent.name,
            opponent.username,
          )}
          opponentAutoDrafted={opponentAutoDrafted}
          onLeave={() => resetToLanding({ preserveLiveSession: true })}
        />
      ) : null}

      {phase === "results" && isPendingQueueMatch && user ? (
        <PendingQueueResults
          user={user}
          userLineup={userLineup}
          starCount={countUnlockedAllStars(collection)}
          onDone={() => returnToPlayHub("headToHead")}
          matchmakingNotice={matchmakingNotice}
        />
      ) : null}

      {phase === "results" && isDailyDraft && dailySetup && !userLineupComplete ? (
        <section className="panel landing">
          <p className="eyebrow">Results unavailable</p>
          <h2>We couldn&apos;t load your Daily Draft lineup for scoring.</h2>
          <p>
            {userLineup.length}/{Math.max(userLineupIds.length, 5)} players
            resolved from the current pool. A roster update may have removed a
            drafted id.
          </p>
          <div className="match-results__action-row">
            <button
              type="button"
              className="play-again-button match-results__primary-action"
              onClick={() => returnToPlayHub()}
            >
              Back to Play
            </button>
          </div>
        </section>
      ) : null}

      {phase === "results" &&
      isDailyDraft &&
      dailySetup &&
      userLineupComplete ? (
        <Suspense fallback={<FeaturePageFallback />}>
          <DailyDraftResults
            user={user}
            userLineup={userLineup}
            dailyDateKey={dailyDateKey}
            dailyGoal={dailySetup.goal}
            benchmarkValues={dailyBenchmarkValues}
            reviewOnly={isDailyReview}
            optimalReview={isDailyOptimalReview}
            onPlayAgain={() => returnToPlayHub()}
            onPostToCommunity={openCommunityCompose}
            onOpenAccount={() => {
              resetToLanding();
              updateLandingHubTab("account");
            }}
          />
        </Suspense>
      ) : null}

      {phase === "results" &&
      !isDailyDraft &&
      !isPendingQueueMatch &&
      opponent &&
      !matchId ? (
        <section className="panel landing" role="status" aria-live="polite">
          <p className="eyebrow">Loading results</p>
          <h2>Preparing match results…</h2>
        </section>
      ) : null}

      {phase === "results" &&
      !isDailyDraft &&
      !isPendingQueueMatch &&
      opponent &&
      matchId &&
      (!userLineupComplete || !opponentLineupComplete) ? (
        <section className="panel landing">
          <p className="eyebrow">Results unavailable</p>
          <h2>We couldn&apos;t load both lineups for scoring.</h2>
          <p>
            {userLineup.length}/{Math.max(userLineupIds.length, 5)} of your
            players and {opponentLineup.length}/
            {Math.max(opponentLineupIds.length, 5)} of theirs resolved from the
            current pool. A roster update may have removed a drafted id.
          </p>
          <div className="match-results__action-row">
            <button
              type="button"
              className="play-again-button match-results__primary-action"
              onClick={() => {
                void replayLastMode();
              }}
            >
              Draft another team
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => returnToPlayHub()}
            >
              Back to Play
            </button>
          </div>
        </section>
      ) : null}

      {phase === "results" &&
      !isDailyDraft &&
      !isPendingQueueMatch &&
      opponent &&
      matchId &&
      userLineupComplete &&
      opponentLineupComplete ? (
        <Suspense fallback={<FeaturePageFallback />}>
          <MatchResults
            user={user}
            opponent={opponent}
            userLineup={userLineup}
            opponentLineup={opponentLineup}
            matchId={matchId}
            collection={collection}
            onCollectionChange={handleCollectionChange}
            onPlayAgain={replayLastMode}
            onReturnToMenu={() =>
              returnToPlayHub(user.eventId ? "events" : "headToHead")
            }
            onPostToCommunity={openCommunityCompose}
            onChallengeGm={startPrivateChallenge}
            isMatchmaking={isMatchmakingSearchActive}
            startMatchError={startMatchError}
            opponentAutoDrafted={opponentAutoDrafted}
            matchmakingNotice={matchmakingNotice}
          />
        </Suspense>
      ) : null}
      {matchmakingMode ? (
        <MatchmakingOverlay
          mode={matchmakingMode}
          elapsedSeconds={matchmakingElapsedSeconds}
          matchedOpponentName={matchedOpponentName}
          onCancel={cancelMatchmaking}
          isCancelling={isCancellingMatchmaking}
          privateRoomCode={privateRoomCode}
          privateRoomRole={privateRoomRole}
          privateRoomExpiresAt={privateRoomExpiresAt}
          privateRematchWaiting={privateRematchWaiting}
          liveOnlySearch={matchmakingLiveOnlySearch}
        />
      ) : null}
    </main>
  );
}

export default App;
