import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  BANNER_SHAPE,
  BANNER_VIEW,
  SUB_BAND,
  TITLE_BAND,
  brandEmTop,
  notchFromMeasuredWidth,
} from "./bannerLayout";
import {
  EMPTY_SLOT_COLOR,
  GRAPHIC_WIDTH,
  SLOT_COUNT,
  type RankingSlots,
} from "./rankingState";
import { TeamLogo } from "./TeamLogo";
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

const bannerPath = (notchLeft: number, notchRight: number) => {
  const right = BANNER_VIEW.width - BANNER_SHAPE.insetX;
  return [
    `M ${BANNER_SHAPE.insetX} ${BANNER_SHAPE.top}`,
    `H ${right}`,
    `V ${BANNER_SHAPE.waist}`,
    `H ${notchRight.toFixed(1)}`,
    `V ${BANNER_SHAPE.bottom}`,
    `H ${notchLeft.toFixed(1)}`,
    `V ${BANNER_SHAPE.waist}`,
    `H ${BANNER_SHAPE.insetX}`,
    "Z",
  ].join(" ");
};

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
    const bannerRef = useRef<HTMLDivElement | null>(null);
    const measureRef = useRef<HTMLSpanElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const [notch, setNotch] = useState({ left: 360, right: 840 });

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

    useLayoutEffect(() => {
      const banner = bannerRef.current;
      const measure = measureRef.current;
      if (!banner || !measure) {
        return;
      }
      const sync = () => {
        const bannerW = banner.clientWidth;
        if (bannerW < 8) {
          return;
        }
        setNotch(notchFromMeasuredWidth(measure.offsetWidth, bannerW));
      };
      sync();
      void document.fonts?.ready.then(sync);
      if (typeof ResizeObserver === "undefined") {
        return;
      }
      const observer = new ResizeObserver(sync);
      observer.observe(banner);
      observer.observe(measure);
      return () => observer.disconnect();
    }, [subtitle, unit]);

    return (
      <article
        ref={setRefs}
        className={exporting ? "ig-board is-exporting" : "ig-board"}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--brand-top" as string]: `${brandEmTop(unit)}px`,
          } as React.CSSProperties
        }
        aria-label="Instagram standings graphic"
      >
        <header className="ig-header">
          <div className="ig-brand-slot" aria-hidden="true" />
          <input
            className="ig-brand"
            value={brand}
            maxLength={24}
            spellCheck={false}
            aria-label="Brand label"
            onChange={(event) => onBrandChange(event.target.value.toUpperCase())}
          />
          <div className="ig-banner" ref={bannerRef}>
            <svg
              className="ig-banner__svg"
              viewBox={`0 0 ${BANNER_VIEW.width} ${BANNER_VIEW.height}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d={bannerPath(notch.left, notch.right)}
                fill="none"
                stroke="#fff"
                strokeWidth="7"
                strokeLinejoin="miter"
              />
            </svg>
            <div
              className="ig-banner__title-slot"
              style={{
                top: `${TITLE_BAND.topFrac * 100}%`,
                height: `${TITLE_BAND.heightFrac * 100}%`,
              }}
            >
              <input
                className="ig-banner__title"
                value={title}
                maxLength={36}
                spellCheck={false}
                aria-label="Banner title"
                onChange={(event) => onTitleChange(event.target.value.toUpperCase())}
              />
            </div>
            <span ref={measureRef} className="ig-banner__sub-measure" aria-hidden="true">
              {subtitle || "\u00a0"}
            </span>
            <div
              className="ig-banner__sub-slot"
              style={{
                top: `${SUB_BAND.topFrac * 100}%`,
                height: `${SUB_BAND.heightFrac * 100}%`,
                left: `${(notch.left / BANNER_VIEW.width) * 100}%`,
                width: `${((notch.right - notch.left) / BANNER_VIEW.width) * 100}%`,
              }}
            >
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
                {team ? <TeamLogo src={team.logoSrc} label={team.id} /> : null}
              </button>
            );
          })}
        </div>
      </article>
    );
  },
);
