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
  type CompareDraft,
  type CompareSide,
  type PhotoPan,
} from "./compareState";

interface CompareGraphicProps {
  draft: CompareDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  exporting?: boolean;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onStatsLabelChange: (value: string) => void;
  onStatChange: (
    index: number,
    patch: { label?: string; left?: string; right?: string },
  ) => void;
  onPick: (side: 0 | 1) => void;
  onPan: (side: 0 | 1, pan: PhotoPan) => void;
  onUpload: (side: 0 | 1, dataUrl: string) => void;
}

const sideLabel = (side: CompareSide, fallback: string) =>
  `${side.firstName} ${side.lastName}`.trim() || fallback;

export const CompareGraphic = forwardRef<HTMLElement, CompareGraphicProps>(
  function CompareGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      exporting = false,
      onTitleChange,
      onSubtitleChange,
      onStatsLabelChange,
      onStatChange,
      onPick,
      onPan,
      onUpload,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(1);

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

    return (
      <article
        ref={setRefs}
        className={[
          "cmp-board",
          exporting ? "is-exporting" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ ["--u" as string]: `${unit}px` } as React.CSSProperties}
        aria-label="Instagram comparison graphic"
      >
        {draft.showBa !== false ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        <div className="cmp-title-plate">
          <input
            className="cmp-title"
            value={draft.title}
            maxLength={36}
            spellCheck={false}
            aria-label="Comparison title"
            onChange={(event) =>
              onComposerTextChange(event, onTitleChange, 36)
            }
          />
        </div>
        <div className="cmp-photos">
          {([0] as const).map((side) => {
            const person = draft.sides[side]!;
            return (
              <section
                key={`cmp-side-${side}`}
                className="cmp-photo"
                aria-label="Left photo"
              >
                <PhotoFrame
                  src={person.photoSrc}
                  label={sideLabel(person, "left")}
                  pan={person.pan}
                  custom={person.customPhoto}
                  empty={!person.photoSrc}
                  vignette
                  onPan={(pan) => onPan(side, pan)}
                  onUpload={(dataUrl) => onUpload(side, dataUrl)}
                  onPick={() => onPick(side)}
                />
              </section>
            );
          })}
          <div className="cmp-stats">
            <input
              className="cmp-stats__label"
              value={draft.statsLabel}
              maxLength={24}
              aria-label="Stats column label"
              onChange={(event) =>
                onStatsLabelChange(event.target.value.slice(0, 24))
              }
            />
            {draft.stats.map((stat, index) => (
              <div key={`cmp-stat-${index}`} className="cmp-stat">
                <input
                  className="cmp-stat__val is-left"
                  value={stat.left}
                  maxLength={8}
                  aria-label={`Left ${stat.label || "stat"}`}
                  onChange={(event) =>
                    onStatChange(index, {
                      left: event.target.value.slice(0, 8),
                    })
                  }
                />
                <div className="cmp-stat__mid">
                  <span className="cmp-rule" aria-hidden="true" />
                  <input
                    className="cmp-stat__name"
                    value={stat.label}
                    maxLength={8}
                    aria-label={`Stat ${index + 1} label`}
                    onChange={(event) =>
                      onStatChange(index, {
                        label: event.target.value.slice(0, 8),
                      })
                    }
                  />
                  <span className="cmp-rule" aria-hidden="true" />
                </div>
                <input
                  className="cmp-stat__val is-right"
                  value={stat.right}
                  maxLength={8}
                  aria-label={`Right ${stat.label || "stat"}`}
                  onChange={(event) =>
                    onStatChange(index, {
                      right: event.target.value.slice(0, 8),
                    })
                  }
                />
              </div>
            ))}
          </div>
          <section className="cmp-photo" aria-label="Right photo">
            <PhotoFrame
              src={draft.sides[1]!.photoSrc}
              label={sideLabel(draft.sides[1]!, "right")}
              pan={draft.sides[1]!.pan}
              custom={draft.sides[1]!.customPhoto}
              empty={!draft.sides[1]!.photoSrc}
              vignette
              onPan={(pan) => onPan(1, pan)}
              onUpload={(dataUrl) => onUpload(1, dataUrl)}
              onPick={() => onPick(1)}
            />
          </section>
        </div>
        <div className="cmp-sub-plate">
          <input
            className="cmp-sub"
            value={draft.subtitle}
            maxLength={48}
            spellCheck={false}
            aria-label="Comparison subtitle"
            onChange={(event) =>
              onComposerTextChange(event, onSubtitleChange, 48)
            }
          />
        </div>
      </article>
    );
  },
);
