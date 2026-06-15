import { useCallback, useEffect, useState } from "react";
import { players, statsFile } from "./data/players";
import { DraftRoom } from "./components/DraftRoom";
import { LandingPage } from "./components/LandingPage";
import { LineupStoryCard } from "./components/LineupStoryCard";
import { MatchResults } from "./components/MatchResults";
import { PlayerStatsTable } from "./components/PlayerStatsTable";
import { WaitingRoom } from "./components/WaitingRoom";
import { pickBestForSlot } from "./lib/draft";
import {
  createRandomOpponent,
  createUserDrafter,
  getOpponentPickDelayMs,
  sleep,
} from "./lib/match";
import { calculateLineupScore, getPlayersById } from "./lib/scoring";
import type { Drafter } from "./lib/types";

type AppPhase = "landing" | "drafting" | "waiting" | "results" | "stats";

function App() {
  const [phase, setPhase] = useState<AppPhase>("landing");
  const [user, setUser] = useState<Drafter | null>(null);
  const [opponent, setOpponent] = useState<Drafter | null>(null);
  const [draftStep, setDraftStep] = useState(0);
  const [opponentPickCount, setOpponentPickCount] = useState(0);
  const [opponentComplete, setOpponentComplete] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  const userLineup = getPlayersById(user?.lineup ?? [], players);
  const opponentLineup = getPlayersById(opponent?.lineup ?? [], players);
  const userScore = calculateLineupScore(userLineup);
  const userDraftComplete = draftStep >= 5;

  const startMatch = () => {
    setShareStatus("");
    setUser(createUserDrafter());
    setOpponent(createRandomOpponent());
    setDraftStep(0);
    setOpponentPickCount(0);
    setOpponentComplete(false);
    setPhase("drafting");
  };

  const resetToLanding = () => {
    setShareStatus("");
    setUser(null);
    setOpponent(null);
    setDraftStep(0);
    setOpponentPickCount(0);
    setOpponentComplete(false);
    setPhase("landing");
  };

  const handlePick = useCallback((slot: number, playerId: string) => {
    setUser((current) => {
      if (!current) {
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

  const handleTimeout = useCallback((slot: number) => {
    setUser((current) => {
      if (!current || current.lineup[slot]) {
        return current;
      }

      const pickedIds = new Set(current.lineup);
      const slotConstraint = current.draftSlots[slot];
      const bestPick = pickBestForSlot(players, slotConstraint, pickedIds);

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
  }, []);

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

        const selection = pickBestForSlot(players, slot, pickedIds);
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
  }, [opponent?.id]);

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

  const shareLineup = async () => {
    if (!user) {
      return;
    }

    const lineupNames = userLineup.map((player) => player.name).join(", ");
    const text = `I drafted ${lineupNames}. Lineup score: ${userScore.total}. ${userScore.projectedRecord.formatted}. #NBAHeadToHead`;

    if (navigator.share) {
      await navigator.share({
        title: "NBA Head-to-Head lineup",
        text,
        url: window.location.href,
      });
      setShareStatus("Share sheet opened.");
      return;
    }

    await navigator.clipboard.writeText(`${text} ${window.location.href}`);
    setShareStatus("Lineup copied for social sharing.");
  };

  if (phase === "stats") {
    return (
      <main>
        <section className="panel stats-intro">
          <button type="button" className="secondary-button" onClick={resetToLanding}>
            Back to home
          </button>
        </section>
        <PlayerStatsTable players={players} statsFile={statsFile} />
      </main>
    );
  }

  if (phase === "landing") {
    return (
      <main className="landing-layout">
        <LandingPage
          onStartDraft={startMatch}
          onViewStats={() => setPhase("stats")}
        />
      </main>
    );
  }

  if (!user || !opponent) {
    return null;
  }

  return (
    <main>
      {phase === "drafting" && !userDraftComplete ? (
        <div className="layout-grid">
          <DraftRoom
            drafter={user}
            players={players}
            activeStep={draftStep}
            onPick={handlePick}
            onTimeout={handleTimeout}
          />
          <LineupStoryCard
            drafter={user}
            lineup={userLineup}
            score={userScore}
            onShare={shareLineup}
          />
        </div>
      ) : null}

      {phase === "waiting" ? (
        <WaitingRoom opponent={opponent} opponentPickCount={opponentPickCount} />
      ) : null}

      {phase === "results" ? (
        <MatchResults
          user={user}
          opponent={opponent}
          userLineup={userLineup}
          opponentLineup={opponentLineup}
          onPlayAgain={resetToLanding}
        />
      ) : null}

      {shareStatus ? <p className="toast">{shareStatus}</p> : null}
    </main>
  );
}

export default App;
