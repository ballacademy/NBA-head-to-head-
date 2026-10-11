import { useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { NBA_TEAMS, type Conference, type NbaTeam } from "./teams";

type Filter = "all" | Conference;

interface TeamPickerProps {
  heading: string;
  hint?: string;
  currentId?: string | null;
  usedLabels: Record<string, string>;
  clearLabel?: string;
  onPick: (teamId: string) => void;
  onClear?: () => void;
  onClose: () => void;
}

export function TeamPicker({
  heading,
  hint = "Click a club to fill this slot. Used teams move here.",
  currentId = null,
  usedLabels,
  clearLabel = "Clear slot",
  onPick,
  onClear,
  onClose,
}: TeamPickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const filled = Boolean(currentId);

  useDialogA11y({
    open: true,
    onClose,
    containerRef: dialogRef,
    lockScroll: true,
  });

  const teams = useMemo(() => {
    const list =
      filter === "all"
        ? NBA_TEAMS
        : NBA_TEAMS.filter((team) => team.conference === filter);
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [filter]);

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
        className="sc-picker"
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
        <div className="sc-picker__filters" role="tablist" aria-label="Conference">
          {(["all", "East", "West"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={filter === value ? "sc-chip is-on" : "sc-chip"}
              onClick={() => setFilter(value)}
            >
              {value === "all" ? "All 30" : value}
            </button>
          ))}
        </div>
        <div className="sc-picker__grid">
          {teams.map((team) => (
            <TeamButton
              key={team.id}
              team={team}
              currentId={currentId ?? null}
              usedLabel={usedLabels[team.id]}
              onPick={onPick}
            />
          ))}
        </div>
        <div className="sc-picker__footer">
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

function TeamButton({
  team,
  currentId,
  usedLabel,
  onPick,
}: {
  team: NbaTeam;
  currentId: string | null;
  usedLabel?: string;
  onPick: (teamId: string) => void;
}) {
  const isCurrent = currentId === team.id;
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
      onClick={() => onPick(team.id)}
    >
      <img src={team.logoSrc} alt="" />
      <span>
        <span className="sc-team__name">{team.name}</span>
        <span className="sc-team__meta">
          {isCurrent ? "This slot" : isUsed ? usedLabel : team.conference}
        </span>
      </span>
    </button>
  );
}
