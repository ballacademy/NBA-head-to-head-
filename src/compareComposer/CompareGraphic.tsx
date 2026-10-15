import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  composerWatermarkOpacity,
  parseComposerWatermark,
} from "../instagramComposer/composerWatermark";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import { compareStatGutter, compareStatType } from "./compareLayout";
import {
  compareSideCaption,
  compareSideName,
  leadingSide,
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
  compareSideName(side) || fallback;

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
    const type = compareStatType(draft.stats.length);
    const gutter = compareStatGutter(draft.stats.length);
    const watermark = parseComposerWatermark(draft.watermark);

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
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--cmp-value" as string]: String(type.value),
            ["--cmp-label" as string]: String(type.label),
            ["--cmp-rule" as string]: String(type.rule),
            ["--cmp-stroke" as string]: String(type.stroke),
            ["--cmp-gutter-bottom" as string]: String(gutter.bottom),
          } as React.CSSProperties
        }
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
          {([0, 1] as const).map((side) => {
            const person = draft.sides[side]!;
            const caption = compareSideCaption(person);
            const team = getTeam(person.teamId);
            return (
              <section
                key={`cmp-side-${side}`}
                className={`cmp-photo is-${side === 0 ? "left" : "right"}`}
                aria-label={side === 0 ? "Left photo" : "Right photo"}
                style={{ gridColumn: side === 0 ? 1 : 3 }}
              >
                {team && watermark !== "off" ? (
                  <div
                    className="cmp-mark"
                    aria-hidden="true"
                    style={{ opacity: composerWatermarkOpacity(watermark) }}
                  >
                    <TeamLogo src={team.logoSrc} label={team.name} shadow={0} />
                  </div>
                ) : null}
                <PhotoFrame
                  src={person.photoSrc}
                  label={sideLabel(person, side === 0 ? "left" : "right")}
                  pan={person.pan}
                  custom={person.customPhoto}
                  empty={!person.photoSrc}
                  vignette
                  onPan={(pan) => onPan(side, pan)}
                  onUpload={(dataUrl) => onUpload(side, dataUrl)}
                  onPick={() => onPick(side)}
                />
                {caption ? (
                  <p className="cmp-photo-name">{caption}</p>
                ) : null}
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
            {draft.stats.map((stat, index) => {
              const lead = leadingSide(stat.left, stat.right);
              return (
                <div key={`cmp-stat-${index}`} className="cmp-stat">
                  <div
                    className={[
                      "cmp-stat__side",
                      "is-left",
                      lead === 0 ? "is-lead" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <input
                      className="cmp-stat__val"
                      value={stat.left}
                      maxLength={8}
                      aria-label={`Left ${stat.label || "stat"}`}
                      onChange={(event) =>
                        onStatChange(index, {
                          left: event.target.value.slice(0, 8),
                        })
                      }
                    />
                    <input
                      className="cmp-stat__unit"
                      value={stat.label}
                      maxLength={8}
                      aria-label={`Left ${stat.label || "stat"} label`}
                      onChange={(event) =>
                        onStatChange(index, {
                          label: event.target.value.slice(0, 8),
                        })
                      }
                    />
                  </div>
                  <span className="cmp-rule" aria-hidden="true" />
                  <div
                    className={[
                      "cmp-stat__side",
                      "is-right",
                      lead === 1 ? "is-lead" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <input
                      className="cmp-stat__val"
                      value={stat.right}
                      maxLength={8}
                      aria-label={`Right ${stat.label || "stat"}`}
                      onChange={(event) =>
                        onStatChange(index, {
                          right: event.target.value.slice(0, 8),
                        })
                      }
                    />
                    <span className="cmp-stat__unit" aria-hidden="true">
                      {stat.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
