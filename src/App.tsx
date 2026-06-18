import { useCallback, useEffect, useMemo, useState } from "react";
import { players, statsFile } from "./data/players";
import { DraftRoom } from "./components/DraftRoom";
import { LandingPage } from "./components/LandingPage";
import { LeaderboardPage } from "./components/LeaderboardPage";
import { MatchResults } from "./components/MatchResults";
import { PlayerStatsTable } from "./components/PlayerStatsTable";
import { WaitingRoom } from "./components/WaitingRoom";
import { pickBestForSlot } from "./lib/draft";
import {
  filterPlayersForDailyChallenge,
  getDailyChallenge,
  getDailyDateKey,
  getDailyDraftSetup,
} from "./lib/dailyDraft";
import {
  createRandomOpponent,
  createUserDrafter,
  getOpponentPickDelayMs,
  sleep,
  type StartDraftOptions,
} from "./lib/match";
import { getPlayersById } from "./lib/scoring";
import { ensurePlayerCollection, getDraftablePlayers, createOpponentCollection, type PlayerCollection } from "./lib/playerCollection";
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

  const draftablePlayers = useMemo(() => {
    const base = getDraftablePlayers(players, collection);

    if (!isDailyDraft) {
      return base;
    }

    return filterPlayersForDailyChallenge(base, dailyChallenge);
  }, [collection, dailyChallenge, isDailyDraft]);

  const opponentDraftablePlayers = useMemo(
    () =>
      opponentCollection
        ? getDraftablePlayers(players, opponentCollection)
        : players,
    [opponentCollection],
  );

  const userLineup = getPlayersById(user?.lineup ?? [], players);
  const opponentLineup = getPlayersById(opponent?.lineup ?? [], players);
  const userDraftComplete = draftStep >= 5;

  const startMatch = (team: TeamProfile, options: StartDraftOptions = {}) => {
    const daily = Boolean(options.isDailyDraft);
    const dateKey = getDailyDateKey();

    saveTeamProfile(team);
    setIsDailyDraft(daily);
    setDailyDateKey(dateKey);
    setUser(createUserDrafter(team, { isDailyDraft: daily }));
    setOpponent(createRandomOpponent());
    setOpponentCollection(createOpponentCollection(collection));
    setDraftStep(0);
    setOpponentPickCount(0);
    setOpponentComplete(false);
    setPhase("drafting");
  };

  const resetToLanding = () => {
    if (collection.pendingUnlock) {
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
    if (phase === "results" && !matchId) {
      setMatchId(
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `match-${Date.now()}`,
      );
    }
  }, [matchId, phase]);

  useEffect(() => {
    if (!opponent) {
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
  }, [opponent?.id, opponentDraftablePlayers]);

  useEffect(() => {
    if (!userDraftComplete || phase !== "drafting") {
      return;
    }

    setPhase(opponentComplete ? "results" : "waiting");
  }, [userDraftComplete, opponentComplete, phase]);

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

  if (!user || !opponent) {
    return null;
  }

  const dailySetup = isDailyDraft ? getDailyDraftSetup(dailyDateKey) : null;

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

      {phase === "waiting" ? (
        <WaitingRoom
          opponentPickCount={opponentPickCount}
          totalPicks={opponent.draftSlots.length}
        />
      ) : null}

      {phase === "results" && matchId ? (
        <MatchResults
          user={user}
          opponent={opponent}
          userLineup={userLineup}
          opponentLineup={opponentLineup}
          matchId={matchId}
          collection={collection}
          isDailyDraft={isDailyDraft}
          dailyDateKey={dailyDateKey}
          onCollectionChange={handleCollectionChange}
          onPlayAgain={resetToLanding}
        />
      ) : null}
    </main>
  );
}

export default App;
