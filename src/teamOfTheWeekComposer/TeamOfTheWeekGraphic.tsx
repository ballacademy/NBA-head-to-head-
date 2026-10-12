import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  splitTotwTitle,
  TOTW_STRIP_COUNT,
  type PhotoPan,
  type TotwStrip,
} from "./teamOfTheWeekState";

interface TeamOfTheWeekGraphicProps {
  brand: string;
  title: string;
  week: string;
  strips: TotwStrip[];
  look?: ComposerLook;
  showBa?: boolean;
  exporting?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onWeekChange: (value: string) => void;
  onPick: (index: number) => void;
  onPan: (index: number, pan: PhotoPan) => void;
  onUpload: (index: number, dataUrl: string) => void;
}

export const TeamOfTheWeekGraphic = forwardRef<
  HTMLElement,
  TeamOfTheWeekGraphicProps
>(function TeamOfTheWeekGraphic(
  {
    brand,
    title,
    week,
    strips,
    look = "white",
    showBa = false,
    exporting = false,
    onBrandChange,
    onTitleChange,
    onWeekChange,
    onPick,
    onPan,
    onUpload,
  },
  ref,
) {
  const localRef = useRef<HTMLElement | null>(null);
  const [unit, setUnit] = useState(0.4);
  const titleLines = splitTotwTitle(title);

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
        "totw-board",
        exporting ? "is-exporting" : "",
        composerLookClass(look),
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--u" as string]: `${unit}px` } as React.CSSProperties}
      aria-label="Instagram team of the week graphic"
    >
      {showBa ? (
        <img
          className="composer-ba"
          src="/ba-logo-circled.png"
          alt=""
          aria-hidden="true"
        />
      ) : null}
      <header className="totw-header">
        <input
          className="totw-brand"
          value={brand}
          maxLength={24}
          spellCheck={false}
          aria-label="Brand label"
          onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
        />
      </header>
      <div className="totw-strips">
        {Array.from({ length: TOTW_STRIP_COUNT }, (_, index) => {
          const strip = strips[index]!;
          const empty = !strip.photoSrc;
          const label = strip.lastName || `player ${index + 1}`;
          return (
            <section
              key={`totw-strip-${index}`}
              className="totw-strip"
              aria-label={`Player strip ${index + 1}`}
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
            </section>
          );
        })}
      </div>
      <footer className="totw-footer">
        <div className="totw-title-plate">
          <div className="totw-title-block">
            <ComposerTitleField
              value={title}
              lines={titleLines}
              ariaLabel="Team of the week title"
              inputClassName="totw-title-input"
              lineClassName="totw-title-line"
              onChange={onTitleChange}
            />
          </div>
        </div>
        <input
          className="totw-week-notch"
          value={week}
          maxLength={32}
          spellCheck={false}
          aria-label="Week or date line"
          onChange={(event) =>
            onWeekChange(event.target.value.slice(0, 32))
          }
        />
      </footer>
    </article>
  );
});
