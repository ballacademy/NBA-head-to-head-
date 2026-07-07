import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { players } from "./data/players";
import { DailyDraftResults } from "./components/DailyDraftResults";
import { DraftOnboardingOverlay } from "./components/DraftOnboardingOverlay";
import { DraftRoom } from "./components/DraftRoom";
import { LandingPage } from "./components/LandingPage";
import { LeaderboardPage } from "./components/LeaderboardPage";
import { AchievementsPage } from "./components/AchievementsPage";
import { GmStatsPage } from "./components/GmStatsPage";
import { LegalPage } from "./components/LegalPage";
import { PendingQueueResults } from "./components/PendingQueueResults";
import { MatchmakingOverlay } from "./components/MatchmakingOverlay";
import { MatchResults } from "./components/MatchResults";
import { PlayerStatsTable } from "./components/PlayerStatsTable";
import { WaitingRoom } from "./components/WaitingRoom";
import { getActivePlayerPool, getPlayersByIdFromActivePool } from "./lib/activePlayerPool";
import { databasePlayers } from "./lib/playerPool";
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
  planHeadToHeadMatchmaking,
} from "./lib/matchmaking";
import { getOrCreatePlayerIdentity } from "./lib/playerIdentity";
import type { GhostOpponentSnapshot } from "./lib/ghostMatchmaking";
import type { LiveOpponentSnapshot } from "./lib/liveMatchmaking";
import {
  leaveMatchmakingQueue,
  submitLiveMatchLineup,
  waitForLiveOpponentLineup,
} from "./lib/liveMatchmaking";
import { RANKED_STARTING_ELO } from "./lib/rankedElo";
import {
  ensurePlayerCollection,
  getDraftablePlayers,
  createOpponentCollection,
  type PlayerCollection,
} from "./lib/playerCollection";
import { isAllTimeModePlayable } from "./lib/eraUnlocks";
import { loadAllModeRecords, loadPlayerRecord } from "./lib/playerRecord";
import { ensureNpcOpponentPool } from "./lib/rankedLeaderboard";
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
  | "gmStats"
  | "leaderboard"
  | "achievements"
  | "privacy"
  | "terms";

const FEATURE_PHASES = new Set<AppPhase>([
  "stats",
  "gmStats",
  "leaderboard",
  "achievements",
  "privacy",
  "terms",
]);

type FeatureHistoryState = {
  appPhase?: AppPhase;
  returnTo?: AppPhase;
};

function App() {
  const [phase, setPhase] = useState<AppPhase>("landing");
  const [showDraftOnboarding, setShowDraftOnboarding] = useState(false);
  const [user, setUser] = useState<Drafter | null>(null);
  const [opponent, setOpponent] = useState<Drafter | null>(null);
  const [draftStep, setDraftStep] = useState(0);
  const [opponentPickCount, setOpponentPickCount] = useState(0);
  const [opponentComplete, setOpponentComplete] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [draftSessionKey, setDraftSessionKey] = useState<string | null>(null);
  const [isDailyDraft, setIsDailyDraft] = useState(false);
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
    "classic" | "ranked" | null
  >(null);
  const [matchmakingStartedAt, setMatchmakingStartedAt] = useState<number | null>(
    null,
  );
  const [matchmakingElapsedSeconds, setMatchmakingElapsedSeconds] = useState(0);
  const [isCancellingMatchmaking, setIsCancellingMatchmaking] = useState(false);
  const [startMatchError, setStartMatchError] = useState<string | null>(null);
  const [opponentCollection, setOpponentCollection] = useState<PlayerCollection | null>(
    null,
  );
  const [landingRenderKey, setLandingRenderKey] = useState(0);
  const skipPopStateResetRef = useRef(false);
  const pendingFeatureNavigationRef = useRef(false);
  const matchmakingCancelledRef = useRef(false);
  const matchmakingSessionRef = useRef<{
    mode: "classic" | "ranked";
    playerId: string;
  } | null>(null);
  const todaysDailyDateKey = useDailyDateKey();

  useEffect(() => {
    ensureCurrentRankedSeason();
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
      const entry = findPlayerDailyDraftEntry(todayKey);
      const goalId =
        entry?.goalId ?? getDailyDraftSetup(todayKey).goal.id;

      await refreshDailyDraftScoresFromApi(
        todayKey,
        goalId,
        getOrCreatePlayerIdentity().playerId,
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

  const draftablePlayers = useMemo(
    () =>
      isDailyDraft
        ? activePlayers
        : getDraftablePlayers(activePlayers, collection),
    [activePlayers, collection, isDailyDraft],
  );

  const opponentDraftablePlayers = useMemo(
    () =>
      opponentCollection
        ? getDraftablePlayers(activePlayers, opponentCollection)
        : activePlayers,
    [activePlayers, opponentCollection],
  );
  const opponentDraftablePlayersRef = useRef(opponentDraftablePlayers);

  opponentDraftablePlayersRef.current = opponentDraftablePlayers;

  const dailySetup = useMemo(() => {
    if (!isDailyDraft) {
      return null;
    }

    if (isDailyOptimalReview) {
      return getDailyDraftSetup(dailyDateKey);
    }

    if (isDailyReview) {
      return getResolvedDailyDraftSetup(dailyDateKey);
    }

    return getDailyDraftSetup(dailyDateKey);
  }, [dailyDateKey, isDailyDraft, isDailyOptimalReview, isDailyReview]);

  const landingDailySetup = useMemo(
    () => getDailyDraftSetup(todaysDailyDateKey),
    [dailyScoresRefreshTick, todaysDailyDateKey],
  );

  const landingDailyEntry = useMemo(
    () => findPlayerDailyDraftEntry(todaysDailyDateKey),
    [dailyScoresRefreshTick, todaysDailyDateKey],
  );

  const landingDailyGoal = useMemo(() => {
    if (landingDailyEntry?.goalId) {
      const storedGoal = getDailyGoalById(landingDailyEntry.goalId);

      if (storedGoal) {
        return storedGoal;
      }
    }

    return landingDailySetup.goal;
  }, [landingDailyEntry, landingDailySetup.goal]);

  const landingDailyBenchmarkValues = useMemo(
    () =>
      simulateDailyBenchmarkValues(
        activePlayers,
        landingDailySetup.slots,
        landingDailyGoal,
        todaysDailyDateKey,
      ),
    [
      activePlayers,
      landingDailyGoal,
      landingDailySetup.slots,
      todaysDailyDateKey,
    ],
  );

  const landingDailyPercentileLabel = useMemo(() => {
    if (!landingDailyEntry) {
      return null;
    }

    return formatPlayerDailyDraftPercentile(
      resolvePlayerDailyDraftPercentile(
        todaysDailyDateKey,
        landingDailyEntry,
        landingDailyGoal,
        landingDailyBenchmarkValues,
      ),
    );
  }, [
    landingDailyBenchmarkValues,
    landingDailyEntry,
    landingDailyGoal,
    todaysDailyDateKey,
  ]);

  const canViewDailyLineup = Boolean(
    landingDailyEntry?.lineup && landingDailyEntry.lineup.length >= 5,
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

  const userLineup = getPlayersByIdFromActivePool(user?.lineup ?? [], modeRecords.allTime, {
    allTimeMode,
  });
  const opponentLineup = getPlayersByIdFromActivePool(
    opponent?.lineup ?? [],
    modeRecords.allTime,
    { allTimeMode },
  );
  const userDraftComplete =
    draftStep >= 5 &&
    (user?.lineup.filter((playerId): playerId is string => Boolean(playerId))
      .length ?? 0) >= 5;

  const startMatch = async (
    team: TeamProfile,
    options: StartDraftOptions = {},
  ): Promise<StartMatchResult> => {
    if (collection.pendingUnlock) {
      return "failed";
    }

    setStartMatchError(null);

    if (options.allTimeMode && !isAllTimeModePlayable()) {
      return "failed";
    }

    const daily = Boolean(options.isDailyDraft);
    const practiceMode = Boolean(options.practiceMode);
    const salaryCapMode = Boolean(options.salaryCapMode);
    const nextAllTimeMode = Boolean(options.allTimeMode);
    const dateKey = getDailyDateKey();
    const setup = daily ? getDailyDraftSetup(dateKey) : null;

    if (daily && hasCompletedDailyDraft(dateKey)) {
      return "failed";
    }

    const pool = getActivePlayerPool(loadPlayerRecord("allTime"), {
      allTimeMode: nextAllTimeMode,
    });
    const salaryCapLimit =
      practiceMode
        ? options.salaryCapLimit ?? RANKED_SALARY_CAP
        : daily || nextAllTimeMode
          ? undefined
          : salaryCapMode
            ? RANKED_SALARY_CAP
            : CLASSIC_HEAD_TO_HEAD_SALARY_CAP;
    const draftPool = daily ? pool : getDraftablePlayers(pool, collection);
    let ghostOpponent: GhostOpponentSnapshot | null = null;
    let liveOpponent: LiveOpponentSnapshot | null = null;
    let isPendingQueue = false;

    if (!daily && !nextAllTimeMode && !practiceMode) {
      const nextMatchmakingMode = salaryCapMode ? "ranked" : "classic";
      const playerId = getOrCreatePlayerIdentity().playerId;
      matchmakingCancelledRef.current = false;
      matchmakingSessionRef.current = {
        mode: nextMatchmakingMode,
        playerId,
      };
      setMatchmakingStartedAt(Date.now());
      setMatchmakingMode(nextMatchmakingMode);
      const elo = salaryCapMode
        ? ensureCurrentRankedSeason().elo
        : RANKED_STARTING_ELO;
      const resolution = await planHeadToHeadMatchmaking(
        {
          mode: nextMatchmakingMode,
          playerId,
          playerElo: elo,
          teamName: team.name,
        },
        { isCancelled: () => matchmakingCancelledRef.current },
      );

      setMatchmakingMode(null);
      setMatchmakingStartedAt(null);
      matchmakingSessionRef.current = null;
      setIsCancellingMatchmaking(false);

      if (!resolution.ok) {
        if (resolution.error === "cancelled") {
          return "cancelled";
        }

        setStartMatchError(getStartMatchErrorMessage(resolution.error));
        return "failed";
      }

      if (resolution.plan.kind === "live") {
        liveOpponent = resolution.plan.live;
      } else if (resolution.plan.kind === "ghost") {
        ghostOpponent = resolution.plan.ghost;
      } else if (resolution.plan.kind === "queue_for_live") {
        isPendingQueue = true;
      }
    }

    const nextOpponentCollection =
      daily || isPendingQueue || practiceMode
        ? null
        : createOpponentCollection(collection);
    const opponentPool = nextOpponentCollection
      ? getDraftablePlayers(pool, nextOpponentCollection)
      : pool;
    const setupSlots = setup?.slots;
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

    let userSlots = setupSlots ?? generateFeasibleDraftSlots(draftPool);
    if (
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
        : createOpponentDraftSlots(practiceMode ? draftPool : opponentPool);
    if (
      opponentSlots &&
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
        (!opponentSlots ||
          opponentSlots.length === 0 ||
          !slotsAreFeasible(opponentPool, opponentSlots)))
    ) {
      setStartMatchError(getStartMatchErrorMessage("setup_failed"));
      return "failed";
    }

    if (
      practiceMode &&
      (!opponentSlots ||
        opponentSlots.length === 0 ||
        !slotsAreFeasible(draftPool, opponentSlots))
    ) {
      setStartMatchError(getStartMatchErrorMessage("setup_failed"));
      return "failed";
    }

    saveTeamProfile(team);
    setModeRecords(loadAllModeRecords());
    setIsDailyDraft(daily);
    setIsDailyReview(false);
    setAllTimeMode(nextAllTimeMode);
    setIsPendingQueueMatch(isPendingQueue);
    setDailyDateKey(dateKey);
    setUser(
      createUserDrafter(team, userSlots, {
        isDailyDraft: daily,
        dailyChallengeTitle: setup?.challenge.title,
        salaryCapMode,
        salaryCapLimit,
        allTimeMode: nextAllTimeMode,
        practiceMode,
      }),
    );
    setOpponent(
      isPendingQueue
        ? null
        : liveOpponent && opponentSlots
          ? createLiveOpponent(opponentSlots, liveOpponent, { salaryCapMode })
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
    setMatchId(null);
    setDraftSessionKey(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `draft-${Date.now()}`,
    );
    setPhase("drafting");
    return "started";
  };

  const cancelMatchmaking = useCallback(async () => {
    const session = matchmakingSessionRef.current;

    if (!session || matchmakingCancelledRef.current) {
      return;
    }

    matchmakingCancelledRef.current = true;
    setIsCancellingMatchmaking(true);
    setMatchmakingMode(null);
    setMatchmakingStartedAt(null);

    await leaveMatchmakingQueue({
      mode: session.mode,
      playerId: session.playerId,
    });
  }, []);

  const viewDailyLineup = useCallback((): boolean => {
    const dateKey = getDailyDateKey();
    const entry = findPlayerDailyDraftEntry(dateKey);

    if (!entry?.lineup || entry.lineup.length < 5) {
      return false;
    }

    const setup = getResolvedDailyDraftSetup(dateKey);

    const team =
      loadTeamProfile() ??
      (entry.teamName ? { name: entry.teamName } : null);

    if (!team) {
      return false;
    }

    saveTeamProfile(team);
    setIsDailyDraft(true);
    setIsDailyReview(true);
    setIsDailyOptimalReview(false);
    setDailyDateKey(dateKey);
    setUser({
      ...createUserDrafter(team, setup.slots, {
        isDailyDraft: true,
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

  const viewYesterdayBestDailyLineup = useCallback(async (): Promise<boolean> => {
    const setup = getYesterdayBestDailyDraftSetup(getDailyDateKey());
    const yesterdayKey = setup.dateKey;
    const playerId = getOrCreatePlayerIdentity().playerId;
    await refreshCanonicalDailyGoalData(yesterdayKey, playerId);
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

    saveTeamProfile(team);
    setIsDailyDraft(true);
    setIsDailyReview(true);
    setIsDailyOptimalReview(true);
    setDailyDateKey(yesterdayKey);
    setUser({
      ...createUserDrafter(team, setup.slots, {
        isDailyDraft: true,
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
  }, [modeRecords.allTime]);

  const resetToLanding = () => {
    setUser(null);
    setOpponent(null);
    setOpponentCollection(null);
    setDraftStep(0);
    setOpponentPickCount(0);
    setOpponentComplete(false);
    setMatchId(null);
    setDraftSessionKey(null);
    setIsPendingQueueMatch(false);
    setMatchmakingMode(null);
    setMatchmakingStartedAt(null);
    setIsDailyDraft(false);
    setIsDailyReview(false);
    setIsDailyOptimalReview(false);
    setDailyDateKey(getDailyDateKey());
    setAllTimeMode(false);
    setShowDraftOnboarding(false);
    setStartMatchError(null);
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
      if ((await startMatch(team, { isDailyDraft: true })) === "failed") {
        resetToLanding();
      }
      return;
    }

    const team = { name: user.name };
    if (user.practiceMode) {
      if (
        (await startMatch(team, {
          practiceMode: true,
          salaryCapMode: Boolean(user.salaryCapMode),
          salaryCapLimit: user.salaryCapLimit,
        })) === "failed"
      ) {
        resetToLanding();
      }
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
      resetToLanding();
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
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `match-${Date.now()}`,
      );
    }
  }, [isDailyDraft, isPendingQueueMatch, matchId, phase]);

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
      await submitLiveMatchLineup({
        matchId: liveMatchId,
        playerId,
        lineup,
      });

      const opponentLineup = await waitForLiveOpponentLineup({
        matchId: liveMatchId,
        playerId,
      });

      if (cancelled || !opponentLineup) {
        if (!cancelled && !opponentLineup) {
          setStartMatchError(
            "Your opponent did not finish drafting in time. Return home and try again.",
          );
          resetToLanding();
        }
        return;
      }

      setOpponent((current) =>
        current?.liveMatchId === liveMatchId
          ? { ...current, lineup: opponentLineup }
          : current,
      );
      setOpponentPickCount(opponentLineup.length);
      setOpponentComplete(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    opponent?.id,
    opponent?.isLiveOpponent,
    opponent?.liveMatchId,
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

  useEffect(() => {
    if (
      phase === "drafting" &&
      user &&
      user.draftSlots.length > 0 &&
      draftStep < user.draftSlots.length &&
      !hasSeenDraftOnboarding()
    ) {
      setShowDraftOnboarding(true);
    }
  }, [draftStep, phase, user, draftSessionKey]);

  if (phase === "leaderboard") {
    return (
      <main className="landing-layout">
        <LeaderboardPage onBack={exitFeaturePage} />
      </main>
    );
  }

  if (phase === "gmStats") {
    return (
      <main className="landing-layout">
        <GmStatsPage onBack={exitFeaturePage} />
      </main>
    );
  }

  if (phase === "achievements") {
    return (
      <main className="landing-layout">
        <AchievementsPage onBack={exitFeaturePage} />
      </main>
    );
  }

  if (phase === "privacy") {
    return (
      <main className="landing-layout">
        <LegalPage kind="privacy" onBack={exitFeaturePage} />
      </main>
    );
  }

  if (phase === "terms") {
    return (
      <main className="landing-layout">
        <LegalPage
          kind="terms"
          onBack={exitFeaturePage}
          onOpenPrivacy={() => openFeaturePage("privacy", { returnTo: "terms" })}
        />
      </main>
    );
  }

  if (phase === "stats") {
    return (
      <main className="landing-layout landing-layout--stats">
        <PlayerStatsTable
          players={databasePlayers}
          collection={collection}
          onBack={exitFeaturePage}
        />
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
          matchmakingElapsedSeconds={matchmakingElapsedSeconds}
          dailyPercentileLabel={landingDailyPercentileLabel}
          canViewDailyLineup={canViewDailyLineup}
          startMatchError={startMatchError}
          onStartDraft={startMatch}
          onViewDailyLineup={viewDailyLineup}
          onViewYesterdayBestDailyLineup={viewYesterdayBestDailyLineup}
          onCollectionChange={setCollection}
          onViewStats={() => openFeaturePage("stats")}
          onViewGmStats={() => openFeaturePage("gmStats")}
          onViewAchievements={() => openFeaturePage("achievements")}
          onViewLeaderboard={() => openFeaturePage("leaderboard")}
          onViewPrivacy={() => openFeaturePage("privacy")}
          onViewTerms={() => openFeaturePage("terms")}
        />
        {matchmakingMode ? (
          <MatchmakingOverlay
            mode={matchmakingMode}
            elapsedSeconds={matchmakingElapsedSeconds}
            onCancel={cancelMatchmaking}
            isCancelling={isCancellingMatchmaking}
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
          <button type="button" className="secondary-button" onClick={resetToLanding}>
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
          <button type="button" className="secondary-button" onClick={resetToLanding}>
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
          {showDraftOnboarding ? (
            <DraftOnboardingOverlay
              hasSalaryCap={user.salaryCapLimit != null}
              onDismiss={() => {
                markDraftOnboardingSeen();
                setShowDraftOnboarding(false);
              }}
            />
          ) : null}
          <DraftRoom
            drafter={user}
            players={draftablePlayers}
            activeStep={draftStep}
            draftSessionKey={draftSessionKey}
            dailyChallengeDescription={dailySetup?.challenge.description}
            dailyChallengeTitle={dailySetup?.challenge.title}
            isDailyDraft={isDailyDraft}
            onPick={handlePick}
            onTimeout={handleTimeout}
          />
        </div>
      ) : phase === "drafting" && !userDraftComplete ? (
        <section className="panel landing">
          <p className="eyebrow">Draft unavailable</p>
          <h2>We couldn&apos;t load this draft board.</h2>
          <p>Return home and try starting again.</p>
          <button type="button" className="secondary-button" onClick={resetToLanding}>
            Back to home
          </button>
        </section>
      ) : null}

      {phase === "waiting" && opponent?.isLiveOpponent ? (
        <WaitingRoom theme={getMatchModeTheme(user)} />
      ) : null}

      {phase === "results" && isPendingQueueMatch && user ? (
        <PendingQueueResults
          user={user}
          userLineup={userLineup}
          onDone={resetToLanding}
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
          onPlayAgain={resetToLanding}
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
          onReturnToMenu={resetToLanding}
          isMatchmaking={matchmakingMode != null}
        />
      ) : null}
      {matchmakingMode ? (
        <MatchmakingOverlay
          mode={matchmakingMode}
          elapsedSeconds={matchmakingElapsedSeconds}
          onCancel={cancelMatchmaking}
          isCancelling={isCancellingMatchmaking}
        />
      ) : null}
    </main>
  );
}

export default App;
