import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import { getPlayer } from "./nbaActivePlayers";
import { PlayerHeadshot } from "./PlayerHeadshot";
import {
  BA_LOGO_SRC,
  baBadgeRect,
  GRAPHIC_WIDTH,
  layoutTierLabel,
  TIER_CELL_GAP,
  TIER_CELLS_INSET,
  TIER_FOOTER,
  TIER_HEADER_H,
  TIER_LABEL_MAX_LENGTH,
  TIER_LABEL_W,
  TIER_PAD_RIGHT,
  TIER_ROW_PAD_Y,
  TIER_TITLE_SIZE,
  tierBoardLayout,
} from "./tierLayout";
import {
  isDefaultTierColor,
  parseTierColor,
  splitTierTitle,
  type TierRow,
  type TierSubject,
} from "./tierState";

export interface TierPickerTarget {
  rowIndex: number;
  replaceId: string | null;
}

interface TierListGraphicProps {
  title: string;
  rows: TierRow[];
  subject?: TierSubject;
  look?: ComposerLook;
  showBa?: boolean;
  active: TierPickerTarget | null;
  exporting?: boolean;
  onTitleChange: (value: string) => void;
  onLabelChange: (index: number, value: string) => void;
  onColorChange: (index: number, color: string) => void;
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
      subject = "teams",
      look = "white",
      showBa = true,
      active,
      exporting = false,
      onTitleChange,
      onLabelChange,
      onColorChange,
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
    const badge = baBadgeRect();
    const labelLayouts = rows.map((row) => layoutTierLabel(row.label));
    const layout = tierBoardLayout(
      rows.map((row) => (exporting ? row.teams.length : row.teams.length + 1)),
      labelLayouts.map((item) => item.lines.length),
    );

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
        className={["tl-board", exporting ? "is-exporting" : "", composerLookClass(look)]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--title-size" as string]: String(TIER_TITLE_SIZE),
            ["--label-w" as string]: String(TIER_LABEL_W),
            ["--header-h" as string]: String(TIER_HEADER_H),
            ["--footer-h" as string]: String(TIER_FOOTER),
          } as React.CSSProperties
        }
        aria-label="Instagram NBA tier list graphic"
      >
        <header className="tl-header">
          <div className="tl-title-block">
            <ComposerTitleField
              value={title}
              lines={titleLines}
              ariaLabel="Tier list title"
              inputClassName="tl-title-input"
              lineClassName="tl-title-line"
              onChange={onTitleChange}
            />
          </div>
          {showBa ? (
            <img
              className="tl-badge"
              src={BA_LOGO_SRC}
              alt=""
              aria-hidden="true"
              style={
                {
                  top: `calc(${badge.y} * var(--u))`,
                  right: `calc(${GRAPHIC_WIDTH - badge.x - badge.size} * var(--u))`,
                  width: `calc(${badge.size} * var(--u))`,
                  height: `calc(${badge.size} * var(--u))`,
                } as React.CSSProperties
              }
            />
          ) : null}
        </header>
        <div
          className="tl-rows"
          style={
            {
              ["--tier-count" as string]: String(rows.length),
              ["--tier-rows" as string]: layout.gridTemplate,
              ["--cell" as string]: `calc(${layout.size} * var(--u))`,
              ["--cell-cols" as string]: String(layout.cols),
              ["--cell-gap" as string]: String(TIER_CELL_GAP),
              ["--row-pad" as string]: String(TIER_ROW_PAD_Y),
              ["--pad-right" as string]: String(TIER_PAD_RIGHT),
              ["--cells-inset" as string]: String(TIER_CELLS_INSET),
            } as React.CSSProperties
          }
        >
          {rows.map((row, rowIndex) => {
            const labelLayout = labelLayouts[rowIndex]!;
            const color = parseTierColor(row.color);
            const tinted = !isDefaultTierColor(color);
            return (
              <div
                key={row.id}
                className={["tl-row", tinted ? "is-tinted" : ""]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  {
                    ["--label-size" as string]: `calc(${labelLayout.fontSize} * var(--u))`,
                    ["--tier-color" as string]: color,
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
                <div className="tl-label-stack">
                  <ComposerTitleField
                    value={row.label}
                    lines={labelLayout.lines}
                    ariaLabel={`Tier ${rowIndex + 1} label`}
                    inputClassName="tl-label"
                    lineClassName="tl-label-line"
                    maxLength={TIER_LABEL_MAX_LENGTH}
                    onChange={(value) => onLabelChange(rowIndex, value)}
                  />
                  {exporting ? null : (
                    <input
                      type="color"
                      className="tl-color"
                      value={color}
                      aria-label={`Color for ${row.label || `tier ${rowIndex + 1}`}`}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        onColorChange(rowIndex, event.target.value)
                      }
                    />
                  )}
                </div>
                <div className="tl-cells">
                  {row.teams.map((entityId, index) => {
                    const player =
                      subject === "players" ? getPlayer(entityId) : null;
                    const team = player
                      ? getTeam(player.team)
                      : getTeam(entityId);
                    if (!team && !player) {
                      return null;
                    }
                    const isActive =
                      active?.rowIndex === rowIndex &&
                      active.replaceId === entityId;
                    const isDrop = dropKey === `${rowIndex}-${index}`;
                    const labelName = player?.name ?? team?.name ?? entityId;
                    return (
                      <div
                        key={entityId}
                        className={[
                          "tl-cell",
                          "tl-cell--filled",
                          player ? "tl-cell--player" : "tl-cell--team",
                          isActive ? "is-active" : "",
                          isDrop ? "is-drop" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={
                          team
                            ? ({
                                ["--cell-from" as string]: team.cellFrom,
                                ["--cell-to" as string]: team.cellTo,
                              } as React.CSSProperties)
                            : undefined
                        }
                        draggable={!exporting}
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            "application/x-tier-team",
                            dragPayload(rowIndex, entityId),
                          );
                          event.dataTransfer.setData(
                            "text/plain",
                            dragPayload(rowIndex, entityId),
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
                          onClick={() => onSelectTeam(rowIndex, entityId)}
                          aria-label={`${row.label} tier, ${labelName}. Change`}
                        />
                        {player ? (
                          <>
                            {team ? (
                              <div
                                className="tl-cell__watermark"
                                aria-hidden="true"
                              >
                                <TeamLogo
                                  src={team.logoSrc}
                                  label={team.id}
                                  shadow={0}
                                  fitX={0.9}
                                  fitY={0.9}
                                />
                              </div>
                            ) : null}
                            <PlayerHeadshot
                              src={player.headshotUrl}
                              label={player.id}
                            />
                          </>
                        ) : team ? (
                          <div className="tl-cell__logo" aria-hidden="true">
                            <TeamLogo
                              src={team.logoSrc}
                              label={team.id}
                              balanceStamp
                            />
                          </div>
                        ) : null}
                        {exporting ? null : (
                          <button
                            type="button"
                            className="tl-cell__remove"
                            aria-label={`Remove ${labelName}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemoveTeam(rowIndex, entityId);
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
                      aria-label={`Add ${subject === "players" ? "player" : "team"} to ${row.label} tier`}
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
