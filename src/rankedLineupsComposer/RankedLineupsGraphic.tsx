import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerFlairClass,
  composerLookClass,
  teamHairlineColor,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import {
  composerNameLines,
  useComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import { NAME_FIRST_MAX, NAME_LAST_MAX } from "../instagramComposer/nameFit";
import { PlayerNameFade } from "../instagramComposer/PlayerNameFade";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import type { PhotoPan } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import {
  RL_FADE_NAME_H,
  RL_NAME_H,
  RL_NAME_LOGO,
  RL_POS_H,
  RL_TITLE_BOX_H,
  rankedFooterH,
  rankedHeaderH,
  type RankDisplay,
} from "./rankedLineupsLayout";
import {
  DEFAULT_POSITION_LABELS,
  lineupPosition,
  parsePositionLabels,
  POSITION_LABEL_MAX,
  RANK_PILL_MAX,
  rankHeadlinePrimary,
  rankHeadlineSecondary,
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
  purpleFlair?: boolean;
  photoGrade?: boolean;
  showBa?: boolean;
  showFade?: boolean;
  showTeamHairline?: boolean;
  rankDisplay?: RankDisplay;
  positionLabels?: string[];
  exporting?: boolean;
  story?: boolean;
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
  onPositionChange: (index: number, label: string) => void;
}

function RankedMetaName({
  firstName,
  lastName,
  empty,
  position,
  onNameChange,
  onPick,
}: {
  firstName: string;
  lastName: string;
  empty: boolean;
  position: string;
  onNameChange: (names: { firstName?: string; lastName?: string }) => void;
  onPick: () => void;
}) {
  const [style] = useComposerNameStyle();
  const [givenFocus, setGivenFocus] = useState(false);
  const [familyFocus, setFamilyFocus] = useState(false);
  const lines = composerNameLines(firstName, lastName, style);
  const hideGiven = style === "last" && !givenFocus && !lines.given;
  return (
    <>
      {hideGiven ? null : (
        <input
          className="rl-given"
          value={givenFocus ? firstName : lines.given}
          maxLength={NAME_FIRST_MAX}
          placeholder={empty ? "" : "FIRST"}
          aria-label={`${position} first name`}
          onFocus={() => setGivenFocus(true)}
          onBlur={() => setGivenFocus(false)}
          onChange={(event) =>
            onNameChange({
              firstName: event.target.value.slice(0, NAME_FIRST_MAX),
            })
          }
          onClick={() => {
            if (empty) {
              onPick();
            }
          }}
        />
      )}
      <textarea
        className="rl-family"
        value={familyFocus ? lastName : lines.family}
        maxLength={NAME_LAST_MAX}
        rows={2}
        placeholder={empty ? "" : "LAST"}
        aria-label={`${position} last name`}
        onFocus={() => setFamilyFocus(true)}
        onBlur={() => setFamilyFocus(false)}
        onChange={(event) =>
          onNameChange({
            lastName: event.target.value.slice(0, NAME_LAST_MAX),
          })
        }
        onClick={() => {
          if (empty) {
            onPick();
          }
        }}
      />
    </>
  );
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
    purpleFlair = false,
    photoGrade = false,
    showBa = false,
    showFade = false,
    showTeamHairline = true,
    rankDisplay = "pill",
    positionLabels,
    exporting = false,
    story = false,
    onBrandChange,
    onTitleChange,
    onRankChange,
    onPick,
    onHover,
    onPan,
    onUpload,
    onNameChange,
    onPositionChange,
  },
  ref,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const [unit, setUnit] = useState(0.4);
  const titleLines = splitRankedLineupTitle(title);
  const labels = parsePositionLabels(positionLabels, strips.length);

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
        "rl-board",
        exporting ? "is-exporting" : "",
        showFade ? "is-fade" : "",
        showTeamHairline ? "is-hairline" : "",
        rankDisplay === "none"
          ? "is-plain"
          : rankDisplay === "pill"
            ? "is-pill"
            : "is-headline",
        composerLookClass(look),
        composerFlairClass(purpleFlair),
        composerGradeClass(photoGrade),
        story ? "is-story" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--u" as string]: `${unit}px`,
          ["--header-h" as string]: String(rankedHeaderH(rankDisplay)),
          ["--title-box-h" as string]: String(RL_TITLE_BOX_H),
          ["--footer-h" as string]: String(rankedFooterH(showFade)),
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
        {showBa ? null : (
        <input
          className="rl-brand"
          value={brand}
          maxLength={24}
          spellCheck={false}
          aria-label="Brand label"
          onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
        />
        )}
        <div className="rl-title-plate">
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
        </div>
        {rankDisplay === "none" ? null : rankDisplay === "pill" ? (
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
        ) : (
          <div className="rl-headline" aria-label="Carousel rank headline">
            <span className="rl-headline__mark">{rankHeadlinePrimary(rank)}</span>
            <span className="rl-headline__of">{rankHeadlineSecondary(rank)}</span>
          </div>
        )}
      </header>
      <div className="rl-strips">
        {strips.map((strip, index) => {
          const empty = !strip.photoSrc;
          const position = lineupPosition(index);
          const label = strip.lastName || position;
          const hair = showTeamHairline
            ? teamHairlineColor(strip.teamId, look)
            : null;
          return (
            <section
              key={`rl-strip-${index}-${position}`}
              className={["rl-strip", hair ? "has-hairline" : ""]
                .filter(Boolean)
                .join(" ")}
              style={
                hair
                  ? ({ ["--team-hairline" as string]: hair } as React.CSSProperties)
                  : undefined
              }
              aria-label={`${position} strip`}
              onPointerEnter={() => onHover?.(index)}
            >
              <PhotoFrame
                src={strip.photoSrc}
                label={label}
                pan={strip.pan}
                custom={strip.customPhoto}
                empty={empty}
                vignette
                onPan={(pan) => onPan(index, pan)}
                onUpload={(dataUrl) => onUpload(index, dataUrl)}
                onUploadMany={(urls) =>
                  urls.forEach((url, offset) => onUpload(index + offset, url))
                }
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
        {strips.map((strip, index) => {
          const empty = !strip.photoSrc;
          const position = lineupPosition(index);
          const posLabel = labels[index] ?? "";
          return (
            <div key={`rl-meta-${position}`} className="rl-meta">
              <div className="rl-pos-slot">
                <div className="rl-pos-wrap">
                  <input
                    className="rl-pos"
                    value={posLabel}
                    maxLength={POSITION_LABEL_MAX}
                    placeholder={DEFAULT_POSITION_LABELS[index]}
                    spellCheck={false}
                    aria-label={`${position} position label`}
                    onChange={(event) =>
                      onPositionChange(
                        index,
                        event.target.value.slice(0, POSITION_LABEL_MAX),
                      )
                    }
                  />
                  {exporting || !posLabel ? null : (
                    <button
                      type="button"
                      className="rl-pos__hide"
                      aria-label={`Hide ${position} position`}
                      onClick={() => onPositionChange(index, "")}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              {showFade ? null : (
                <RankedMetaName
                  firstName={strip.firstName}
                  lastName={strip.lastName}
                  empty={empty}
                  position={position}
                  onNameChange={(names) => onNameChange(index, names)}
                  onPick={() => onPick(index)}
                />
              )}
            </div>
          );
        })}
      </footer>
    </article>
  );
});
