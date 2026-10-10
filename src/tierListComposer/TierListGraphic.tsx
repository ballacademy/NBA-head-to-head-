import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import {
  cellSize,
  cellsContentWidth,
  GRAPHIC_WIDTH,
  labelFontSize,
  rowMetrics,
} from "./tierLayout";
import { splitTierTitle, type TierRow } from "./tierState";

export interface TierPickerTarget {
  rowIndex: number;
  replaceId: string | null;
}

interface TierListGraphicProps {
  title: string;
  rows: TierRow[];
  active: TierPickerTarget | null;
  exporting?: boolean;
  onTitleChange: (value: string) => void;
  onLabelChange: (index: number, value: string) => void;
  onSelectAdd: (rowIndex: number) => void;
  onSelectTeam: (rowIndex: number, teamId: string) => void;
  onRemoveTeam: (rowIndex: number, teamId: string) => void;
  onPlaceTeam: (rowIndex: number, index: number, teamId: string) => void;
}

const dragPayload = (rowIndex: number, teamId: string) =>
  JSON.stringify({ rowIndex, teamId });

const readDrag = (event: React.DragEvent) => {
  try {
    const raw =
      event.dataTransfer.getData("application/x-tier-team") ||
      event.dataTransfer.getData("text/plain");
    const parsed = JSON.parse(raw) as { rowIndex?: number; teamId?: string };
    if (
      typeof parsed.rowIndex === "number" &&
      typeof parsed.teamId === "string"
    ) {
      return parsed as { rowIndex: number; teamId: string };
    }
  } catch {
    return null;
  }
  return null;
};

export const TierListGraphic = forwardRef<HTMLElement, TierListGraphicProps>(
  function TierListGraphic(
    {
      title,
      rows,
      active,
      exporting = false,
      onTitleChange,
      onLabelChange,
      onSelectAdd,
      onSelectTeam,
      onRemoveTeam,
      onPlaceTeam,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const [dropKey, setDropKey] = useState<string | null>(null);
    const titleLines = splitTierTitle(title);
    const { rowH } = rowMetrics(rows.length);
    const contentW = cellsContentWidth();

    const setRefs = (node: HTMLElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    useLayoutEffect(() => {
      const node = localRef.current;
      if (!node) {
        return;
      }
      const sync = () => {
        const width = node.getBoundingClientRect().width;
        if (width > 0) {
          setUnit(width / GRAPHIC_WIDTH);
        }
      };
      sync();
      if (typeof ResizeObserver === "undefined") {
        return;
      }
      const observer = new ResizeObserver(sync);
      observer.observe(node);
      return () => observer.disconnect();
    }, []);

    return (
      <article
        ref={setRefs}
        className={exporting ? "tl-board is-exporting" : "tl-board"}
        style={{ ["--u" as string]: `${unit}px` } as React.CSSProperties}
        aria-label="Instagram NBA tier list graphic"
      >
        <header className="tl-header">
          <div className="tl-title-block">
            {titleLines.map((line, index) => (
              <span key={`${index}-${line}`} className="tl-title-line">
                {line}
              </span>
            ))}
            <input
              className="tl-title-input"
              value={title}
              maxLength={48}
              spellCheck={false}
              aria-label="Tier list title"
              onChange={(event) =>
                onTitleChange(event.target.value.toUpperCase())
              }
            />
          </div>
          <div className="tl-badge" aria-hidden="true">
            <span>BA</span>
          </div>
        </header>
        <div
          className="tl-rows"
          style={{ ["--tier-count" as string]: String(rows.length) }}
        >
          {rows.map((row, rowIndex) => {
            const slots = exporting ? row.teams.length : row.teams.length + 1;
            const size = cellSize(rowH, contentW, Math.max(1, slots));
            const labelSize = labelFontSize(row.label);
            return (
              <div
                key={row.id}
                className="tl-row"
                style={
                  {
                    ["--cell" as string]: `calc(${size} * var(--u))`,
                    ["--label-size" as string]: `calc(${labelSize} * var(--u))`,
                  } as React.CSSProperties
                }
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropKey(`row-${rowIndex}`);
                }}
                onDragLeave={() => setDropKey(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropKey(null);
                  const payload = readDrag(event);
                  if (!payload) {
                    return;
                  }
                  onPlaceTeam(rowIndex, row.teams.length, payload.teamId);
                }}
              >
                <input
                  className="tl-label"
                  value={row.label}
                  maxLength={8}
                  spellCheck={false}
                  aria-label={`Tier ${rowIndex + 1} label`}
                  onChange={(event) =>
                    onLabelChange(rowIndex, event.target.value.toUpperCase())
                  }
                />
                <div className="tl-cells">
                  {row.teams.map((teamId, index) => {
                    const team = getTeam(teamId);
                    if (!team) {
                      return null;
                    }
                    const isActive =
                      active?.rowIndex === rowIndex &&
                      active.replaceId === teamId;
                    const isDrop = dropKey === `${rowIndex}-${index}`;
                    return (
                      <div
                        key={teamId}
                        className={[
                          "tl-cell",
                          "tl-cell--filled",
                          isActive ? "is-active" : "",
                          isDrop ? "is-drop" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={
                          {
                            ["--cell-from" as string]: team.cellFrom,
                            ["--cell-to" as string]: team.cellTo,
                          } as React.CSSProperties
                        }
                        draggable={!exporting}
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            "application/x-tier-team",
                            dragPayload(rowIndex, teamId),
                          );
                          event.dataTransfer.setData(
                            "text/plain",
                            dragPayload(rowIndex, teamId),
                          );
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setDropKey(`${rowIndex}-${index}`);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setDropKey(null);
                          const payload = readDrag(event);
                          if (!payload) {
                            return;
                          }
                          onPlaceTeam(rowIndex, index, payload.teamId);
                        }}
                      >
                        <button
                          type="button"
                          className="tl-cell__hit"
                          onClick={() => onSelectTeam(rowIndex, teamId)}
                          aria-label={`${row.label} tier, ${team.name}. Change team`}
                        />
                        <TeamLogo src={team.logoSrc} label={team.id} />
                        {exporting ? null : (
                          <button
                            type="button"
                            className="tl-cell__remove"
                            aria-label={`Remove ${team.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemoveTeam(rowIndex, teamId);
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {exporting ? null : (
                    <button
                      type="button"
                      className={[
                        "tl-cell",
                        "tl-cell--add",
                        active?.rowIndex === rowIndex && !active.replaceId
                          ? "is-active"
                          : "",
                        dropKey === `row-${rowIndex}` ? "is-drop" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => onSelectAdd(rowIndex)}
                      aria-label={`Add team to ${row.label} tier`}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </article>
    );
  },
);
