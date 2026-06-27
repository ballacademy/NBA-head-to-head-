import { sortLineupByPosition } from "../lib/lineupOrder";
import { submitStoredLineup, type GhostMatchmakingMode } from "../lib/ghostMatchmaking";
import { getOrCreatePlayerIdentity } from "../lib/playerIdentity";
import { ensureClassicProfile } from "../lib/classicProfile";
import { ensureCurrentRankedSeason } from "../lib/rankedProfile";
import { PlayerStatLine } from "./PlayerStatLine";
import { matchModeThemeClass, getMatchModeTheme } from "../lib/matchModeTheme";
import type { Drafter, Player } from "../lib/types";

interface QueuedDraftResultsProps {
  user: Drafter;
  userLineup: Player[];
  onDone: () => void;
}

export function QueuedDraftResults({
  user,
  userLineup,
  onDone,
}: QueuedDraftResultsProps) {
  const orderedLineup = sortLineupByPosition(userLineup);
  const mode: GhostMatchmakingMode = user.salaryCapMode ? "ranked" : "classic";
  const playerId = getOrCreatePlayerIdentity().playerId;
  const elo = user.salaryCapMode
    ? ensureCurrentRankedSeason().elo
    : ensureClassicProfile().elo;

  void submitStoredLineup({
    mode,
    playerId,
    teamName: user.name,
    lineup: user.lineup.filter((id): id is string => Boolean(id)),
    elo,
  });

  return (
    <section
      className={`match-results daily-draft-results match-results--compact ${matchModeThemeClass(
        getMatchModeTheme(user),
      )}`}
    >
      <div className="panel panel--compact daily-draft-results__header">
        <p className="eyebrow">Lineup posted</p>
        <h2>Waiting for the next GM</h2>
        <p>
          No human lineups were in the pool yet, so your five is queued for the
          next drafter. Come back later or play again to face a real opponent.
        </p>
      </div>

      <section className="panel panel--compact daily-draft-results__lineup">
        <h3>{user.name}</h3>
        <div className="team-lineup-card__players">
          {orderedLineup.map((player, index) => (
            <PlayerStatLine key={player.id} player={player} pickNumber={index + 1} />
          ))}
        </div>
      </section>

      <div className="panel panel--compact daily-draft-results__footer queued-draft-results__footer">
        <button type="button" className="play-again-button" onClick={onDone}>
          Back to home
        </button>
      </div>
    </section>
  );
}
