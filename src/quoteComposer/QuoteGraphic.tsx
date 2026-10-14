import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { getTeamColors } from "../lib/teamColors";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { ATTRIB_MAX, QUOTE_MAX, type QuoteDraft } from "./quoteState";
import { quoteGhostName } from "./quoteLayout";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";

interface QuoteGraphicProps {
  draft: QuoteDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  exporting?: boolean;
  onQuoteChange: (value: string) => void;
  onAttributionChange: (value: string) => void;
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
      exporting = false,
      onQuoteChange,
      onAttributionChange,
      onPan,
      onUpload,
      onPick,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(1);
    const ghost = quoteGhostName(draft.attribution);
    const teamColor = draft.teamId
      ? getTeamColors(draft.teamId).primary
      : null;

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
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--team-color" as string]: teamColor ?? "transparent",
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
        {teamColor ? (
          <>
            <span className="qt-rail is-left" aria-hidden="true" />
            <span className="qt-rail is-right" aria-hidden="true" />
          </>
        ) : null}
        {ghost ? (
          <p className="qt-ghost" aria-hidden="true">
            {ghost}
          </p>
        ) : null}
        <p className="qt-mark" aria-hidden="true">
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
          value={draft.quote}
          maxLength={QUOTE_MAX}
          spellCheck={false}
          aria-label="Pull quote"
          onChange={(event) =>
            onQuoteChange(event.target.value.slice(0, QUOTE_MAX))
          }
        />
        <div className="qt-attr-plate">
          <input
            className="qt-attr"
            value={draft.attribution}
            maxLength={ATTRIB_MAX}
            placeholder="NAME"
            aria-label="Quote attribution"
            onChange={(event) =>
              onAttributionChange(event.target.value.slice(0, ATTRIB_MAX))
            }
          />
        </div>
      </article>
    );
  },
);
