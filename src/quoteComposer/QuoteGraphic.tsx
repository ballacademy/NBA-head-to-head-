import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { getTeamColors } from "../lib/teamColors";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { QUOTE_MAX, SOURCE_MAX, type QuoteDraft } from "./quoteState";
import {
  formatQuoteSource,
  isLongQuote,
  quoteBottom,
  quoteLastName,
  quoteLastNameSize,
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
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(1);
    const last = quoteLastName(draft.attribution);
    const long = isLongQuote(draft.quote);
    const lastSize = quoteLastNameSize(last, draft.quote);
    const quoteSize = quoteTypeSize(draft.quote);
    const source = formatQuoteSource(draft.source);
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
          className={["qt-quote", long ? "is-long" : ""].filter(Boolean).join(" ")}
          style={{
            bottom: `calc(${bottom} * var(--u))`,
            height: `calc(${quoteSize * 2.2} * var(--u))`,
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
          className="qt-source"
          value={draft.source}
          maxLength={SOURCE_MAX}
          spellCheck={false}
          aria-label="Quote source"
          placeholder={source ? undefined : "SOURCE (OPTIONAL)"}
          onChange={(event) =>
            onSourceChange(event.target.value.slice(0, SOURCE_MAX))
          }
        />
      </article>
    );
  },
);
