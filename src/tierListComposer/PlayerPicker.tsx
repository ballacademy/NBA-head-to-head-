import { useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import type { Conference } from "../standingsComposer/teams";
import {
  searchPlayers,
  type PlayerConferenceFilter,
  type TierPlayer,
} from "./nbaActivePlayers";

interface PlayerPickerProps {
  heading: string;
  hint?: string;
  currentId?: string | null;
  usedLabels: Record<string, string>;
  clearLabel?: string;
  onPick: (playerId: string) => void;
  onClear?: () => void;
  onClose: () => void;
}

export function PlayerPicker({
  heading,
  hint = "Search a player, then click to add them to this tier.",
  currentId = null,
  usedLabels,
  clearLabel = "Clear slot",
  onPick,
  onClear,
  onClose,
}: PlayerPickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlayerConferenceFilter>("all");
  const filled = Boolean(currentId);

  useDialogA11y({
    open: true,
    onClose,
    containerRef: dialogRef,
    lockScroll: true,
  });

  const players = useMemo(
    () => searchPlayers(query, filter),
    [query, filter],
  );

  return (
    <div
      className="sc-picker-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="sc-picker sc-picker--players"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sc-picker-title"
      >
        <div className="sc-picker__top">
          <div>
            <h2 id="sc-picker-title">{heading}</h2>
            <p>{hint}</p>
          </div>
          <button type="button" className="sc-picker__close" onClick={onClose}>
            Close
          </button>
        </div>
        <label className="sc-picker__search">
          Search
          <input
            type="search"
            value={query}
            placeholder="Name or team (LAL, Curry…)"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="sc-picker__filters" role="tablist" aria-label="Conference">
          {(["all", "East", "West"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={filter === value ? "sc-chip is-on" : "sc-chip"}
              onClick={() => setFilter(value as "all" | Conference)}
            >
              {value === "all" ? "All" : value}
            </button>
          ))}
        </div>
        <div className="sc-picker__grid">
          {players.map((player) => (
            <PlayerButton
              key={player.id}
              player={player}
              currentId={currentId}
              usedLabel={usedLabels[player.id]}
              onPick={onPick}
            />
          ))}
        </div>
        <div className="sc-picker__footer">
          <p className="sc-picker__count">{players.length} players</p>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => onClear?.()}
            disabled={!filled || !onClear}
          >
            {clearLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerButton({
  player,
  currentId,
  usedLabel,
  onPick,
}: {
  player: TierPlayer;
  currentId: string | null;
  usedLabel?: string;
  onPick: (playerId: string) => void;
}) {
  const isCurrent = currentId === player.id;
  const isUsed = Boolean(usedLabel) && !isCurrent;

  return (
    <button
      type="button"
      className={[
        "sc-team",
        isUsed ? "is-used" : "",
        isCurrent ? "is-current" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onPick(player.id)}
    >
      <img
        src={player.headshotUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <span>
        <span className="sc-team__name">{player.name}</span>
        <span className="sc-team__meta">
          {isCurrent ? "This slot" : isUsed ? usedLabel : player.team}
        </span>
      </span>
    </button>
  );
}
