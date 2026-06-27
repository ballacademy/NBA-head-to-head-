import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { players } from "./data/players";
import { DailyDraftResults } from "./components/DailyDraftResults";
import { DraftRoom } from "./components/DraftRoom";
import { LandingPage } from "./components/LandingPage";
import { LeaderboardPage } from "./components/LeaderboardPage";
import { AchievementsPage } from "./components/AchievementsPage";
import { PendingQueueResults } from "./components/PendingQueueResults";
import { PendingOwnerResults } from "./components/PendingOwnerResults";
import { MatchResults } from "./components/MatchResults";
import { PlayerStatsTable } from "./components/PlayerStatsTable";
import { WaitingRoom } from "./components/WaitingRoom";
import { getActivePlayerPool, getPlayersByIdFromActivePool } from "./lib/activePlayerPool";
import { databasePlayers } from "./lib/playerPool";
import {
  generateFeasibleDraftSlots,
  generateFeasibleDraftSlotsUnderSalaryCap,
  pickBestForSlot,
  pickRandomTopCandidateForSlot,
  validateDraftSlotsFeasible,
  validateDraftSlotsFeasibleUnderSalaryCap,
} from "./lib/draft";
import {
  getDailyChallenge,
  getDailyDateKey,
  getDailyDraftSetup,
} from "./lib/dailyDraft";
import { getMatchModeTheme } from "./lib/matchModeTheme";
import {
  formatPlayerDailyDraftPercentile,
  getPlayerDailyDraftEntry,
  hasCompletedDailyDraft,
  resolvePlayerDailyDraftPercentile,
  refreshDailyDraftScoresFromApi,
  simulateDailyBenchmarkValues,
} from "./lib/dailyDraftScores";
import {
  createOpponentDraftSlots,
  createRandomOpponent,
  createClassicOpponent,
  createRankedOpponent,
  createGhostOpponent,
  createUserDrafter,
  getOpponentPickDelayMs,
  sleep,
  type StartDraftOptions,
} from "./lib/match";
import {
  getStartMatchErrorMessage,
  planHeadToHeadMatchmaking,
  type StartMatchError,
} from "./lib/matchmaking";
import {
  fetchDeliverableOwnerResult,
  finalizeDeliveredOwnerResult,
  type DeliveredOwnerResult,
} from "./lib/pendingOwnerResults";
import { getOrCreatePlayerIdentity } from "./lib/playerIdentity";
import type { GhostOpponentSnapshot } from "./lib/ghostMatchmaking";
import { ensureClassicProfile } from "./lib/classicProfile";
import {
  ensurePlayerCollection,
  getDraftablePlayers,
  createOpponentCollection,
  type PlayerCollection,
} from "./lib/playerCollection";
import { isAllTimeModePlayable } from "./lib/eraUnlocks";
import { loadAllModeRecords, loadPlayerRecord } from "./lib/playerRecord";
import { ensureRankedLeaderboard } from "./lib/rankedLeaderboard";
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
  | "leaderboard"
  | "achievements";

function App() {
  const [phase, setPhase] = useState<AppPhase>("landing");
  const [user, setUser] = useState<Drafter | null>(null);
  const [opponent, setOpponent] = useState<Drafter | null>(null);
  const [draftStep, setDraftStep] = useState(0);
  const [opponentPickCount, setOpponentPickCount] = useState(0);
  const [opponentComplete, setOpponentComplete] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [draftSessionKey, setDraftSessionKey] = useState<string | null>(null);
  const [isDailyDraft, setIsDailyDraft] = useState(false);
  const [isDailyReview, setIsDailyReview] = useState(false);
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
  const [startMatchError, setStartMatchError] = useState<string | null>(null);
  const [deliveredOwnerResult, setDeliveredOwnerResult] =
    useState<DeliveredOwnerResult | null>(null);
  const [opponentCollection, setOpponentCollection] = useState<PlayerCollection | null>(
    null,
  );

  useEffect(() => {
    ensureCurrentRankedSeason();
    ensureRankedLeaderboard();
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
      const setup = getDailyDraftSetup(dailyDateKey);
      await refreshDailyDraftScoresFromApi(
        dailyDateKey,
        setup.goal.id,
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
  }, [dailyDateKey, phase]);

  useEffect(() => {
    if (phase !== "landing" || deliveredOwnerResult) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const playerId = getOrCreatePlayerIdentity().playerId;

      for (const mode of ["classic", "ranked"] as const) {
        const delivery = await fetchDeliverableOwnerResult(mode, playerId);

        if (!delivery || cancelled) {
          continue;
        }

        await finalizeDeliveredOwnerResult(delivery, playerId);

        if (!cancelled) {
          setDeliveredOwnerResult(delivery);
          setModeRecords(loadAllModeRecords());
        }

        break;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deliveredOwnerResult, phase]);

  const activePlayers = useMemo(
    () => getActivePlayerPool(modeRecords.allTime, { allTimeMode }),
    [allTimeMode, modeRecords.allTime],
  );

  const dailyChallenge = useMemo(
    () => getDailyChallenge(dailyDateKey),
    [dailyDateKey],
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

  const dailySetup = useMemo(
    () => (isDailyDraft ? getDailyDraftSetup(dailyDateKey) : null),
    [dailyDateKey, isDailyDraft],
  );

  const landingDailySetup = useMemo(
    () => getDailyDraftSetup(dailyDateKey),
    [dailyDateKey],
  );

  const landingDailyEntry = useMemo(
    () =>
      getPlayerDailyDraftEntry(
        dailyDateKey,
        landingDailySetup.goal.id,
      ),
    [dailyDateKey, dailyScoresRefreshTick, landingDailySetup.goal.id],
  );

  const landingDailyBenchmarkValues = useMemo(
    () =>
      simulateDailyBenchmarkValues(
        activePlayers,
        landingDailySetup.slots,
        landingDailySetup.goal,
        dailyDateKey,
      ),
    [activePlayers, dailyDateKey, landingDailySetup.goal, landingDailySetup.slots],
  );

  const landingDailyPercentileLabel = useMemo(() => {
    if (!landingDailyEntry) {
      return null;
    }

    return formatPlayerDailyDraftPercentile(
      resolvePlayerDailyDraftPercentile(
        dailyDateKey,
        landingDailyEntry,
        landingDailySetup.goal,
        landingDailyBenchmarkValues,
      ),
    );
  }, [
    dailyDateKey,
    landingDailyBenchmarkValues,
    landingDailyEntry,
    landingDailySetup.goal,
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
  const userDraftComplete = draftStep >= 5;

  const startMatch = async (
    team: TeamProfile,
    options: StartDraftOptions = {},
  ): Promise<boolean> => {
    if (collection.pendingUnlock) {
      return false;
    }

    setStartMatchError(null);

    if (options.allTimeMode && !isAllTimeModePlayable()) {
      return false;
    }

    const daily = Boolean(options.isDailyDraft);
    const salaryCapMode = Boolean(options.salaryCapMode);
    const nextAllTimeMode = Boolean(options.allTimeMode);
    const dateKey = getDailyDateKey();
    const setup = daily ? getDailyDraftSetup(dateKey) : null;

    if (
      daily &&
      setup &&
      hasCompletedDailyDraft(dateKey, setup.goal.id)
    ) {
      return false;
    }

    const pool = getActivePlayerPool(loadPlayerRecord("allTime"), {
      allTimeMode: nextAllTimeMode,
    });
    const salaryCapLimit =
      daily || nextAllTimeMode
        ? undefined
        : salaryCapMode
          ? RANKED_SALARY_CAP
          : CLASSIC_HEAD_TO_HEAD_SALARY_CAP;
    const draftPool = daily ? pool : getDraftablePlayers(pool, collection);
    let ghostOpponent: GhostOpponentSnapshot | null = null;
    let isPendingQueue = false;

    if (!daily && !nextAllTimeMode) {
      const nextMatchmakingMode = salaryCapMode ? "ranked" : "classic";
      setMatchmakingStartedAt(Date.now());
      setMatchmakingMode(nextMatchmakingMode);
      const playerId = getOrCreatePlayerIdentity().playerId;
      const elo = salaryCapMode
        ? ensureCurrentRankedSeason().elo
        : ensureClassicProfile().elo;
      const resolution = await planHeadToHeadMatchmaking({
        mode: nextMatchmakingMode,
        playerId,
        playerElo: elo,
      });

      setMatchmakingMode(null);
      setMatchmakingStartedAt(null);

      if (!resolution.ok) {
        setStartMatchError(getStartMatchErrorMessage(resolution.error));
        return false;
      }

      if (resolution.plan.kind === "ghost") {
        ghostOpponent = resolution.plan.ghost;
      } else if (resolution.plan.kind === "queue_for_live") {
        isPendingQueue = true;
      }
    }

    const nextOpponentCollection =
      daily || isPendingQueue ? null : createOpponentCollection(collection);
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
      daily || isPendingQueue ? null : createOpponentDraftSlots(opponentPool);
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
        (!opponentSlots ||
          opponentSlots.length === 0 ||
          !slotsAreFeasible(opponentPool, opponentSlots)))
    ) {
      setStartMatchError(getStartMatchErrorMessage("setup_failed"));
      return false;
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
        allTimeMode: nextAllTimeMode,
      }),
    );
    setOpponent(
      isPendingQueue
        ? null
        : ghostOpponent && opponentSlots
          ? createGhostOpponent(opponentSlots, ghostOpponent, { salaryCapMode })
          : opponentSlots
            ? salaryCapMode
              ? createRankedOpponent(opponentSlots)
              : nextAllTimeMode
                ? { ...createRandomOpponent(opponentSlots), allTimeMode: true }
                : createClassicOpponent(opponentSlots)
            : null,
    );
    setOpponentCollection(nextOpponentCollection);
    setDraftStep(0);
    setOpponentPickCount(0);
    setOpponentComplete(daily || isPendingQueue);
    setMatchId(null);
    setDraftSessionKey(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `draft-${Date.now()}`,
    );
    setPhase("drafting");
    return true;
  };

  const viewDailyLineup = useCallback((): boolean => {
    const dateKey = getDailyDateKey();
    const setup = getDailyDraftSetup(dateKey);
    const entry = getPlayerDailyDraftEntry(dateKey, setup.goal.id);

    if (!entry?.lineup || entry.lineup.length < 5) {
      return false;
    }

    const team =
      loadTeamProfile() ??
      (entry.teamName ? { name: entry.teamName } : null);

    if (!team) {
      return false;
    }

    saveTeamProfile(team);
    setIsDailyDraft(true);
    setIsDailyReview(true);
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
    setAllTimeMode(false);
    setModeRecords(loadAllModeRecords());
    setPhase("landing");
  };

  const replayLastMode = async () => {
    if (!user) {
      resetToLanding();
      return;
    }

    if (isDailyDraft) {
      const team = { name: user.name };
      if (!(await startMatch(team, { isDailyDraft: true }))) {
        resetToLanding();
      }
      return;
    }

    const team = { name: user.name };
    const replayAllTime =
      Boolean(user.allTimeMode) && isAllTimeModePlayable();

    if (
      !(await startMatch(team, {
        salaryCapMode: Boolean(user.salaryCapMode),
        allTimeMode: replayAllTime,
      }))
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
      let picked = false;

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
        );
        const autoPick = pickRandomTopCandidateForSlot(
          draftablePlayers,
          slotConstraint,
          pickedIds,
          salaryOptions,
        );

        if (!autoPick) {
          return current;
        }

        picked = true;
        const nextLineup = [...current.lineup];
        nextLineup[slot] = autoPick;

        return {
          ...current,
          lineup: nextLineup.slice(0, slot + 1),
        };
      });

      if (picked) {
        setDraftStep((current) => Math.min(Math.max(current, slot) + 1, 5));
      }
    },
    [draftablePlayers],
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
    if (isDailyDraft || !opponent) {
      return;
    }

    const {
      id: opponentId,
      draftSlots,
      salaryCapLimit,
      isGhostOpponent,
      lineup,
    } = opponent;

    if (draftSlots.length === 0) {
      return;
    }

    let cancelled = false;

    const simulateOpponentDraft = async () => {
      if (isGhostOpponent) {
        const storedLineup = lineup.filter((playerId): playerId is string =>
          Boolean(playerId),
        );
        const revealCount = Math.min(storedLineup.length, draftSlots.length);

        for (let index = 0; index < revealCount; index += 1) {
          await sleep(getOpponentPickDelayMs());
          if (cancelled) {
            return;
          }

          const pickCount = index + 1;
          setOpponentPickCount(pickCount);
          setOpponent((current) =>
            current?.id === opponentId
              ? {
                  ...current,
                  lineup: storedLineup.slice(0, pickCount),
                }
              : current,
          );
        }

        if (!cancelled) {
          setOpponent((current) =>
            current?.id === opponentId
              ? { ...current, lineup: storedLineup }
              : current,
          );
          setOpponentComplete(true);
        }

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
          lineup,
          opponentDraftablePlayersRef.current,
          index,
          draftSlots.length,
          salaryCapLimit,
        );
        const selection = pickBestForSlot(
          opponentDraftablePlayersRef.current,
          slot,
          pickedIds,
          salaryOptions,
        );
        if (selection) {
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
  }, [isDailyDraft, opponent?.id]);

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

    setPhase(opponentComplete ? "results" : "waiting");
  }, [isDailyDraft, isPendingQueueMatch, opponentComplete, phase, userDraftComplete]);

  useEffect(() => {
    if (phase === "waiting" && opponentComplete) {
      setPhase("results");
    }
  }, [phase, opponentComplete]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [phase]);

  if (phase === "leaderboard") {
    return (
      <main className="landing-layout">
        <LeaderboardPage onBack={resetToLanding} />
      </main>
    );
  }

  if (phase === "achievements") {
    return (
      <main className="landing-layout">
        <AchievementsPage onBack={resetToLanding} />
      </main>
    );
  }

  if (phase === "stats") {
    return (
      <main className="landing-layout">
        <PlayerStatsTable
          players={databasePlayers}
          collection={collection}
          onBack={resetToLanding}
        />
      </main>
    );
  }

  if (phase === "landing" && deliveredOwnerResult) {
    return (
      <main className="landing-layout">
        <PendingOwnerResults
          delivery={deliveredOwnerResult}
          modeRecords={modeRecords}
          onDone={() => setDeliveredOwnerResult(null)}
        />
      </main>
    );
  }

  if (phase === "landing") {
    return (
      <main className="landing-layout">
        <LandingPage
          collection={collection}
          dailyChallenge={dailyChallenge}
          modeRecords={modeRecords}
          matchmakingMode={matchmakingMode}
          matchmakingElapsedSeconds={matchmakingElapsedSeconds}
          dailyPercentileLabel={landingDailyPercentileLabel}
          canViewDailyLineup={canViewDailyLineup}
          startMatchError={startMatchError}
          onStartDraft={startMatch}
          onViewDailyLineup={viewDailyLineup}
          onCollectionChange={setCollection}
          onViewStats={() => setPhase("stats")}
          onViewAchievements={() => setPhase("achievements")}
          onViewLeaderboard={() => setPhase("leaderboard")}
        />
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

      {phase === "waiting" && opponent ? (
        <WaitingRoom
          opponentPickCount={opponentPickCount}
          totalPicks={opponent.draftSlots.length}
          theme={getMatchModeTheme(user)}
        />
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
        />
      ) : null}
    </main>
  );
}

export default App;
