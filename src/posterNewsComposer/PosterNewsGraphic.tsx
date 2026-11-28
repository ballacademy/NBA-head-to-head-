import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { LetterGradePlate } from "../instagramComposer/LetterGradePlate";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  DEFAULT_LETTER_GRADE,
  parseLetterGrade,
  type LetterGrade,
} from "../lib/letterGrade";
import {
  POSTER_KICKER_MAX,
  POSTER_LINE_MAX,
  type PosterNewsDraft,
} from "./posterNewsState";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";

interface PosterNewsGraphicProps {
  draft: PosterNewsDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  exporting?: boolean;
  onKickerChange: (value: string) => void;
  onGivenChange: (value: string) => void;
  onFamilyChange: (value: string) => void;
  onLineChange: (key: "line1" | "line2" | "line3", value: string) => void;
  onDateChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onPick: () => void;
  onLetterGradeChange?: (grade: LetterGrade) => void;
  onLetterGradeReasonChange?: (reason: string) => void;
}

export const PosterNewsGraphic = forwardRef<HTMLElement, PosterNewsGraphicProps>(
  function PosterNewsGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      photoGrade = false,
      exporting = false,
      onKickerChange,
      onGivenChange,
      onFamilyChange,
      onLineChange,
      onDateChange,
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

    const name = `${draft.given} ${draft.family}`.trim() || "poster photo";

    return (
      <article
        ref={setRefs}
        className={[
          "pn-board",
          draft.nameMode === "even" ? "is-even" : "",
          exporting ? "is-exporting" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
          composerGradeClass(photoGrade),
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ ["--u" as string]: `${unit}px` } as React.CSSProperties}
        aria-label="Instagram poster news graphic"
      >
        <PhotoFrame
          src={draft.photoSrc}
          label={name}
          pan={draft.pan}
          custom={draft.customPhoto}
          empty={!draft.photoSrc}
          vignette
          onPan={onPan}
          onUpload={onUpload}
          onPick={onPick}
        />
        <div className="pn-fade" aria-hidden="true" />
        {draft.showBa !== false ? (
          <img className="composer-ba" src="/ba-logo-circled.png" alt="" aria-hidden="true" />
        ) : null}
        <div className="pn-type">
          <div className="pn-kicker-row">
            <input
              className="pn-kicker"
              value={draft.kicker}
              maxLength={POSTER_KICKER_MAX}
              aria-label="News kicker"
              spellCheck={false}
              onChange={(event) => onKickerChange(event.target.value)}
            />
            {draft.showDatePip ? (
              <input
                className="pn-date"
                value={draft.datePip}
                aria-label="Date pip"
                spellCheck={false}
                placeholder="OCT 27"
                onChange={(event) => onDateChange(event.target.value)}
              />
            ) : null}
          </div>
          {draft.nameMode === "name-stack" ? (
            <>
              <input
                className="pn-given"
                value={draft.given}
                maxLength={POSTER_LINE_MAX}
                aria-label="Subject first name"
                spellCheck={false}
                placeholder="FIRST"
                onChange={(event) => onGivenChange(event.target.value)}
              />
              <input
                className="pn-family"
                value={draft.family}
                maxLength={POSTER_LINE_MAX}
                aria-label="Subject last name"
                spellCheck={false}
                placeholder="LAST"
                onChange={(event) => onFamilyChange(event.target.value)}
              />
            </>
          ) : null}
          <input
            className="pn-line"
            value={draft.line1}
            maxLength={POSTER_LINE_MAX}
            aria-label="Headline line 1"
            spellCheck={false}
            placeholder="HEADLINE"
            onChange={(event) => onLineChange("line1", event.target.value)}
          />
          <input
            className="pn-line"
            value={draft.line2}
            maxLength={POSTER_LINE_MAX}
            aria-label="Headline line 2"
            spellCheck={false}
            onChange={(event) => onLineChange("line2", event.target.value)}
          />
          <input
            className="pn-line"
            value={draft.line3}
            maxLength={POSTER_LINE_MAX}
            aria-label="Headline line 3"
            spellCheck={false}
            onChange={(event) => onLineChange("line3", event.target.value)}
          />
          {draft.source.trim() ? (
            <input
              className="pn-source"
              value={draft.source}
              aria-label="Source"
              spellCheck={false}
              onChange={(event) => onSourceChange(event.target.value)}
            />
          ) : null}
        </div>
        {draft.showLetterGrade ? (
          <div className="pn-grade">
            <LetterGradePlate
              grade={parseLetterGrade(draft.letterGrade ?? DEFAULT_LETTER_GRADE)}
              reason={draft.letterGradeReason ?? ""}
              exporting={exporting}
              onGrade={onLetterGradeChange ?? (() => undefined)}
              onReason={onLetterGradeReasonChange}
            />
          </div>
        ) : null}
      </article>
    );
  },
);
