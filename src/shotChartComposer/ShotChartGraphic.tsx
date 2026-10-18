import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  composerNameLines,
  useComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { courtPoint, shotLine, splitShotChartTitle, type ShotChartDraft } from "./shotChartState";

interface ShotChartGraphicProps {
  draft: ShotChartDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  exporting?: boolean;
  story?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onPick: () => void;
}

export const ShotChartGraphic = forwardRef<HTMLElement, ShotChartGraphicProps>(
  function ShotChartGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      exporting = false,
      story = false,
      onBrandChange,
      onTitleChange,
      onPick,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const [nameStyle] = useComposerNameStyle();
    const nameLines = composerNameLines(
      draft.firstName,
      draft.lastName,
      nameStyle,
    );
    const titleLines = splitShotChartTitle(draft.title);
    const courtW = 500;
    const courtH = 470;

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
          "shc-board",
          exporting ? "is-exporting" : "",
          story ? "is-story" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ ["--u" as string]: `${unit}px` }}
        aria-label="Instagram shot chart graphic"
      >
        {draft.showBa ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        {draft.showBa ? null : (
          <input
            className="shc-brand"
            value={draft.brand}
            maxLength={24}
            spellCheck={false}
            aria-label="Brand label"
            onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
          />
        )}
        <div className="shc-title-block">
          <ComposerTitleField
            value={draft.title}
            lines={titleLines}
            ariaLabel="Shot chart title"
            inputClassName="shc-title-input"
            lineClassName="shc-title-line"
            onChange={onTitleChange}
          />
        </div>
        <button type="button" className="shc-player" onClick={onPick}>
          {nameLines.given ? (
            <span className="shc-player__given">
              {nameLines.given || "PICK"}
            </span>
          ) : null}
          <span className="shc-player__family">
            {nameLines.family || draft.lastName || "PLAYER"}
          </span>
          <span className="shc-player__line">
            {draft.gameLabel || "LAST GAME"} · {shotLine(draft.makes, draft.attempts)}
          </span>
        </button>
        <svg
          className="shc-court"
          viewBox={`0 0 ${courtW} ${courtH}`}
          role="img"
          aria-label="Half-court shot chart"
        >
          <rect x="4" y="4" width="492" height="462" fill="none" stroke="#fff" strokeWidth="4" />
          <line x1="4" y1="430" x2="496" y2="430" stroke="#fff" strokeWidth="3" />
          <circle cx="250" cy="430" r="75" fill="none" stroke="#fff" strokeWidth="3" />
          <path d="M175 430 V 280 H 325 V 430" fill="none" stroke="#fff" strokeWidth="3" />
          <circle cx="250" cy="280" r="60" fill="none" stroke="#fff" strokeWidth="3" />
          <circle cx="250" cy="418" r="12" fill="none" stroke="#facc15" strokeWidth="3" />
          <path
            d="M 33 430 L 33 250 A 217 217 0 0 1 467 250 L 467 430"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
          />
          {draft.shots.map((shot, index) => {
            const point = courtPoint(shot, courtW, courtH);
            return (
              <circle
                key={`${shot.x}-${shot.y}-${index}`}
                cx={point.x}
                cy={point.y}
                r={shot.made ? 7 : 6}
                fill={shot.made ? "#facc15" : "none"}
                stroke={shot.made ? "#facc15" : "#fb7185"}
                strokeWidth="2.4"
              />
            );
          })}
        </svg>
        <p className="shc-legend">
          <span className="is-make">MAKE</span>
          <span className="is-miss">MISS</span>
        </p>
      </article>
    );
  },
);
