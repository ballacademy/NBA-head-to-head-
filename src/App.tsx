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
import { generateFeasibleDraftSlots, pickBestForSlot, validateDraftSlotsFeasible } from "./lib/draft";
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
import { loadAllModeRecords, loadPlayerRecord } from "./lib/playerRecord";
import { getSalaryCapDraftOptions } from "./lib/salaryCapDraft";
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
    () => getDraftablePlayers(activePlayers, collection),
    [activePlayers, collection],
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
      draftablePlayers,
      dailySetup.slots,
      dailySetup.goal,
      dailyDateKey,
    );
  }, [dailyDateKey, dailySetup, draftablePlayers]);

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

    const daily = Boolean(options.isDailyDraft);
    const salaryCapMode = Boolean(options.salaryCapMode);
    const nextAllTimeMode = Boolean(options.allTimeMode);
    const dateKey = getDailyDateKey();
    const pool = getActivePlayerPool(loadPlayerRecord("allTime"), { allTimeMode: nextAllTimeMode });
    const userPool = getDraftablePlayers(pool, collection);
    const nextOpponentCollection = daily ? null : createOpponentCollection(collection);
    const opponentPool = nextOpponentCollection
      ? getDraftablePlayers(pool, nextOpponentCollection)
      : pool;
    const setup = daily ? getDailyDraftSetup(dateKey) : null;
    const userSlots = setup?.slots ?? generateFeasibleDraftSlots(userPool);
    const opponentSlots = daily ? null : createOpponentDraftSlots(opponentPool);

    if (
      userSlots.length === 0 ||
      !validateDraftSlotsFeasible(userPool, userSlots) ||
      (!daily &&
        (!opponentSlots ||
          opponentSlots.length === 0 ||
          !validateDraftSlotsFeasible(opponentPool, opponentSlots)))
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
        ? {
            ...createRandomOpponent(opponentSlots),
            salaryCapMode,
            allTimeMode: nextAllTimeMode,
          }
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
    if (
      !startMatch(team, {
        salaryCapMode: Boolean(user.salaryCapMode),
        allTimeMode: Boolean(user.allTimeMode),
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
          Boolean(current.salaryCapMode),
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

        const nextLineup = [...current.lineup];
        nextLineup[slot] = bestPick;

        return {
          ...current,
          lineup: nextLineup.slice(0, slot + 1),
        };
      });

      setDraftStep((current) => Math.min(Math.max(current, slot) + 1, 5));
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

    const { id: opponentId, draftSlots, salaryCapMode } = opponent;

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
          Boolean(salaryCapMode),
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

      if (!cancelled) {
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
