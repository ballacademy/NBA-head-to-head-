import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { PlayerNameFade } from "../instagramComposer/PlayerNameFade";
import { getTeamColors } from "../lib/teamColors";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  SCC_BA_INSET,
  SCC_BA_SIZE,
} from "../statCardCoverComposer/statCardCoverLayout";
import {
  TK_WELL_H,
} from "./takeawaysLayout";
import {
  TAKEAWAYS_FACT_MAX,
  TAKEAWAYS_LINE_MAX,
  takeawaysCardName,
  takeawaysWeekPill,
  type PhotoPan,
  type TakeawaysCard,
  type TakeawaysDraft,
} from "./takeawaysState";

interface TakeawaysCardGraphicProps {
  draft: TakeawaysDraft;
  card: TakeawaysCard;
  index: number;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  exporting?: boolean;
  onLine1Change: (value: string) => void;
  onLine2Change: (value: string) => void;
  onFactChange: (value: string) => void;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onPick: () => void;
  onNameChange: (names: { firstName?: string; lastName?: string }) => void;
}

export const TakeawaysCardGraphic = forwardRef<
  HTMLElement,
  TakeawaysCardGraphicProps
>(function TakeawaysCardGraphic(
  {
    draft,
    card,
    index,
    look = "white",
    purpleFlair = false,
    photoGrade = false,
    exporting = false,
    onLine1Change,
    onLine2Change,
    onFactChange,
    onPan,
    onUpload,
    onPick,
    onNameChange,
  },
  ref,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const [unit, setUnit] = useState(0.4);
  const empty = !card.photoSrc;
  const named = Boolean(card.playerId || takeawaysCardName(card));
  const overlay = draft.well === "overlay";
  const bleed = overlay || draft.well === "fade";
  const team = getTeamColors(card.teamId ?? "");
  const total = Math.max(1, draft.cards.length);
  const label = takeawaysCardName(card) || "takeaway player";

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
        "tk-card",
        `is-${draft.well}`,
        overlay ? "is-overlay" : "",
        bleed ? "" : "is-well",
        exporting ? "is-exporting" : "",
        composerLookClass(look),
        composerFlairClass(purpleFlair),
        composerGradeClass(photoGrade),
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--u" as string]: `${unit}px`,
          ["--well-h" as string]: String(overlay ? 280 : TK_WELL_H),
          ["--team" as string]: team.primary,
        } as React.CSSProperties
      }
      aria-label="Instagram NBA takeaways card"
    >
      <PhotoFrame
        src={card.photoSrc}
        label={label}
        pan={card.pan}
        custom={card.customPhoto}
        empty={empty}
        vignette
        onPan={onPan}
        onUpload={onUpload}
        onPick={onPick}
      />
      {named ? (
        <PlayerNameFade
          firstName={card.firstName}
          lastName={card.lastName}
          teamId={card.teamId}
          empty={empty}
          givenAria="Takeaway first name"
          familyAria="Takeaway last name"
          onFirstChange={(firstName) => onNameChange({ firstName })}
          onLastChange={(lastName) => onNameChange({ lastName })}
          onEmptyClick={onPick}
        />
      ) : null}
      {draft.showIndex ? (
        <p className="tk-index">{`${index + 1} / ${total}`}</p>
      ) : null}
      {draft.showWeekGhost ? (
        <p className="tk-ghost">{takeawaysWeekPill(draft)}</p>
      ) : null}
      <div className="tk-well">
        {draft.showFactChip ? (
          <input
            className="tk-fact"
            value={card.fact}
            maxLength={TAKEAWAYS_FACT_MAX}
            spellCheck={false}
            aria-label="Takeaway fact chip"
            placeholder="W VS OKC"
            onChange={(event) =>
              onFactChange(event.target.value.slice(0, TAKEAWAYS_FACT_MAX))
            }
          />
        ) : null}
        <textarea
          className="tk-line tk-line--1"
          value={card.line1}
          maxLength={TAKEAWAYS_LINE_MAX}
          rows={2}
          spellCheck={false}
          aria-label="Takeaway line"
          placeholder="Add takeaway"
          onChange={(event) =>
            onLine1Change(event.target.value.slice(0, TAKEAWAYS_LINE_MAX))
          }
        />
        <textarea
          className="tk-line tk-line--2"
          value={card.line2}
          maxLength={TAKEAWAYS_LINE_MAX}
          rows={2}
          spellCheck={false}
          aria-label="Takeaway second line"
          placeholder="Optional line"
          onChange={(event) =>
            onLine2Change(event.target.value.slice(0, TAKEAWAYS_LINE_MAX))
          }
        />
      </div>
      {draft.showBa !== false ? (
        <img
          className="composer-ba"
          src="/ba-logo-circled.png"
          alt=""
          aria-hidden="true"
          style={{
            top: `calc(${SCC_BA_INSET} * var(--u))`,
            right: `calc(${SCC_BA_INSET} * var(--u))`,
            width: `calc(${SCC_BA_SIZE} * var(--u))`,
            height: `calc(${SCC_BA_SIZE} * var(--u))`,
          }}
        />
      ) : null}
    </article>
  );
});
