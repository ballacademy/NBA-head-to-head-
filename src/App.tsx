import { useCallback, useEffect, useMemo, useState } from "react";
import { players, statsFile } from "./data/players";
import { DailyDraftResults } from "./components/DailyDraftResults";
import { DraftRoom } from "./components/DraftRoom";
import { LandingPage } from "./components/LandingPage";
import { LeaderboardPage } from "./components/LeaderboardPage";
import { MatchResults } from "./components/MatchResults";
import { PlayerStatsTable } from "./components/PlayerStatsTable";
import { WaitingRoom } from "./components/WaitingRoom";
import { generateFeasibleDraftSlots, pickBestForSlot } from "./lib/draft";
import {
  filterPlayersForDailyChallenge,
  getDailyChallenge,
  getDailyDateKey,
  getDailyDraftSetup,
} from "./lib/dailyDraft";
import { simulateDailyBenchmarkOvrs } from "./lib/dailyDraftScores";
import {
  createOpponentDraftSlots,
  createRandomOpponent,
  createUserDrafter,
  getOpponentPickDelayMs,
  sleep,
  type StartDraftOptions,
} from "./lib/match";
import { getPlayersById } from "./lib/scoring";
import {
  ensurePlayerCollection,
  getDraftablePlayers,
  createOpponentCollection,
  type PlayerCollection,
} from "./lib/playerCollection";
import { saveTeamProfile } from "./lib/teamProfile";
import type { TeamProfile } from "./lib/teamProfile";
import type { Drafter } from "./lib/types";

type AppPhase = "landing" | "drafting" | "waiting" | "results" | "stats" | "leaderboard";

function App() {
  const [phase, setPhase] = useState<AppPhase>("landing");
  const [user, setUser] = useState<Drafter | null>(null);
  const [opponent, setOpponent] = useState<Drafter | null>(null);
  const [draftStep, setDraftStep] = useState(0);
  const [opponentPickCount, setOpponentPickCount] = useState(0);
  const [opponentComplete, setOpponentComplete] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [isDailyDraft, setIsDailyDraft] = useState(false);
  const [dailyDateKey, setDailyDateKey] = useState(getDailyDateKey());
  const [collection, setCollection] = useState<PlayerCollection>(() =>
    ensurePlayerCollection(),
  );

  const [opponentCollection, setOpponentCollection] = useState<PlayerCollection | null>(
    null,
  );

  const dailyChallenge = useMemo(
    () => getDailyChallenge(dailyDateKey),
    [dailyDateKey],
  );

  const dailyEligiblePlayers = useMemo(
    () => filterPlayersForDailyChallenge(players, dailyChallenge),
    [dailyChallenge],
  );

  const draftablePlayers = useMemo(() => {
    if (isDailyDraft) {
      return dailyEligiblePlayers;
    }

    return getDraftablePlayers(players, collection);
  }, [collection, dailyEligiblePlayers, isDailyDraft]);

  const opponentDraftablePlayers = useMemo(
    () =>
      opponentCollection
        ? getDraftablePlayers(players, opponentCollection)
        : players,
    [opponentCollection],
  );

  const dailySetup = useMemo(
    () => (isDailyDraft ? getDailyDraftSetup(players, dailyDateKey) : null),
    [dailyDateKey, isDailyDraft],
  );

  const dailyBenchmarkOvrs = useMemo(() => {
    if (!dailySetup) {
      return [];
    }

    return simulateDailyBenchmarkOvrs(
      dailyEligiblePlayers,
      dailySetup.slots,
      dailyDateKey,
    );
  }, [dailyDateKey, dailyEligiblePlayers, dailySetup]);

  const userLineup = getPlayersById(user?.lineup ?? [], players);
  const opponentLineup = getPlayersById(opponent?.lineup ?? [], players);
  const userDraftComplete = draftStep >= 5;

  const startMatch = (team: TeamProfile, options: StartDraftOptions = {}) => {
    const daily = Boolean(options.isDailyDraft);
    const dateKey = getDailyDateKey();
    const userPool = daily
      ? filterPlayersForDailyChallenge(players, getDailyChallenge(dateKey))
      : getDraftablePlayers(players, collection);
    const nextOpponentCollection = daily ? null : createOpponentCollection(collection);
    const opponentPool = nextOpponentCollection
      ? getDraftablePlayers(players, nextOpponentCollection)
      : players;
    const setup = daily ? getDailyDraftSetup(players, dateKey) : null;
    const userSlots = setup?.slots ?? generateFeasibleDraftSlots(userPool);
    const opponentSlots = daily ? null : createOpponentDraftSlots(opponentPool);

    saveTeamProfile(team);
    setIsDailyDraft(daily);
    setDailyDateKey(dateKey);
    setUser(
      createUserDrafter(team, userSlots, {
        isDailyDraft: daily,
        dailyChallengeTitle: setup?.challenge.title,
      }),
    );
    setOpponent(opponentSlots ? createRandomOpponent(opponentSlots) : null);
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
        const bestPick = pickBestForSlot(
          draftablePlayers,
          slotConstraint,
          pickedIds,
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

      for (const slot of opponent.draftSlots) {
        await sleep(getOpponentPickDelayMs());
        if (cancelled) {
          return;
        }

        const selection = pickBestForSlot(opponentDraftablePlayers, slot, pickedIds);
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

  if (phase === "stats") {
    return (
      <main>
        <section className="panel stats-intro">
          <button type="button" className="secondary-button" onClick={resetToLanding}>
            Back to home
          </button>
        </section>
        <PlayerStatsTable
          players={players}
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
          onStartDraft={startMatch}
          onViewStats={() => setPhase("stats")}
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
          dailyChallenge={dailySetup.challenge}
          benchmarkOvrs={dailyBenchmarkOvrs}
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
