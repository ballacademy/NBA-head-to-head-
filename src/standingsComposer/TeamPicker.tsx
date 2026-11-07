import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { pickerHighlightIndex } from "../instagramComposer/pickerKeyboard";
import { useDialogA11y } from "../hooks/useDialogA11y";
import { closeComposerScrim } from "../instagramComposer/closeComposerScrim";
import { usedChipLabel } from "../instagramComposer/pickerUsed";
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
  hint = "Pick a club to fill this slot. Used teams stay marked.",
  currentId = null,
  usedLabels,
  clearLabel = "Clear slot",
  onPick,
  onClear,
  onClose,
}: TeamPickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const filled = Boolean(currentId);

  useDialogA11y({
    open: true,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: dialogRef,
    lockScroll: true,
  });

  const teams = useMemo(() => {
    const list =
      filter === "all"
        ? NBA_TEAMS
        : NBA_TEAMS.filter((team) => team.conference === filter);
    const token = query.trim().toLowerCase();
    const matched = token
      ? list.filter((team) => {
          const hay =
            `${team.name} ${team.id} ${team.shortName} ${team.conference}`.toLowerCase();
          return hay.includes(token);
        })
      : list;
    return [...matched].sort((a, b) => a.name.localeCompare(b.name));
  }, [filter, query]);

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        pickerHighlightIndex(
          teams.length,
          current,
          event.key === "ArrowDown" ? 1 : -1,
        ),
      );
      return;
    }
    if (event.key === "Enter") {
      const team = teams[Math.max(0, activeIndex)];
      if (team) {
        event.preventDefault();
        onPick(team.id);
      }
    }
  };

  return (
    <div
      className="sc-picker-scrim"
      onClick={(event) => closeComposerScrim(event, onClose)}
    >
      <div
        ref={dialogRef}
        className="sc-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sc-picker-title"
        tabIndex={-1}
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
        <div className="sc-picker__toolbar">
          <label className="sc-picker__search">
            Search
            <input
              type="search"
              value={query}
              placeholder="Name or abbrev (LAL, Celtics…)"
              enterKeyHint="search"
              autoComplete="off"
              aria-label="Search teams"
              onFocus={(event) =>
                event.currentTarget.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                })
              }
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onSearchKeyDown}
            />
          </label>
        </div>
        <div className="sc-picker__filters" role="tablist" aria-label="Conference">
          {(["all", "East", "West"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={filter === value ? "sc-chip is-on" : "sc-chip"}
              onClick={() => {
                setFilter(value);
                setActiveIndex(0);
              }}
            >
              {value === "all" ? "All 30" : value}
            </button>
          ))}
        </div>
        <div className="sc-picker__grid">
          {teams.map((team, index) => (
            <TeamButton
              key={team.id}
              team={team}
              currentId={currentId ?? null}
              usedLabel={usedLabels[team.id]}
              highlighted={activeIndex === index}
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
  highlighted,
  onPick,
}: {
  team: NbaTeam;
  currentId: string | null;
  usedLabel?: string;
  highlighted?: boolean;
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
        highlighted ? "is-active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={
        isUsed ? `${team.name}, already on the board, ${usedLabel}` : team.name
      }
      onClick={() => onPick(team.id)}
    >
      <span className="sc-team__shot">
        <img src={team.logoSrc} alt="" />
        {isUsed ? (
          <span className="sc-team__taken-mark" aria-hidden="true">
            ✓
          </span>
        ) : null}
      </span>
      <span>
        <span className="sc-team__name">{team.name}</span>
        <span className="sc-team__meta">
          {isCurrent ? "This slot" : team.conference}
        </span>
        {isUsed && usedLabel ? (
          <span className="sc-team__used">{usedChipLabel(usedLabel)}</span>
        ) : null}
      </span>
    </button>
  );
}
