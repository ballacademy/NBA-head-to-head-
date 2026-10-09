import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  EMPTY_SLOT_COLOR,
  GRAPHIC_WIDTH,
  SLOT_COUNT,
  type RankingSlots,
} from "./rankingState";
import { getTeam } from "./teams";

interface StandingsGraphicProps {
  brand: string;
  title: string;
  subtitle: string;
  slots: RankingSlots;
  activeIndex: number | null;
  exporting?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onSelectSlot: (index: number) => void;
}

export const StandingsGraphic = forwardRef<HTMLElement, StandingsGraphicProps>(
  function StandingsGraphic(
    {
      brand,
      title,
      subtitle,
      slots,
      activeIndex,
      exporting = false,
      onBrandChange,
      onTitleChange,
      onSubtitleChange,
      onSelectSlot,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);

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
        className={exporting ? "ig-board is-exporting" : "ig-board"}
        style={{ ["--u" as string]: `${unit}px` }}
        aria-label="Instagram standings graphic"
      >
        <header className="ig-header">
          <input
            className="ig-brand"
            value={brand}
            maxLength={24}
            spellCheck={false}
            aria-label="Brand label"
            onChange={(event) => onBrandChange(event.target.value.toUpperCase())}
          />
          <div className="ig-banner">
            <svg
              className="ig-banner__svg"
              viewBox="0 0 1200 200"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id="ig-carbon"
                  width="4"
                  height="4"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="4" height="4" fill="#050505" />
                  <rect width="1" height="4" fill="rgba(255,255,255,0.045)" />
                  <rect width="4" height="1" fill="rgba(255,255,255,0.03)" />
                </pattern>
              </defs>
              <path
                d="M 18 8 H 1182 V 118 H 845 V 192 H 355 V 118 H 18 Z"
                fill="url(#ig-carbon)"
                stroke="#fff"
                strokeWidth="7"
                strokeLinejoin="miter"
              />
            </svg>
            <input
              className="ig-banner__title"
              value={title}
              maxLength={36}
              spellCheck={false}
              aria-label="Banner title"
              onChange={(event) => onTitleChange(event.target.value.toUpperCase())}
            />
            <input
              className="ig-banner__sub"
              value={subtitle}
              maxLength={28}
              spellCheck={false}
              aria-label="Conference subtitle"
              onChange={(event) =>
                onSubtitleChange(event.target.value.toUpperCase())
              }
            />
          </div>
        </header>
        <div className="ig-grid">
          {Array.from({ length: SLOT_COUNT }, (_, index) => {
            const team = getTeam(slots[index] ?? null);
            const rank = index + 1;
            return (
              <button
                key={rank}
                type="button"
                className={[
                  "ig-slot",
                  team ? "ig-slot--filled" : "",
                  activeIndex === index ? "ig-slot--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  team
                    ? {
                        ["--cell-from" as string]: team.cellFrom,
                        ["--cell-to" as string]: team.cellTo,
                      }
                    : { background: EMPTY_SLOT_COLOR }
                }
                onClick={() => onSelectSlot(index)}
                aria-label={
                  team
                    ? `Rank ${rank}, ${team.name}. Change team`
                    : `Rank ${rank}, empty. Pick a team`
                }
              >
                <span className="ig-slot__rank">{rank}</span>
                {team ? (
                  <img
                    className="ig-slot__logo"
                    src={team.logoSrc}
                    alt=""
                    draggable={false}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </article>
    );
  },
);
