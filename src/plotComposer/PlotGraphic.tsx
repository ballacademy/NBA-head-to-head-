import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeamGlowColor } from "../lib/teamColors";
import type { EveryTeamStatMetric } from "../everyTeamComposer/historicalRosters";
import {
  axisFromValues,
  placePlotPoints,
  plotRectFor,
  formatPlotTick,
  shouldDrawHeadshot,
} from "./plotLayout";
import {
  plotKicker,
  plotMetricLabel,
  splitPlotTitle,
  type PlotPoint,
  type PlotQuadrants,
  type PlotSubject,
} from "./plotState";

interface PlotGraphicProps {
  brand: string;
  title: string;
  subject: PlotSubject;
  xMetric: EveryTeamStatMetric;
  yMetric: EveryTeamStatMetric;
  points: PlotPoint[];
  highlightedIds?: string[];
  quadrants?: PlotQuadrants;
  look?: ComposerLook;
  purpleFlair?: boolean;
  showBa?: boolean;
  showNames?: boolean;
  exporting?: boolean;
  story?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
}

export const PlotGraphic = forwardRef<HTMLElement, PlotGraphicProps>(
  function PlotGraphic(
    {
      brand,
      title,
      subject,
      xMetric,
      yMetric,
      points,
      highlightedIds = [],
      quadrants,
      look = "white",
      purpleFlair = false,
      showBa = true,
      showNames = true,
      exporting = false,
      story = false,
      onBrandChange,
      onTitleChange,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const boardH = story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
    const plot = plotRectFor(boardH);
    const xAxis = useMemo(
      () => axisFromValues(points.map((point) => point.x), xMetric),
      [points, xMetric],
    );
    const yAxis = useMemo(
      () => axisFromValues(points.map((point) => point.y), yMetric),
      [points, yMetric],
    );
    const placed = useMemo(
      () =>
        placePlotPoints(
          points.map((point) => ({
            id: point.id,
            x: point.x,
            y: point.y,
            label: point.shortLabel || point.label,
            kind: point.kind,
            size: point.size,
          })),
          xAxis,
          yAxis,
          boardH,
          showNames,
          highlightedIds,
        ),
      [points, xAxis, yAxis, boardH, showNames, highlightedIds],
    );

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
      const sync = () => setUnit(node.offsetWidth / GRAPHIC_WIDTH);
      sync();
      const observer = new ResizeObserver(sync);
      observer.observe(node);
      return () => observer.disconnect();
    }, []);

    const titleLines = splitPlotTitle(title);
    const xLabel = plotMetricLabel(xMetric);
    const yLabel = plotMetricLabel(yMetric);
    const empty = points.length === 0;
    const headshots = shouldDrawHeadshot(subject === "teams" ? "team" : "player", points.length);

    return (
      <article
        ref={setRefs}
        className={[
          "plt-board",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
          story ? "is-story" : "",
          exporting ? "is-exporting" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--plot-x" as string]: String(plot.x),
            ["--plot-y" as string]: String(plot.y),
            ["--plot-w" as string]: String(plot.w),
            ["--plot-h" as string]: String(plot.h),
            height: story ? STORY_DESIGN_HEIGHT : undefined,
          } as React.CSSProperties
        }
        aria-label="Instagram plot graphic"
      >
        {showBa ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        {showBa ? null : (
          <input
            className="plt-brand"
            value={brand}
            maxLength={24}
            spellCheck={false}
            aria-label="Brand label"
            onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
          />
        )}
        <div className="plt-title-block">
          <ComposerTitleField
            value={title}
            lines={titleLines}
            ariaLabel="Plot title"
            inputClassName="plt-title-input"
            lineClassName="plt-title-line"
            onChange={onTitleChange}
          />
        </div>
        <p className="plt-kicker">{plotKicker(subject, points.length, !empty)}</p>
        <div className="plt-plot">
          <svg className="plt-grid" viewBox={`0 0 ${plot.w} ${plot.h}`} aria-hidden="true">
            {xAxis.ticks.map((tick) => {
              const x = ((tick - xAxis.min) / (xAxis.max - xAxis.min || 1)) * plot.w;
              return (
                <g key={`x-${tick}`}>
                  <line className="plt-gridline" x1={x} y1={0} x2={x} y2={plot.h} />
                  <text
                    className="plt-tick"
                    x={x}
                    y={plot.h + 18}
                    textAnchor="middle"
                    fontSize={13}
                  >
                    {formatPlotTick(tick, xMetric)}
                  </text>
                </g>
              );
            })}
            {yAxis.ticks.map((tick) => {
              const y =
                (1 - (tick - yAxis.min) / (yAxis.max - yAxis.min || 1)) * plot.h;
              return (
                <g key={`y-${tick}`}>
                  <line className="plt-gridline" x1={0} y1={y} x2={plot.w} y2={y} />
                  <text
                    className="plt-tick"
                    x={-10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={13}
                  >
                    {formatPlotTick(tick, yMetric)}
                  </text>
                </g>
              );
            })}
            <line className="plt-axis" x1={0} y1={plot.h} x2={plot.w} y2={plot.h} />
            <line className="plt-axis" x1={0} y1={0} x2={0} y2={plot.h} />
          </svg>
          <p className="plt-axis-title is-x">{xLabel}</p>
          <p className="plt-axis-title is-y">{yLabel}</p>
          {quadrants?.tl ? (
            <p className="plt-quad is-tl">{quadrants.tl}</p>
          ) : null}
          {quadrants?.tr ? (
            <p className="plt-quad is-tr">{quadrants.tr}</p>
          ) : null}
          {quadrants?.bl ? (
            <p className="plt-quad is-bl">{quadrants.bl}</p>
          ) : null}
          {quadrants?.br ? (
            <p className="plt-quad is-br">{quadrants.br}</p>
          ) : null}
          {empty ? (
            <p className="plt-empty">Empty — populate to plot</p>
          ) : (
            placed.map((mark) => {
              const point = points.find((row) => row.id === mark.id);
              if (!point) {
                return null;
              }
              return (
                <div key={point.id}>
                  <span
                    className={[
                      "plt-mark",
                      highlightedIds.includes(point.id) ? "is-hot" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      {
                        left: `calc(${mark.px - plot.x} * var(--u))`,
                        top: `calc(${mark.py - plot.y} * var(--u))`,
                        ["--mark" as string]: String(mark.mark),
                      } as React.CSSProperties
                    }
                    aria-label={`${point.label} ${xLabel} ${point.x} ${yLabel} ${point.y}`}
                  >
                    {point.kind === "team" && point.photoSrc ? (
                      <span className="plt-logo">
                        <TeamLogo src={point.photoSrc} label={point.label} />
                      </span>
                    ) : headshots && point.photoSrc ? (
                      <span className="plt-face">
                        <img src={point.photoSrc} alt="" />
                      </span>
                    ) : (
                      <span
                        className="plt-dot"
                        style={{ background: getTeamGlowColor(point.teamId) }}
                      />
                    )}
                  </span>
                  {mark.showLabel ? (
                    <p
                      className="plt-label"
                      style={{
                        left: `calc(${mark.lx - plot.x} * var(--u))`,
                        top: `calc(${mark.ly - plot.y} * var(--u))`,
                      }}
                    >
                      {mark.label}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </article>
    );
  },
);
