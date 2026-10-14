import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { pyramidMetrics, PYR_DEFAULT_ROWS } from "./pyramidLayout";
import type { PyramidSlot } from "./pyramidState";

interface PyramidGraphicProps {
  title: string;
  slots: PyramidSlot[];
  rows?: number;
  rowLabels?: string[];
  look?: ComposerLook;
  purpleFlair?: boolean;
  showBa?: boolean;
  exporting?: boolean;
  onTitleChange: (value: string) => void;
  onPick: (index: number) => void;
  onHover?: (index: number) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
}

export const PyramidGraphic = forwardRef<HTMLElement, PyramidGraphicProps>(
  function PyramidGraphic(
    {
      title,
      slots,
      rows = PYR_DEFAULT_ROWS,
      rowLabels = [],
      look = "white",
      purpleFlair = false,
      showBa = true,
      exporting = false,
      onTitleChange,
      onPick,
      onHover,
      onPan,
      onUpload,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const metrics = pyramidMetrics(rows);

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
        const width = node.offsetWidth;
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

    let cursor = 0;

    return (
      <article
        ref={setRefs}
        className={[
          "pyr-board",
          exporting ? "is-exporting" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--pyr-cell" as string]: String(metrics.cell),
            ["--pyr-col-gap" as string]: String(metrics.colGap),
            ["--pyr-row-gap" as string]: String(metrics.rowGap),
            ["--pyr-pop" as string]: String(metrics.pop),
          } as React.CSSProperties
        }
        aria-label="Instagram pyramid graphic"
      >
        {showBa ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        <header className="pyr-header">
          <input
            className="pyr-title"
            value={title}
            maxLength={48}
            spellCheck={false}
            aria-label="Pyramid title"
            onChange={(event) => onComposerTextChange(event, onTitleChange, 48)}
          />
        </header>
        <div className="pyr-rows">
          {metrics.rows.map((count, row) => {
            const start = cursor;
            cursor += count;
            const rowLabel = (rowLabels[row] ?? "").trim();
            return (
              <div
                key={`pyr-row-${row}`}
                className="pyr-row"
                style={
                  {
                    ["--cols" as string]: count,
                    ["--z" as string]: String(20 - row),
                  } as React.CSSProperties
                }
              >
                {rowLabel ? (
                  <span className="pyr-row-label">{rowLabel}</span>
                ) : null}
                {Array.from({ length: count }, (_, col) => {
                  const index = start + col;
                  const slot = slots[index];
                  if (!slot) {
                    return null;
                  }
                  const empty = !slot.photoSrc;
                  const label =
                    `${slot.firstName} ${slot.lastName}`.trim() ||
                    `slot ${index + 1}`;
                  const team = getTeam(slot.teamId);
                  return (
                    <section
                      key={`pyr-cell-${index}`}
                      className={["pyr-cell", team ? "has-team" : ""]
                        .filter(Boolean)
                        .join(" ")}
                      style={
                        team
                          ? ({
                              ["--team-from" as string]: team.cellFrom,
                              ["--team-to" as string]: team.cellTo,
                            } as React.CSSProperties)
                          : undefined
                      }
                      aria-label={`Pyramid slot ${index + 1}`}
                      onPointerEnter={() => onHover?.(index)}
                    >
                      <PhotoFrame
                        src={slot.photoSrc}
                        label={label}
                        pan={slot.pan}
                        custom={slot.customPhoto}
                        empty={empty}
                        pop={!empty}
                        onPan={(pan) => onPan(index, pan)}
                        onUpload={(dataUrl) => onUpload(index, dataUrl)}
                        onPick={() => onPick(index)}
                      />
                    </section>
                  );
                })}
              </div>
            );
          })}
        </div>
      </article>
    );
  },
);
