import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { useComposerNameStyle } from "../instagramComposer/composerNameStyle";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { LetterGradePlate } from "../instagramComposer/LetterGradePlate";
import { getTeamColors } from "../lib/teamColors";
import {
  DEFAULT_LETTER_GRADE,
  parseLetterGrade,
  type LetterGrade,
} from "../lib/letterGrade";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { QUOTE_MAX, SOURCE_MAX, type QuoteDraft } from "./quoteState";
import {
  isLongQuote,
  quoteBottom,
  quoteLastName,
  quoteLastNameSize,
  quoteMaxLines,
  quoteTypeSize,
} from "./quoteLayout";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";

interface QuoteGraphicProps {
  draft: QuoteDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  exporting?: boolean;
  onQuoteChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onPick: () => void;
  onLetterGradeChange?: (grade: LetterGrade) => void;
  onLetterGradeReasonChange?: (reason: string) => void;
}

export const QuoteGraphic = forwardRef<HTMLElement, QuoteGraphicProps>(
  function QuoteGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      photoGrade = false,
      exporting = false,
      onQuoteChange,
      onSourceChange,
      onPan,
      onUpload,
      onPick,
      onLetterGradeChange,
      onLetterGradeReasonChange,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(1);
    const [nameStyle] = useComposerNameStyle();
    const last = quoteLastName(draft.attribution, nameStyle);
    const long = isLongQuote(draft.quote);
    const lastSize = quoteLastNameSize(last, draft.quote);
    const quoteSize = quoteTypeSize(draft.quote);
    const quoteLines = quoteMaxLines(draft.quote);
    const hasSource = Boolean(draft.source.trim());
    const bottom = quoteBottom(hasSource);
    const teamColor = draft.teamId
      ? getTeamColors(draft.teamId).primary
      : "#ffffff";

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
          "qt-board",
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
            ["--team-color" as string]: teamColor,
            ["--quote-size" as string]: String(quoteSize),
          } as React.CSSProperties
        }
        aria-label="Instagram quote graphic"
      >
        <PhotoFrame
          src={draft.showHeadshot === false ? null : draft.photoSrc}
          label={draft.attribution || "quote photo"}
          pan={draft.pan}
          custom={draft.customPhoto}
          empty={!draft.photoSrc || draft.showHeadshot === false}
          vignette
          onPan={onPan}
          onUpload={onUpload}
          onPick={onPick}
        />
        <div className="qt-fade" aria-hidden="true" />
        <div className="qt-type-dim" aria-hidden="true" />
        {last ? (
          <p
            className={[
              "qt-lastname",
              long ? "is-long-quote" : lastSize <= 56 ? "is-xl" : lastSize <= 72 ? "is-long" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            {last}
          </p>
        ) : null}
        <p
          className="qt-mark"
          style={{ bottom: `calc(${bottom + quoteSize * 2.15} * var(--u))` }}
          aria-hidden="true"
        >
          “
        </p>
        {draft.showBa !== false ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        <textarea
          className="qt-quote"
          style={{
            bottom: `calc(${bottom} * var(--u))`,
            height: `calc(${quoteSize * Math.max(2.2, quoteLines * 1.12)} * var(--u))`,
          }}
          value={draft.quote}
          maxLength={QUOTE_MAX}
          spellCheck={false}
          aria-label="Pull quote"
          placeholder="THE QUOTE"
          onChange={(event) =>
            onQuoteChange(event.target.value.slice(0, QUOTE_MAX))
          }
        />
        <input
          className={["qt-source", hasSource ? "" : "is-empty"]
            .filter(Boolean)
            .join(" ")}
          value={draft.source}
          maxLength={SOURCE_MAX}
          spellCheck={false}
          aria-label="Quote source"
          aria-hidden={!hasSource}
          placeholder=""
          onChange={(event) =>
            onSourceChange(event.target.value.slice(0, SOURCE_MAX))
          }
        />
        {draft.showLetterGrade ? (
          <LetterGradePlate
            className="qt-grade"
            grade={parseLetterGrade(draft.letterGrade ?? DEFAULT_LETTER_GRADE)}
            reason={draft.letterGradeReason ?? ""}
            exporting={exporting}
            onGrade={(next) => onLetterGradeChange?.(next)}
            onReason={onLetterGradeReasonChange}
          />
        ) : null}
      </article>
    );
  },
);
