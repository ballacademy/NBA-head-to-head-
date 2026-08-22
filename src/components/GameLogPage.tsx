import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RefObject } from "react";
import { isShareDismissalError } from "../lib/appErrors";
import {
  buildMatchupShareCardInputsFromAttachment,
  formatCommunityMatchupDetails,
} from "../lib/communityShareables";
import { useDialogA11y } from "../hooks/useDialogA11y";
import {
  formatMatchGameLogModeLabel,
  formatMatchGameLogResultLabel,
  formatMatchGameLogScoreLine,
  formatMatchGameLogWhen,
  loadMatchGameLog,
  matchGameLogEntryHasMatchup,
  toCommunityMatchupAttachment,
  type MatchGameLogEntry,
} from "../lib/matchGameLog";
import {
  createMatchupShareCardBlob,
  saveMatchupShareCard,
} from "../lib/lineupShareCard";
import { databasePlayersById } from "../lib/playerPool";
import { trackProductEvent } from "../lib/productAnalytics";
import { formatRatingDelta } from "../lib/rankedElo";
import { HubPageChrome } from "./HubPageChrome";

interface GameLogPageProps {
  onBack: () => void;
}

const formatKindLabel = (entry: MatchGameLogEntry) =>
  entry.kind === "queued" ? "Queued result" : "Live match";

function GameLogMatchupViewer({
  entry,
  onClose,
}: {
  entry: MatchGameLogEntry;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [shareBusy, setShareBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attachment = useMemo(
    () => toCommunityMatchupAttachment(entry),
    [entry],
  );
  const details = attachment
    ? formatCommunityMatchupDetails(attachment)
    : null;

  useDialogA11y({
    onClose,
    initialFocusRef: closeRef,
    containerRef: panelRef as RefObject<HTMLElement | null>,
    lockScroll: true,
  });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      if (!attachment) {
        setError("This match doesn’t have a saved lineup snapshot.");
        setBusy(false);
        return;
      }

      setBusy(true);
      setError(null);
      try {
        const inputs = buildMatchupShareCardInputsFromAttachment(
          attachment,
          databasePlayersById,
        );
        if (!inputs) {
          if (!cancelled) {
            setError("Could not rebuild that matchup image.");
            setBusy(false);
          }
          return;
        }
        const blob = await createMatchupShareCardBlob(inputs);
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setError("Could not open that matchup image.");
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [attachment]);

  const handleShare = async () => {
    if (!attachment || shareBusy) {
      return;
    }
    setShareBusy(true);
    try {
      const inputs = buildMatchupShareCardInputsFromAttachment(
        attachment,
        databasePlayersById,
      );
      if (!inputs) {
        throw new Error("Could not rebuild matchup image.");
      }
      await saveMatchupShareCard(inputs);
      trackProductEvent("share_matchup", { surface: "game_log" });
    } catch (shareError) {
      if (!isShareDismissalError(shareError)) {
        setError("Share failed — try again.");
      }
    } finally {
      setShareBusy(false);
    }
  };

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="unlock-modal unlock-modal--compact game-log-matchup-viewer"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="unlock-modal__panel panel unlock-modal__panel--compact game-log-matchup-viewer__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Game log matchup</p>
        <h2 id={titleId}>{details?.headline ?? "Matchup"}</h2>
        {details ? (
          <p className="unlock-modal__copy">
            {details.score}
            {details.record ? ` · ${details.record}` : ""}
          </p>
        ) : null}

        {busy ? (
          <p className="game-log-matchup-viewer__status" role="status">
            Building matchup image…
          </p>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        {imageUrl ? (
          <img
            className="game-log-matchup-viewer__image"
            src={imageUrl}
            alt={`Matchup card for ${entry.opponentName}`}
          />
        ) : null}

        <div className="game-log-matchup-viewer__actions">
          <button
            type="button"
            className="landing__primary-button"
            disabled={!attachment || shareBusy || busy}
            onClick={() => void handleShare()}
          >
            {shareBusy ? "Sharing…" : "Share matchup"}
          </button>
          <button
            ref={closeRef}
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function GameLogRow({
  entry,
  onViewMatchup,
}: {
  entry: MatchGameLogEntry;
  onViewMatchup: (entry: MatchGameLogEntry) => void;
}) {
  const margin = Math.abs(entry.ownerScore - entry.opponentScore).toFixed(1);
  const canViewMatchup = matchGameLogEntryHasMatchup(entry);

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
          <span className="game-log__when">
            {formatMatchGameLogWhen(entry.recordedAt)}
          </span>
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
        {canViewMatchup ? (
          <div className="game-log__row-actions">
            <button
              type="button"
              className="secondary-button game-log__matchup-button"
              onClick={() => onViewMatchup(entry)}
            >
              View matchup
            </button>
          </div>
        ) : null}
      </article>
    </li>
  );
}

export function GameLogPage({ onBack }: GameLogPageProps) {
  const entries = useMemo(() => loadMatchGameLog(), []);
  const [viewingEntry, setViewingEntry] = useState<MatchGameLogEntry | null>(
    null,
  );
  const liveCount = entries.filter((entry) => entry.kind === "live").length;
  const queuedCount = entries.filter((entry) => entry.kind === "queued").length;
  const matchupCount = entries.filter(matchGameLogEntryHasMatchup).length;

  const handleViewMatchup = useCallback((entry: MatchGameLogEntry) => {
    setViewingEntry(entry);
  }, []);

  return (
    <HubPageChrome
      className="game-log-page"
      title="Game log"
      lede={
        entries.length > 0
          ? `${entries.length} recent · ${liveCount} live · ${queuedCount} queued${
              matchupCount > 0 ? ` · ${matchupCount} with matchup cards` : ""
            } · this device`
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
            your saved five while you&apos;re away. Newer live matches keep a
            matchup card you can view and share.
          </p>
        </section>
      ) : (
        <ul className="game-log__list">
          {entries.map((entry) => (
            <GameLogRow
              key={entry.id}
              entry={entry}
              onViewMatchup={handleViewMatchup}
            />
          ))}
        </ul>
      )}

      {viewingEntry ? (
        <GameLogMatchupViewer
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
        />
      ) : null}
    </HubPageChrome>
  );
}
