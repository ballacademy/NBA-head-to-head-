import { forwardRef, useLayoutEffect, useRef, useState } from "react";
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
import {
  TOTW_STATS_FIELDS,
  TOTW_STATS_NOTE,
  totwStatsFieldValue,
  totwStatsHasRows,
  type TotwStatsRow,
  type TotwStatsSheet,
} from "./totwStatsExport";
import "./totwStatsComposer.css";

interface TotwStatsGraphicProps {
  sheet: TotwStatsSheet;
  look?: ComposerLook;
  purpleFlair?: boolean;
  showBa?: boolean;
  exporting?: boolean;
  onBrandChange?: (value: string) => void;
}

const PlayerCell = ({ row, alt }: { row: TotwStatsRow; alt: boolean }) => {
  const [nameStyle] = useComposerNameStyle();
  const names = composerNameLines(row.firstName, row.lastName, nameStyle);
  return (
    <div className={["tws-td", "tws-player", alt ? "is-alt" : ""].filter(Boolean).join(" ")}>
      <span className="tws-player__slot">{row.slot}</span>
      <span className="tws-player__names">
        <span className="tws-player__family">{names.family || row.name}</span>
        {names.given ? (
          <span className="tws-player__given">{names.given}</span>
        ) : null}
      </span>
    </div>
  );
};

export const TotwStatsGraphic = forwardRef<HTMLElement, TotwStatsGraphicProps>(
  function TotwStatsGraphic(
    {
      sheet,
      look = "white",
      purpleFlair = false,
      showBa = false,
      exporting = false,
      onBrandChange,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const showSections = sheet.sections.length > 1;
    const filled = totwStatsHasRows(sheet);

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
          "tws-board",
          exporting ? "is-exporting" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ ["--u" as string]: `${unit}px` }}
        aria-label="Team of the Week stats sheet"
      >
        {showBa ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : onBrandChange ? (
          <input
            className="tws-brand"
            value={sheet.brand}
            maxLength={24}
            spellCheck={false}
            aria-label="Brand mark"
            onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
          />
        ) : (
          <p className="tws-brand">{sheet.brand}</p>
        )}
        <h2 className="tws-title">{sheet.title}</h2>
        <p className="tws-week">{sheet.week.trim() || "WEEK"}</p>
        <p className="tws-note">{TOTW_STATS_NOTE}</p>
        {filled ? (
          <div className="tws-body">
            {sheet.sections.map((section) => (
              <section key={section.id} className="tws-section">
                {showSections ? (
                  <h3 className="tws-section__title">{section.caption}</h3>
                ) : null}
                <div className="tws-table" role="table">
                  <div className="tws-th is-player" role="columnheader">
                    Player
                  </div>
                  {TOTW_STATS_FIELDS.map((field) => (
                    <div key={field.key} className="tws-th" role="columnheader">
                      {field.label}
                    </div>
                  ))}
                  {section.rows.map((row, index) => {
                    const alt = index % 2 === 1;
                    return (
                      <div key={row.athleteId} role="row" style={{ display: "contents" }}>
                        <PlayerCell row={row} alt={alt} />
                        {TOTW_STATS_FIELDS.map((field) => (
                          <div
                            key={field.key}
                            className={["tws-td", alt ? "is-alt" : ""].filter(Boolean).join(" ")}
                            role="cell"
                          >
                            {totwStatsFieldValue(row, field.key)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="tws-empty">Fill the lineup to export these week stats.</p>
        )}
      </article>
    );
  },
);
