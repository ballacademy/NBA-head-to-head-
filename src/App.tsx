import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { players } from "./data/players";
import { DailyDraftResults } from "./components/DailyDraftResults";
import { DraftOnboardingOverlay } from "./components/DraftOnboardingOverlay";
import { DraftRoom } from "./components/DraftRoom";
import { LandingPage } from "./components/LandingPage";
import { HubShell } from "./components/HubShell";
import type { LandingHubTab } from "./components/LandingBottomNav";
import { LeaderboardPage } from "./components/LeaderboardPage";
import { AchievementsPage } from "./components/AchievementsPage";
import { GmStatsPage } from "./components/GmStatsPage";
import { LegalPage } from "./components/LegalPage";
import { BetaNotesPage } from "./components/BetaNotesPage";
import {
  loadLandingHubTab,
  saveLandingHubTab,
  type LandingContentTab,
} from "./lib/landingHub";
import { PendingQueueResults } from "./components/PendingQueueResults";
import { MatchmakingOverlay } from "./components/MatchmakingOverlay";
import { MatchResults } from "./components/MatchResults";
import { PlayerStatsTable } from "./components/PlayerStatsTable";
import { TierListPage } from "./components/TierListPage";
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
} from "./lib/draftOnboarding";
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
import { formatOpponentDisplayName } from "./lib/opponentDisplayName";
import {
  clearLiveDraftSession,
  saveLiveDraftSession,
} from "./lib/liveDraftSession";
import { restoreLiveDraftSession } from "./lib/restoreLiveDraftSession";
import { RANKED_STARTING_ELO } from "./lib/rankedElo";
import {
  ensurePlayerCollection,
  getDraftablePlayers,
  resolveOpponentCollectionForMatch,
  countUnlockedAllStars,
  type PlayerCollection,
} from "./lib/playerCollection";
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

type AppPhase =
  | "landing"
  | "drafting"
  | "waiting"
  | "results"
  | "stats"
  | "tierList"
  | "gmStats"
  | "leaderboard"
  | "achievements"
  | "privacy"
  | "terms"
  | "beta";

const FEATURE_PHASES = new Set<AppPhase>([
  "stats",
  "tierList",
  "gmStats",
  "leaderboard",
  "achievements",
  "privacy",
  "terms",
  "beta",
]);

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

function App() {
  const [initialPublicTierListId] = useState<string | null>(
    readInitialPublicTierListId,
  );
  const [phase, setPhase] = useState<AppPhase>(() =>
    initialPublicTierListId ? "tierList" : "landing",
  );
  const [showDraftOnboarding, setShowDraftOnboarding] = useState(false);
  const [draftOnboardingHasSalaryCap, setDraftOnboardingHasSalaryCap] =
    useState(false);
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
  const [privateRoomCode, setPrivateRoomCode] = useState<string | null>(null);
  const [privateRoomExpiresAt, setPrivateRoomExpiresAt] = useState<string | null>(
    null,
  );
  const [opponentCollection, setOpponentCollection] = useState<PlayerCollection | null>(
    null,
  );
  const [landingRenderKey, setLandingRenderKey] = useState(0);
  const [landingHubTab, setLandingHubTab] = useState<LandingContentTab>(() =>
    loadLandingHubTab(),
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
    /** Once set, cancel is ignored — a live match already exists. */
    matchId?: string;
  } | null>(null);
  const [privateRoomRole, setPrivateRoomRole] = useState<
    "host" | "guest" | null
  >(null);
  const [pendingPrivateMatchMode, setPendingPrivateMatchMode] = useState<
    "classic" | "ranked" | null
  >(null);
  const liveRecoveryAttemptedRef = useRef(false);
  const todaysDailyDateKey = useDailyDateKey();

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
    if (liveRecoveryAttemptedRef.current || phase !== "landing") {
      return;
    }

    liveRecoveryAttemptedRef.current = true;

    void (async () => {
      const restored = await restoreLiveDraftSession();

      if (!restored) {
        return;
      }

      setUser(restored.user);
      setOpponent(restored.opponent);
      setDraftStep(restored.draftStep);
      setMatchId(restored.matchId);
      setDraftSessionKey(restored.matchId);
      setOpponentPickCount(restored.opponent.lineup.length);
      setOpponentComplete(restored.opponentComplete);
      setOpponentAutoDrafted(Boolean(restored.opponentAutoDrafted));
      setIsPendingQueueMatch(false);
      setIsDailyDraft(false);
      setPhase(restored.opponentComplete ? "results" : restored.phase);
    })();
  }, [phase]);

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

          await refreshDailyDraftScoresFromApi(todayKey, goalId, playerId);
        }),
      );
      setDailyScoresRefreshTick((current) => current + 1);
    };

    void refreshDailyScores();
    const intervalId = window.setInterval(() => {
      void refreshDailyScores();
    }, 15_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [phase]);

  const activePlayers = useMemo(
    () => getActivePlayerPool(modeRecords.allTime, { allTimeMode }),
    [allTimeMode, modeRecords.allTime],
  );

  const eventRestriction = user?.eventRestriction;

  const draftablePlayers = useMemo(() => {
    if (isDailyDraft) {
      return activePlayers;
    }

    if (eventRestriction) {
      return filterPlayersForEventRestriction(activePlayers, eventRestriction);
    }

    return getDraftablePlayers(activePlayers, collection);
  }, [activePlayers, collection, eventRestriction, isDailyDraft]);

  const opponentDraftablePlayers = useMemo(() => {
    if (eventRestriction) {
      return filterPlayersForEventRestriction(activePlayers, eventRestriction);
    }

    // Practice bots always mirror the user's unlocked/draftable pool.
    if (user?.practiceMode) {
      return getDraftablePlayers(activePlayers, collection);
    }

    return opponentCollection
      ? getDraftablePlayers(activePlayers, opponentCollection)
      : activePlayers;
  }, [
    activePlayers,
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

  const userLineup = isCompleteLineupFromActivePool(user?.lineup ?? [], modeRecords.allTime, {
    allTimeMode,
  })
    ? getPlayersByIdFromActivePool(user?.lineup ?? [], modeRecords.allTime, {
        allTimeMode,
      })
    : [];
  const opponentLineup = isCompleteLineupFromActivePool(
    opponent?.lineup ?? [],
    modeRecords.allTime,
    { allTimeMode },
  )
    ? getPlayersByIdFromActivePool(opponent?.lineup ?? [], modeRecords.allTime, {
        allTimeMode,
      })
    : [];
  const userDraftComplete =
    draftStep >= 5 &&
    (user?.lineup.filter((playerId): playerId is string => Boolean(playerId))
      .length ?? 0) >= 5;

  const ensureDraftOnboarding = useCallback((hasSalaryCap: boolean) => {
    if (hasSeenDraftOnboarding()) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      draftOnboardingResolverRef.current = resolve;
      setDraftOnboardingHasSalaryCap(hasSalaryCap);
      setShowDraftOnboarding(true);
    });
  }, []);

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
    const practiceMode = Boolean(options.practiceMode);
    const privateMatch = Boolean(options.privateMatch);

    // Practice can always restart; pending unlocks only block ranked/classic starts.
    if (collection.pendingUnlock && !practiceMode) {
      setStartMatchError(getStartMatchErrorMessage("pending_unlock"));
      return "failed";
    }

    setStartMatchError(null);

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

    const pool = getActivePlayerPool(loadPlayerRecord("allTime"), {
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
    await ensureDraftOnboarding(salaryCapLimit != null);

    const eventPool =
      eventMode && eventRestriction
        ? filterPlayersForEventRestriction(pool, eventRestriction)
        : null;
    const draftPool = daily
      ? pool
      : eventPool
        ? eventPool
        : getDraftablePlayers(pool, collection);
    let ghostOpponent: GhostOpponentSnapshot | null = null;
    let liveOpponent: LiveOpponentSnapshot | null = null;
    let isPendingQueue = false;
    let activeMatchmakingGeneration: number | null = null;

    if (privateMatch) {
      const privateRoom = options.privateRoom;
      if (!privateRoom) {
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
        privateRoomRole: privateRoom.role as "host" | "guest",
        matchId: undefined as string | undefined,
      };
      matchmakingSessionRef.current = session;
      setIsMatchmakingInFlight(true);
      setIsCancellingMatchmaking(false);
      setMatchmakingStartedAt(Date.now());
      setMatchmakingMode(requestedMode);
      setMatchedOpponentName(null);
      setPrivateRoomCode(null);
      setPrivateRoomExpiresAt(null);
      setPrivateRoomRole(privateRoom.role);

      const elo = salaryCapMode
        ? ensureCurrentRankedSeason().elo
        : ensureClassicProfile().elo;

      try {
        if (privateRoom.role === "host") {
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
          session.privateRoomCode = privateRoom.roomCode;
          setPrivateRoomCode(privateRoom.roomCode);

          const joined = await joinPrivateRoom({
            roomCode: privateRoom.roomCode,
            playerId,
            teamName: team.name,
            elo,
            expectedMode: requestedMode,
          });

          if ("error" in joined) {
            setStartMatchError(joined.error);
            return "failed";
          }

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
        if (matchmakingSessionRef.current?.generation === generation) {
          matchmakingSessionRef.current = null;
          setMatchmakingMode(null);
          setMatchmakingStartedAt(null);
          setMatchedOpponentName(null);
          setPrivateRoomCode(null);
          setPrivateRoomExpiresAt(null);
          setPrivateRoomRole(null);
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
        } else if (resolution.plan.kind === "queue_for_live") {
          isPendingQueue = true;
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
      : nextOpponentCollection
        ? getDraftablePlayers(pool, nextOpponentCollection)
        : pool;
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

    // Don't persist a placeholder daily-only name over a real team profile.
    if (!daily || loadTeamProfile() != null) {
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
                    ? { ...createRandomOpponent(opponentSlots), allTimeMode: true }
                    : createClassicOpponent(opponentSlots)
              : null,
    );
    setOpponentCollection(nextOpponentCollection);
    setDraftStep(0);
    setOpponentPickCount(ghostOpponent ? ghostOpponent.lineup.length : 0);
    setOpponentComplete(daily || isPendingQueue || Boolean(ghostOpponent));
    setOpponentAutoDrafted(false);
    setMatchId(null);
    setDraftSessionKey(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `draft-${Date.now()}`,
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
    setMatchmakingMode(null);
    setMatchmakingStartedAt(null);
    setPrivateRoomCode(null);
    setPrivateRoomExpiresAt(null);
    setPrivateRoomRole(null);

    if (session.privateRoomCode && session.privateRoomRole === "host") {
      await cancelPrivateRoom({
        roomCode: session.privateRoomCode,
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
      const pool = getActivePlayerPool(modeRecords.allTime, { allTimeMode: false });
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
  }) => {
    clearLiveDraftSession();
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
    draftOnboardingResolverRef.current = null;
    if (!options?.preserveError) {
      setStartMatchError(options?.error ?? null);
    }
    setModeRecords(loadAllModeRecords());
    setPhase("landing");
    setLandingRenderKey((current) => current + 1);
  };

  const openFeaturePage = useCallback(
    (nextPhase: AppPhase, options?: { returnTo?: AppPhase }) => {
      pendingFeatureNavigationRef.current = true;
      const historyState: FeatureHistoryState = {
        appPhase: nextPhase,
        returnTo: options?.returnTo,
      };
      window.history.pushState(historyState, "");
      setPhase(nextPhase);
    },
    [],
  );

  const exitFeaturePage = useCallback(() => {
    const state = window.history.state as FeatureHistoryState | null;
    const returnTo = state?.returnTo;

    if (returnTo && FEATURE_PHASES.has(returnTo)) {
      skipPopStateResetRef.current = true;
      window.history.back();
      setPhase(returnTo);
      return;
    }

    const shouldNavigateBack =
      FEATURE_PHASES.has(phase) && state?.appPhase;

    resetToLanding();

    if (shouldNavigateBack) {
      skipPopStateResetRef.current = true;
      window.history.back();
    }
  }, [phase]);

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
      // Stay on results if practice restart fails instead of dumping to home.
      if (result === "failed") {
        return;
      }
      return;
    }

    if (user.privateMatch) {
      // Reopen the private match modal so host/guest can choose create or join.
      setPendingPrivateMatchMode(user.salaryCapMode ? "ranked" : "classic");
      resetToLanding();
      return;
    }

    if (user.eventId) {
      const event = getCurrentWeeklyEvent(players);
      if (!event || event.id !== user.eventId) {
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

  const handlePick = useCallback((slot: number, playerId: string) => {
    setUser((current) => {
      if (!current) {
        return current;
      }

      if (current.lineup.includes(playerId)) {
        return current;
      }

      const nextLineup = [...current.lineup];
      nextLineup[slot] = playerId;

      return {
        ...current,
        lineup: nextLineup.slice(0, slot + 1),
      };
    });

    setDraftStep((current) => Math.min(slot + 1, 5));
  }, []);

  const handleTimeout = useCallback(
    (slot: number) => {
      let nextStep: number | null = null;

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
          draftablePlayers,
          slot,
          current.draftSlots.length,
          current.salaryCapLimit,
          current.draftSlots,
        );
        const autoPick = pickRandomTopCandidateForSlot(
          draftablePlayers,
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
            lineup: nextLineup.slice(0, slot + 1),
          };
        }

        if (current.salaryCapLimit != null) {
          const partialLineupIds = current.lineup.filter(
            (playerId): playerId is string => Boolean(playerId),
          );
          const filled = completeSalaryCapDraftFromPartial(
            draftablePlayers,
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
        }

        const nextLineup = [...current.lineup];
        let filledSlot = slot;

        while (filledSlot < current.draftSlots.length) {
          const filledIds = new Set(
            nextLineup.filter((playerId): playerId is string => Boolean(playerId)),
          );
          const selection = pickBestForSlot(
            draftablePlayers,
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

        return current;
      });

      if (nextStep != null) {
        setDraftStep(nextStep);
      }
    },
    [draftablePlayers, isDailyDraft],
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

      // Opponent (or both) already locked — adopt server lineups and finish.
      if (state.opponentReady && state.opponentLineup?.length === 5) {
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

      // Server may have already autofilled us (timeout) and revealed both lineups.
      if (locked.opponentReady && locked.opponentLineup?.length === 5) {
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
            "Your opponent did not finish drafting in time. Return home and try again.",
        });
        return;
      }

      const resolved = await resolveLiveOpponentLineup({
        matchId: liveMatchId,
        playerId,
        opponentPlayerId,
        players: opponentDraftablePlayersRef.current,
        salaryCapLimit: opponent.salaryCapLimit,
      });

      if (cancelled) {
        return;
      }

      if (!resolved) {
        resetToLanding({
          error:
            "Your opponent did not finish drafting in time. Return home and try again.",
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
      setPhase(opponentComplete ? "results" : "waiting");
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

    setPhase("results");
  }, [
    isDailyDraft,
    isPendingQueueMatch,
    opponent,
    opponentComplete,
    phase,
    userDraftComplete,
  ]);

  useEffect(() => {
    if (phase === "waiting" && opponentComplete) {
      setPhase("results");
    }
  }, [phase, opponentComplete]);

  useLayoutEffect(() => {
    if (phase !== "landing") {
      return;
    }

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
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

      if (shouldNavigateBack) {
        skipPopStateResetRef.current = true;
        window.history.back();
      }
    },
    [phase, updateLandingHubTab],
  );

  const handleHubNav = useCallback(
    (tab: LandingHubTab) => {
      if (tab === "standings") {
        if (phase !== "leaderboard") {
          openFeaturePage("leaderboard");
        }
        return;
      }

      if (tab === "tiers") {
        if (phase !== "tierList") {
          openFeaturePage("tierList");
        }
        return;
      }

      goToLandingHub(tab);
    },
    [goToLandingHub, openFeaturePage, phase],
  );

  const goToAccountHub = useCallback(() => {
    goToLandingHub("account");
  }, [goToLandingHub]);

  const hubNavForPhase = ((): LandingHubTab => {
    if (phase === "leaderboard") {
      return "standings";
    }

    if (phase === "tierList") {
      return "tiers";
    }

    if (
      phase === "gmStats" ||
      phase === "privacy" ||
      phase === "terms" ||
      phase === "beta"
    ) {
      return "account";
    }

    if (phase === "achievements" || phase === "stats") {
      return "roster";
    }

    return landingHubTab;
  })();

  const renderHubFeature = (content: ReactNode, layoutClass = "") => (
    <main className={`landing-layout${layoutClass ? ` ${layoutClass}` : ""}`}>
      <HubShell
        activeTab={hubNavForPhase}
        onSelectTab={handleHubNav}
        onAccountClick={goToAccountHub}
      >
        {content}
      </HubShell>
    </main>
  );

  const isMatchmakingSearchActive =
    matchmakingMode != null || isMatchmakingInFlight;

  if (phase === "leaderboard") {
    return renderHubFeature(<LeaderboardPage />);
  }

  if (phase === "gmStats") {
    return renderHubFeature(<GmStatsPage onBack={exitFeaturePage} />);
  }

  if (phase === "achievements") {
    return renderHubFeature(<AchievementsPage onBack={exitFeaturePage} />);
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
    return renderHubFeature(<BetaNotesPage onBack={exitFeaturePage} />);
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
      />,
      "landing-layout--tier-list",
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
          privateRoomCode={privateRoomCode}
          pendingPrivateMatchMode={pendingPrivateMatchMode}
          onPendingPrivateMatchModeConsumed={() =>
            setPendingPrivateMatchMode(null)
          }
          onStartDraft={startMatch}
          onViewDailyLineup={viewDailyLineup}
          onViewYesterdayBestDailyLineup={viewYesterdayBestDailyLineup}
          onCollectionChange={setCollection}
          onViewStats={() => openFeaturePage("stats")}
          onViewTierList={() => openFeaturePage("tierList")}
          onViewGmStats={() => openFeaturePage("gmStats")}
          onViewAchievements={() => openFeaturePage("achievements")}
          onViewLeaderboard={() => openFeaturePage("leaderboard")}
          onViewPrivacy={() => openFeaturePage("privacy")}
          onViewTerms={() => openFeaturePage("terms")}
          onViewBetaNotes={() => openFeaturePage("beta")}
          hubTab={landingHubTab}
          onHubTabChange={updateLandingHubTab}
        />
        {showDraftOnboarding ? (
          <DraftOnboardingOverlay
            hasSalaryCap={draftOnboardingHasSalaryCap}
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
          />
        ) : null}
      </main>
    );
  }

  if (!user) {
    return (
      <main className="landing-layout">
        <section className="panel landing">
          <p className="eyebrow">Draft unavailable</p>
          <h2>We couldn&apos;t load your draft.</h2>
          <p>Return home and try starting again.</p>
          <button type="button" className="secondary-button" onClick={() => resetToLanding()}>
            Back to home
          </button>
        </section>
      </main>
    );
  }

  if (!isDailyDraft && !opponent && !isPendingQueueMatch) {
    return (
      <main className="landing-layout">
        <section className="panel landing">
          <p className="eyebrow">Draft unavailable</p>
          <h2>We couldn&apos;t set up this matchup.</h2>
          <p>Return home and try starting again.</p>
          <button type="button" className="secondary-button" onClick={() => resetToLanding()}>
            Back to home
          </button>
        </section>
      </main>
    );
  }

  const canRenderDraftRoom =
    phase === "drafting" &&
    !userDraftComplete &&
    user.draftSlots.length > 0 &&
    user.draftSlots[draftStep];

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
      ) : phase === "drafting" && !userDraftComplete ? (
        <section className="panel landing">
          <p className="eyebrow">Draft unavailable</p>
          <h2>We couldn&apos;t load this draft board.</h2>
          <p>Return home and try starting again.</p>
          <button type="button" className="secondary-button" onClick={() => resetToLanding()}>
            Back to home
          </button>
        </section>
      ) : null}

      {phase === "waiting" && opponent?.isLiveOpponent ? (
        <WaitingRoom
          theme={getMatchModeTheme(user)}
          opponentName={formatOpponentDisplayName(
            opponent.name,
            opponent.username,
          )}
          opponentAutoDrafted={opponentAutoDrafted}
          onLeave={() => resetToLanding()}
        />
      ) : null}

      {phase === "results" && isPendingQueueMatch && user ? (
        <PendingQueueResults
          user={user}
          userLineup={userLineup}
          starCount={countUnlockedAllStars(collection)}
          onDone={() => resetToLanding()}
        />
      ) : null}

      {phase === "results" && isDailyDraft && dailySetup ? (
        <DailyDraftResults
          user={user}
          userLineup={userLineup}
          dailyDateKey={dailyDateKey}
          dailyGoal={dailySetup.goal}
          benchmarkValues={dailyBenchmarkValues}
          reviewOnly={isDailyReview}
          optimalReview={isDailyOptimalReview}
          onPlayAgain={() => resetToLanding()}
        />
      ) : null}

      {phase === "results" &&
      !isDailyDraft &&
      !isPendingQueueMatch &&
      opponent &&
      matchId ? (
        <MatchResults
          user={user}
          opponent={opponent}
          userLineup={userLineup}
          opponentLineup={opponentLineup}
          matchId={matchId}
          collection={collection}
          onCollectionChange={handleCollectionChange}
          onPlayAgain={replayLastMode}
          onReturnToMenu={() => resetToLanding()}
          isMatchmaking={isMatchmakingSearchActive}
          startMatchError={startMatchError}
          opponentAutoDrafted={opponentAutoDrafted}
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
        />
      ) : null}
    </main>
  );
}

export default App;
