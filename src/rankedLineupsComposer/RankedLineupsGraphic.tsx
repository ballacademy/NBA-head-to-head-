import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { NAME_FIRST_MAX, NAME_LAST_MAX } from "../instagramComposer/nameFit";
import { PlayerNameFade } from "../instagramComposer/PlayerNameFade";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import type { PhotoPan } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import {
  RL_FADE_NAME_H,
  RL_FOOTER_H,
  RL_HEADER_H,
  RL_NAME_H,
  RL_NAME_LOGO,
  RL_POS_H,
} from "./rankedLineupsLayout";
import {
  lineupPosition,
  RANK_PILL_MAX,
  RANKED_LINEUP_STRIP_COUNT,
  splitRankedLineupTitle,
  type RankedLineupStrip,
} from "./rankedLineupsState";

interface RankedLineupsGraphicProps {
  brand: string;
  title: string;
  rank: string;
  strips: RankedLineupStrip[];
  look?: ComposerLook;
  showBa?: boolean;
  showFade?: boolean;
  exporting?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onRankChange: (value: string) => void;
  onPick: (index: number) => void;
  onHover?: (index: number) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
  onNameChange: (
    index: number,
    names: { firstName?: string; lastName?: string },
  ) => void;
}

export const RankedLineupsGraphic = forwardRef<
  HTMLElement,
  RankedLineupsGraphicProps
>(function RankedLineupsGraphic(
  {
    brand,
    title,
    rank,
    strips,
    look = "white",
    showBa = false,
    showFade = false,
    exporting = false,
    onBrandChange,
    onTitleChange,
    onRankChange,
    onPick,
    onHover,
    onPan,
    onUpload,
    onNameChange,
  },
  ref,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const [unit, setUnit] = useState(0.4);
  const titleLines = splitRankedLineupTitle(title);

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
      className={[
        "rl-board",
        exporting ? "is-exporting" : "",
        showFade ? "is-fade" : "",
        composerLookClass(look),
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--u" as string]: `${unit}px`,
          ["--header-h" as string]: String(RL_HEADER_H),
          ["--footer-h" as string]: String(RL_FOOTER_H),
          ["--pos-h" as string]: String(RL_POS_H),
          ["--name-h" as string]: String(showFade ? RL_FADE_NAME_H : RL_NAME_H),
          ["--name-logo" as string]: String(RL_NAME_LOGO),
        } as React.CSSProperties
      }
      aria-label="Instagram ranked lineups graphic"
    >
      {showBa ? (
        <img
          className="composer-ba"
          src="/ba-logo-circled.png"
          alt=""
          aria-hidden="true"
        />
      ) : null}
      <header className="rl-header">
        <input
          className="rl-brand"
          value={brand}
          maxLength={24}
          spellCheck={false}
          aria-label="Brand label"
          onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
        />
        <div className="rl-title-block">
          <ComposerTitleField
            value={title}
            lines={titleLines}
            ariaLabel="Ranked lineups title"
            inputClassName="rl-title-input"
            lineClassName="rl-title-line"
            onChange={onTitleChange}
          />
        </div>
        <input
          className="rl-pill"
          value={rank}
          maxLength={RANK_PILL_MAX}
          spellCheck={false}
          aria-label="Carousel rank pill"
          onChange={(event) =>
            onRankChange(event.target.value.slice(0, RANK_PILL_MAX))
          }
        />
      </header>
      <div className="rl-strips">
        {Array.from({ length: RANKED_LINEUP_STRIP_COUNT }, (_, index) => {
          const strip = strips[index]!;
          const empty = !strip.photoSrc;
          const position = lineupPosition(index);
          const label = strip.lastName || position;
          return (
            <section
              key={`rl-strip-${position}`}
              className="rl-strip"
              aria-label={`${position} strip`}
              onPointerEnter={() => onHover?.(index)}
            >
              <PhotoFrame
                src={strip.photoSrc}
                label={label}
                pan={strip.pan}
                custom={strip.customPhoto}
                empty={empty}
                onPan={(pan) => onPan(index, pan)}
                onUpload={(dataUrl) => onUpload(index, dataUrl)}
                onPick={() => onPick(index)}
              />
              {showFade ? (
                <PlayerNameFade
                  firstName={strip.firstName}
                  lastName={strip.lastName}
                  teamId={strip.teamId}
                  empty={empty}
                  givenAria={`${position} first name on photo`}
                  familyAria={`${position} last name on photo`}
                  onFirstChange={(firstName) =>
                    onNameChange(index, { firstName })
                  }
                  onLastChange={(lastName) =>
                    onNameChange(index, { lastName })
                  }
                  onEmptyClick={() => onPick(index)}
                />
              ) : null}
            </section>
          );
        })}
      </div>
      <footer className="rl-footer">
        {Array.from({ length: RANKED_LINEUP_STRIP_COUNT }, (_, index) => {
          const strip = strips[index]!;
          const empty = !strip.photoSrc;
          const position = lineupPosition(index);
          return (
            <div key={`rl-meta-${position}`} className="rl-meta">
              <span className="rl-pos">{position}</span>
              <input
                className="rl-given"
                value={strip.firstName}
                maxLength={NAME_FIRST_MAX}
                placeholder={empty ? "" : "FIRST"}
                aria-label={`${position} first name`}
                onChange={(event) =>
                  onNameChange(index, {
                    firstName: event.target.value.slice(0, NAME_FIRST_MAX),
                  })
                }
                onClick={() => {
                  if (empty) {
                    onPick(index);
                  }
                }}
              />
              <textarea
                className="rl-family"
                value={strip.lastName}
                maxLength={NAME_LAST_MAX}
                rows={2}
                placeholder={empty ? "" : "LAST"}
                aria-label={`${position} last name`}
                onChange={(event) =>
                  onNameChange(index, {
                    lastName: event.target.value.slice(0, NAME_LAST_MAX),
                  })
                }
                onClick={() => {
                  if (empty) {
                    onPick(index);
                  }
                }}
              />
            </div>
          );
        })}
      </footer>
    </article>
  );
});
