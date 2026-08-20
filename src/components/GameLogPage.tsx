import { useMemo } from "react";
import {
  formatMatchGameLogModeLabel,
  formatMatchGameLogResultLabel,
  formatMatchGameLogScoreLine,
  formatMatchGameLogWhen,
  loadMatchGameLog,
  type MatchGameLogEntry,
} from "../lib/matchGameLog";
import { formatRatingDelta } from "../lib/rankedElo";
import { HubPageChrome } from "./HubPageChrome";

interface GameLogPageProps {
  onBack: () => void;
}

const formatKindLabel = (entry: MatchGameLogEntry) =>
  entry.kind === "queued" ? "Queued result" : "Live match";

function GameLogRow({ entry }: { entry: MatchGameLogEntry }) {
  const margin = Math.abs(entry.ownerScore - entry.opponentScore).toFixed(1);

  return (
    <li>
      <article
        className={`game-log__row game-log__row--${entry.result}`}
        aria-label={`${formatMatchGameLogResultLabel(entry.result)} vs ${entry.opponentName}`}
      >
        <div className="game-log__row-head">
          <span className="game-log__outcome">
            {formatMatchGameLogResultLabel(entry.result)}
          </span>
          <span className="game-log__when">{formatMatchGameLogWhen(entry.recordedAt)}</span>
        </div>
        <p className="game-log__opponent">{entry.opponentName}</p>
        <p className="game-log__meta">
          {formatKindLabel(entry)} · {formatMatchGameLogModeLabel(entry.mode)} ·{" "}
          {formatMatchGameLogScoreLine(entry)} · margin {margin}
          {entry.bannerDelta != null
            ? ` · ${formatRatingDelta(entry.bannerDelta)}`
            : ""}
          {entry.kind === "queued" ? " · streak unchanged" : ""}
        </p>
      </article>
    </li>
  );
}

export function GameLogPage({ onBack }: GameLogPageProps) {
  const entries = useMemo(() => loadMatchGameLog(), []);
  const liveCount = entries.filter((entry) => entry.kind === "live").length;
  const queuedCount = entries.filter((entry) => entry.kind === "queued").length;

  return (
    <HubPageChrome
      className="game-log-page"
      title="Game log"
      lede={
        entries.length > 0
          ? `${entries.length} recent · ${liveCount} live · ${queuedCount} queued · this device`
          : "Recent competitive matches on this device (clears on logout)"
      }
      onBack={onBack}
      backLabel="Head to Head"
    >
      {entries.length === 0 ? (
        <section className="hub-feature__panel game-log__empty">
          <p className="eyebrow">No games yet</p>
          <p>
            Live Casual, Pro, Event, and All-Time matches show up here after you
            finish them. Queued lineup results appear when someone drafts against
            your saved five while you&apos;re away.
          </p>
        </section>
      ) : (
        <ul className="game-log__list">
          {entries.map((entry) => (
            <GameLogRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </HubPageChrome>
  );
}
