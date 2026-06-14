import { useMemo, useState } from "react";
import { initialDrafters, players } from "./data/players";
import { LineupBuilder } from "./components/LineupBuilder";
import { LineupStoryCard } from "./components/LineupStoryCard";
import { ScoreBoard } from "./components/ScoreBoard";
import { TournamentBracket } from "./components/TournamentBracket";
import {
  autofillFromBoard,
  generateDraftBoard,
  type SlotGrant,
} from "./lib/draft";
import { calculateLineupScore, getPlayersById } from "./lib/scoring";
import { resolveRoster } from "./lib/stats";
import { buildTournament } from "./lib/tournament";
import type { Drafter } from "./lib/types";

const resolvedPlayers = resolveRoster(players);
const EMPTY_LINEUP = ["", "", "", "", ""];

interface DraftState {
  drafters: Drafter[];
  boards: Record<string, SlotGrant[]>;
}

// Give every drafter a freshly randomized board and an auto-drafted lineup that
// conforms to it, so the bracket starts fully populated.
function buildInitialDraft(): DraftState {
  const boards: Record<string, SlotGrant[]> = {};
  const drafters = initialDrafters.map((drafter) => {
    const board = generateDraftBoard();
    boards[drafter.id] = board;
    return { ...drafter, lineup: autofillFromBoard(board, resolvedPlayers) };
  });

  return { drafters, boards };
}

function App() {
  const [draft, setDraft] = useState<DraftState>(buildInitialDraft);
  const { drafters, boards } = draft;
  const [activeDrafterId, setActiveDrafterId] = useState(initialDrafters[0].id);
  const [activeMatchupId, setActiveMatchupId] = useState("0-0");
  const [shareStatus, setShareStatus] = useState("");

  const activeBoard = boards[activeDrafterId] ?? [];

  const draftersById = useMemo(
    () => new Map(drafters.map((drafter) => [drafter.id, drafter])),
    [drafters],
  );
  const rounds = useMemo(
    () => buildTournament(drafters, resolvedPlayers),
    [drafters, resolvedPlayers],
  );
  const matchups = rounds.flat();
  const activeMatchup = matchups.find(
    (matchup) => matchup.id === activeMatchupId,
  ) ?? matchups[0];
  const activeDrafter = draftersById.get(activeDrafterId) ?? drafters[0];
  const activeLineup = getPlayersById(activeDrafter.lineup, resolvedPlayers);
  const activeScore = calculateLineupScore(activeLineup);

  const currentDrafterA = activeMatchup
    ? draftersById.get(activeMatchup.drafterA)
    : undefined;
  const currentDrafterB = activeMatchup
    ? draftersById.get(activeMatchup.drafterB)
    : undefined;

  const updatePick = (slot: number, playerId: string) => {
    setShareStatus("");
    setDraft((current) => ({
      ...current,
      drafters: current.drafters.map((drafter) => {
        if (drafter.id !== activeDrafterId) {
          return drafter;
        }

        const nextLineup = [...drafter.lineup];
        while (nextLineup.length < EMPTY_LINEUP.length) {
          nextLineup.push("");
        }
        nextLineup[slot] = playerId;
        return { ...drafter, lineup: nextLineup };
      }),
    }));
  };

  const autoDraft = () => {
    setShareStatus("");
    setDraft((current) => ({
      ...current,
      drafters: current.drafters.map((drafter) =>
        drafter.id === activeDrafterId
          ? {
              ...drafter,
              lineup: autofillFromBoard(
                current.boards[drafter.id] ?? [],
                resolvedPlayers,
              ),
            }
          : drafter,
      ),
    }));
  };

  const shuffleBoard = () => {
    setShareStatus("");
    setDraft((current) => ({
      boards: {
        ...current.boards,
        [activeDrafterId]: generateDraftBoard(),
      },
      drafters: current.drafters.map((drafter) =>
        drafter.id === activeDrafterId
          ? { ...drafter, lineup: [...EMPTY_LINEUP] }
          : drafter,
      ),
    }));
  };

  const shareLineup = async () => {
    const lineupNames = activeLineup.map((player) => player.name).join(", ");
    const text = `${activeDrafter.name} from ${activeDrafter.city} drafted ${lineupNames}. Lineup score: ${activeScore.total}. #NBAHeadToHead`;

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
            Eight players from around the world build NBA lineups, face one
            opponent at a time, and advance only when their five-man unit scores
            higher across production, efficiency, defense, shooting, and fit.
          </p>
          <div className="hero-actions">
            <a href="#draft">Start drafting</a>
            <a href="#bracket" className="ghost-link">
              View bracket
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
          players={resolvedPlayers}
          board={activeBoard}
          activeDrafterId={activeDrafter.id}
          onActiveDrafterChange={(drafterId) => {
            setShareStatus("");
            setActiveDrafterId(drafterId);
          }}
          onPick={updatePick}
          onAutoDraft={autoDraft}
          onShuffleBoard={shuffleBoard}
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
    </main>
  );
}

export default App;
