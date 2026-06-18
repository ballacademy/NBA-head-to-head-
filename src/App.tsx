import { useCallback, useEffect, useMemo, useState } from "react";
import { players, statsFile } from "./data/players";
import { DailyDraftResults } from "./components/DailyDraftResults";
import { DraftRoom } from "./components/DraftRoom";
import { LandingPage } from "./components/LandingPage";
import { LeaderboardPage } from "./components/LeaderboardPage";
import { AchievementsPage } from "./components/AchievementsPage";
import { MatchResults } from "./components/MatchResults";
import { PlayerStatsTable } from "./components/PlayerStatsTable";
import { WaitingRoom } from "./components/WaitingRoom";
import { getActivePlayerPool, getPlayersByIdFromActivePool } from "./lib/activePlayerPool";
import { generateFeasibleDraftSlots, pickBestForSlot } from "./lib/draft";
import {
  getDailyChallenge,
  getDailyDateKey,
  getDailyDraftSetup,
} from "./lib/dailyDraft";
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
import { loadPlayerRecord } from "./lib/playerRecord";
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
  const [playerRecord, setPlayerRecord] = useState(loadPlayerRecord);
  const [collection, setCollection] = useState<PlayerCollection>(() =>
    ensurePlayerCollection(),
  );

  const [opponentCollection, setOpponentCollection] = useState<PlayerCollection | null>(
    null,
  );

  const activePlayers = useMemo(
    () => getActivePlayerPool(playerRecord, { allTimeMode }),
    [allTimeMode, playerRecord],
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

  const dailySetup = useMemo(
    () =>
      isDailyDraft
        ? getDailyDraftSetup(getDraftablePlayers(activePlayers, collection), dailyDateKey)
        : null,
    [activePlayers, collection, dailyDateKey, isDailyDraft],
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

  const userLineup = getPlayersByIdFromActivePool(user?.lineup ?? [], playerRecord, {
    allTimeMode,
  });
  const opponentLineup = getPlayersByIdFromActivePool(
    opponent?.lineup ?? [],
    playerRecord,
    { allTimeMode },
  );
  const userDraftComplete = draftStep >= 5;

  const startMatch = (team: TeamProfile, options: StartDraftOptions = {}) => {
    const daily = Boolean(options.isDailyDraft);
    const salaryCapMode = Boolean(options.salaryCapMode);
    const nextAllTimeMode = Boolean(options.allTimeMode);
    const dateKey = getDailyDateKey();
    const record = loadPlayerRecord();
    const pool = getActivePlayerPool(record, { allTimeMode: nextAllTimeMode });
    const userPool = getDraftablePlayers(pool, collection);
    const nextOpponentCollection = daily ? null : createOpponentCollection(collection);
    const opponentPool = nextOpponentCollection
      ? getDraftablePlayers(pool, nextOpponentCollection)
      : pool;
    const setup = daily ? getDailyDraftSetup(userPool, dateKey) : null;
    const userSlots = setup?.slots ?? generateFeasibleDraftSlots(userPool);
    const opponentSlots = daily ? null : createOpponentDraftSlots(opponentPool);

    saveTeamProfile(team);
    setPlayerRecord(record);
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
  };

  const resetToLanding = () => {
    if (!isDailyDraft && collection.pendingUnlock) {
      return;
    }

    setUser(null);
    setOpponent(null);
    setOpponentCollection(null);
    setDraftStep(0);
    setOpponentPickCount(0);
    setOpponentComplete(false);
    setMatchId(null);
    setIsDailyDraft(false);
    setAllTimeMode(false);
    setPlayerRecord(loadPlayerRecord());
    setPhase("landing");
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

    let cancelled = false;

    const simulateOpponentDraft = async () => {
      const pickedIds = new Set<string>();
      const lineup: string[] = [];

      for (let index = 0; index < opponent.draftSlots.length; index += 1) {
        const slot = opponent.draftSlots[index]!;
        await sleep(getOpponentPickDelayMs());
        if (cancelled) {
          return;
        }

        const salaryOptions = getSalaryCapDraftOptions(
          lineup,
          opponentDraftablePlayers,
          index,
          opponent.draftSlots.length,
          Boolean(opponent.salaryCapMode),
        );
        const selection = pickBestForSlot(
          opponentDraftablePlayers,
          slot,
          pickedIds,
          salaryOptions,
        );
        if (selection) {
          pickedIds.add(selection);
          lineup.push(selection);
        }

        setOpponentPickCount(lineup.length);
        setOpponent((current) =>
          current
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
  }, [isDailyDraft, opponent, opponentDraftablePlayers]);

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
      <main>
        <section className="panel stats-intro">
          <button type="button" className="secondary-button" onClick={resetToLanding}>
            Back to home
          </button>
        </section>
        <PlayerStatsTable
          players={activePlayers}
          statsFile={statsFile}
          collection={collection}
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
          playerRecord={playerRecord}
          onStartDraft={startMatch}
          onViewStats={() => setPhase("stats")}
          onViewAchievements={() => setPhase("achievements")}
          onViewLeaderboard={() => setPhase("leaderboard")}
        />
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (!isDailyDraft && !opponent) {
    return null;
  }

  return (
    <main className={phase === "drafting" ? "draft-layout-shell" : undefined}>
      {phase === "drafting" && !userDraftComplete ? (
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
      ) : null}

      {phase === "waiting" && opponent ? (
        <WaitingRoom
          opponentPickCount={opponentPickCount}
          totalPicks={opponent.draftSlots.length}
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
          onPlayAgain={resetToLanding}
        />
      ) : null}
    </main>
  );
}

export default App;
