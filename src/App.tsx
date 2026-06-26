import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { players } from "./data/players";
import { DailyDraftResults } from "./components/DailyDraftResults";
import { DraftRoom } from "./components/DraftRoom";
import { LandingPage } from "./components/LandingPage";
import { LeaderboardPage } from "./components/LeaderboardPage";
import { AchievementsPage } from "./components/AchievementsPage";
import { MatchResults } from "./components/MatchResults";
import { PlayerStatsTable } from "./components/PlayerStatsTable";
import { WaitingRoom } from "./components/WaitingRoom";
import { getActivePlayerPool, getPlayersByIdFromActivePool } from "./lib/activePlayerPool";
import {
  generateFeasibleDraftSlots,
  generateFeasibleDraftSlotsUnderSalaryCap,
  pickBestForSlot,
  validateDraftSlotsFeasible,
  validateDraftSlotsFeasibleUnderSalaryCap,
} from "./lib/draft";
import {
  getDailyChallenge,
  getDailyDateKey,
  getDailyDraftSetup,
} from "./lib/dailyDraft";
import { getMatchModeTheme } from "./lib/matchModeTheme";
import { simulateDailyBenchmarkValues } from "./lib/dailyDraftScores";
import {
  createOpponentDraftSlots,
  createRandomOpponent,
  createClassicOpponent,
  createRankedOpponent,
  createUserDrafter,
  getOpponentPickDelayMs,
  sleep,
  type StartDraftOptions,
} from "./lib/match";
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
import { saveTeamProfile } from "./lib/teamProfile";
import type { TeamProfile } from "./lib/teamProfile";
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
  const [isDailyDraft, setIsDailyDraft] = useState(false);
  const [allTimeMode, setAllTimeMode] = useState(false);
  const [dailyDateKey, setDailyDateKey] = useState(getDailyDateKey());
  const [modeRecords, setModeRecords] = useState(loadAllModeRecords);
  const [collection, setCollection] = useState<PlayerCollection>(() =>
    ensurePlayerCollection(),
  );

  useEffect(() => {
    ensureCurrentRankedSeason();
    ensureRankedLeaderboard();
  }, []);

  const [opponentCollection, setOpponentCollection] = useState<PlayerCollection | null>(
    null,
  );

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

  const startMatch = (team: TeamProfile, options: StartDraftOptions = {}) => {
    if (collection.pendingUnlock) {
      return false;
    }

    if (options.allTimeMode && !isAllTimeModePlayable()) {
      return false;
    }

    const daily = Boolean(options.isDailyDraft);
    const salaryCapMode = Boolean(options.salaryCapMode);
    const nextAllTimeMode = Boolean(options.allTimeMode);
    const dateKey = getDailyDateKey();
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
    const nextOpponentCollection = daily ? null : createOpponentCollection(collection);
    const opponentPool = nextOpponentCollection
      ? getDraftablePlayers(pool, nextOpponentCollection)
      : pool;
    const setup = daily ? getDailyDraftSetup(dateKey) : null;
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

    let userSlots = setup?.slots ?? generateFeasibleDraftSlots(draftPool);
    if (
      salaryCapLimit != null &&
      !slotsAreFeasible(draftPool, userSlots)
    ) {
      userSlots = generateFeasibleDraftSlotsUnderSalaryCap(
        draftPool,
        salaryCapLimit,
      );
    }

    let opponentSlots = daily ? null : createOpponentDraftSlots(opponentPool);
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
        (!opponentSlots ||
          opponentSlots.length === 0 ||
          !slotsAreFeasible(opponentPool, opponentSlots)))
    ) {
      return false;
    }

    saveTeamProfile(team);
    setModeRecords(loadAllModeRecords());
    setIsDailyDraft(daily);
    setAllTimeMode(nextAllTimeMode);
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
      opponentSlots
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
    setOpponentComplete(daily);
    setMatchId(null);
    setPhase("drafting");
    return true;
  };

  const resetToLanding = () => {
    setUser(null);
    setOpponent(null);
    setOpponentCollection(null);
    setDraftStep(0);
    setOpponentPickCount(0);
    setOpponentComplete(false);
    setMatchId(null);
    setIsDailyDraft(false);
    setAllTimeMode(false);
    setModeRecords(loadAllModeRecords());
    setPhase("landing");
  };

  const replayLastMode = () => {
    if (!user) {
      resetToLanding();
      return;
    }

    if (isDailyDraft) {
      const team = { name: user.name };
      if (!startMatch(team, { isDailyDraft: true })) {
        resetToLanding();
      }
      return;
    }

    const team = { name: user.name };
    const replayAllTime =
      Boolean(user.allTimeMode) && isAllTimeModePlayable();

    if (
      !startMatch(team, {
        salaryCapMode: Boolean(user.salaryCapMode),
        allTimeMode: replayAllTime,
      })
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
        const bestPick = pickBestForSlot(
          draftablePlayers,
          slotConstraint,
          pickedIds,
          salaryOptions,
        );

        if (!bestPick) {
          return current;
        }

        picked = true;
        const nextLineup = [...current.lineup];
        nextLineup[slot] = bestPick;

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
    if (phase === "results" && !isDailyDraft && !matchId) {
      setMatchId(
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `match-${Date.now()}`,
      );
    }
  }, [isDailyDraft, matchId, phase]);

  useEffect(() => {
    if (isDailyDraft || !opponent) {
      return;
    }

    const { id: opponentId, draftSlots, salaryCapLimit } = opponent;

    if (draftSlots.length === 0) {
      return;
    }

    let cancelled = false;

    const simulateOpponentDraft = async () => {
      const pickedIds = new Set<string>();
      const lineup: string[] = [];

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
          lineup.push(selection);
        }

        const pickCount = lineup.length;
        setOpponentPickCount(pickCount);
        setOpponent((current) =>
          current?.id === opponentId
            ? {
                ...current,
                lineup: [...lineup],
              }
            : current,
        );
      }

      if (!cancelled && lineup.length === draftSlots.length) {
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

    setPhase(opponentComplete ? "results" : "waiting");
  }, [isDailyDraft, opponentComplete, phase, userDraftComplete]);

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
          players={activePlayers}
          collection={collection}
          onBack={resetToLanding}
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
          onStartDraft={startMatch}
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

  if (!isDailyDraft && !opponent) {
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

      {phase === "results" && isDailyDraft && dailySetup ? (
        <DailyDraftResults
          user={user}
          userLineup={userLineup}
          dailyDateKey={dailyDateKey}
          dailyGoal={dailySetup.goal}
          benchmarkValues={dailyBenchmarkValues}
          onPlayAgain={resetToLanding}
        />
      ) : null}

      {phase === "results" && !isDailyDraft && opponent && matchId ? (
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
