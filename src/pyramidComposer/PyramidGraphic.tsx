import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  PYRAMID_ROWS,
  PYRAMID_SLOT_COUNT,
  PYR_CELL,
  PYR_GAP,
} from "./pyramidLayout";
import type { PyramidSlot } from "./pyramidState";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";

interface PyramidGraphicProps {
  title: string;
  slots: PyramidSlot[];
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
            ["--pyr-cell" as string]: String(PYR_CELL),
            ["--pyr-gap" as string]: String(PYR_GAP),
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
          {PYRAMID_ROWS.map((count, row) => {
            const start = cursor;
            cursor += count;
            return (
              <div
                key={`pyr-row-${row}`}
                className="pyr-row"
                style={{ ["--cols" as string]: count } as React.CSSProperties}
              >
                {Array.from({ length: count }, (_, col) => {
                  const index = start + col;
                  const slot = slots[index] ?? slots[0]!;
                  const empty = !slot?.photoSrc;
                  const label =
                    `${slot?.firstName ?? ""} ${slot?.lastName ?? ""}`.trim() ||
                    `slot ${index + 1}`;
                  if (index >= PYRAMID_SLOT_COUNT) {
                    return null;
                  }
                  return (
                    <section
                      key={`pyr-cell-${index}`}
                      className="pyr-cell"
                      aria-label={`Pyramid slot ${index + 1}`}
                      onPointerEnter={() => onHover?.(index)}
                    >
                      <PhotoFrame
                        src={slot.photoSrc}
                        label={label}
                        pan={slot.pan}
                        custom={slot.customPhoto}
                        empty={empty}
                        vignette
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
