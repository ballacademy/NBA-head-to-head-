import { useMemo, useState } from "react";
import { initialDrafters, players, statsFile } from "./data/players";
import { LineupBuilder } from "./components/LineupBuilder";
import { LineupStoryCard } from "./components/LineupStoryCard";
import { PlayerStatsTable } from "./components/PlayerStatsTable";
import { ScoreBoard } from "./components/ScoreBoard";
import { TournamentBracket } from "./components/TournamentBracket";
import { autoDraftLineup, generateDraftSlots } from "./lib/draft";
import { calculateLineupScore, getPlayersById } from "./lib/scoring";
import { buildTournament } from "./lib/tournament";
import type { Drafter } from "./lib/types";

function App() {
  const [drafters, setDrafters] = useState<Drafter[]>(initialDrafters);
  const [activeDrafterId, setActiveDrafterId] = useState(initialDrafters[0].id);
  const [activeMatchupId, setActiveMatchupId] = useState("0-0");
  const [shareStatus, setShareStatus] = useState("");
  const [draftSteps, setDraftSteps] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialDrafters.map((drafter) => [drafter.id, 0])),
  );

  const draftersById = useMemo(
    () => new Map(drafters.map((drafter) => [drafter.id, drafter])),
    [drafters],
  );
  const rounds = useMemo(() => buildTournament(drafters, players), [drafters]);
  const matchups = rounds.flat();
  const activeMatchup = matchups.find(
    (matchup) => matchup.id === activeMatchupId,
  ) ?? matchups[0];
  const activeDrafter = draftersById.get(activeDrafterId) ?? drafters[0];
  const activeLineup = getPlayersById(activeDrafter.lineup, players);
  const activeScore = calculateLineupScore(activeLineup);
  const activeStep = draftSteps[activeDrafter.id] ?? 0;

  const currentDrafterA = activeMatchup
    ? draftersById.get(activeMatchup.drafterA)
    : undefined;
  const currentDrafterB = activeMatchup
    ? draftersById.get(activeMatchup.drafterB)
    : undefined;

  const updateDrafter = (drafterId: string, updater: (drafter: Drafter) => Drafter) => {
    setDrafters((current) =>
      current.map((drafter) =>
        drafter.id === drafterId ? updater(drafter) : drafter,
      ),
    );
  };

  const updatePick = (slot: number, playerId: string) => {
    setShareStatus("");
    updateDrafter(activeDrafterId, (drafter) => {
      const nextLineup = [...drafter.lineup];
      nextLineup[slot] = playerId;

      return {
        ...drafter,
        lineup: nextLineup.slice(0, slot + 1),
      };
    });

    setDraftSteps((current) => ({
      ...current,
      [activeDrafterId]: Math.min(slot + 1, 4),
    }));
  };

  const autoDraft = () => {
    setShareStatus("");
    updateDrafter(activeDrafterId, (drafter) => ({
      ...drafter,
      lineup: autoDraftLineup(players, drafter.draftSlots),
    }));
    setDraftSteps((current) => ({
      ...current,
      [activeDrafterId]: 4,
    }));
  };

  const startNewDraft = () => {
    setShareStatus("");
    const draftSlots = generateDraftSlots();
    updateDrafter(activeDrafterId, (drafter) => ({
      ...drafter,
      draftSlots,
      lineup: [],
    }));
    setDraftSteps((current) => ({
      ...current,
      [activeDrafterId]: 0,
    }));
  };

  const shareLineup = async () => {
    const lineupNames = activeLineup.map((player) => player.name).join(", ");
    const text = `${activeDrafter.name} from ${activeDrafter.city} drafted ${lineupNames}. Lineup score: ${activeScore.total}. ${activeScore.projectedRecord.formatted}. #NBAHeadToHead`;

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

  const champion = rounds.at(-1)?.[0]?.winnerId
    ? draftersById.get(rounds.at(-1)?.[0]?.winnerId ?? "")
    : undefined;

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">NBA Head-to-Head</p>
          <h1>Draft five. Win the matchup. Survive the bracket.</h1>
          <p>
            Eight players from around the world build NBA lineups through a
            five-step draft. Each pick is tied to a random position and division
            before you choose your player.
          </p>
          <div className="hero-actions">
            <a href="#draft">Start drafting</a>
            <a href="#bracket" className="ghost-link">
              View bracket
            </a>
            <a href="#stats" className="ghost-link">
              View stats
            </a>
          </div>
        </div>

        <div className="hero-card">
          <span>Current champion</span>
          <strong>{champion?.name ?? "TBD"}</strong>
          <p>{champion?.city ?? "Complete the bracket"}</p>
        </div>
      </section>

      <div className="layout-grid" id="draft">
        <LineupBuilder
          drafters={drafters}
          players={players}
          activeDrafterId={activeDrafter.id}
          activeStep={activeStep}
          onActiveDrafterChange={(drafterId) => {
            setShareStatus("");
            setActiveDrafterId(drafterId);
          }}
          onPick={updatePick}
          onAutoDraft={autoDraft}
          onNewDraft={startNewDraft}
          onStepChange={(step) =>
            setDraftSteps((current) => ({
              ...current,
              [activeDrafterId]: step,
            }))
          }
        />

        <LineupStoryCard
          drafter={activeDrafter}
          lineup={activeLineup}
          score={activeScore}
          onShare={shareLineup}
        />
      </div>

      {shareStatus ? <p className="toast">{shareStatus}</p> : null}

      {activeMatchup && currentDrafterA && currentDrafterB ? (
        <ScoreBoard
          drafterA={currentDrafterA}
          drafterB={currentDrafterB}
          scoreA={activeMatchup.scoreA}
          scoreB={activeMatchup.scoreB}
        />
      ) : null}

      <div id="bracket">
        <TournamentBracket
          rounds={rounds}
          draftersById={draftersById}
          activeMatchupId={activeMatchup?.id ?? ""}
          onSelectMatchup={setActiveMatchupId}
        />
      </div>

      <div id="stats">
        <PlayerStatsTable players={players} statsFile={statsFile} />
      </div>
    </main>
  );
}

export default App;
