import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  formatComposerName,
  useComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import { teamLogoSrc } from "../everyTeamComposer/historicalRosters";
import { leaderRowName, type LeaderRow } from "../leaderboardComposer/leaderboardFill";
import {
  leaderPlateAccent,
  leaderPlateFill,
} from "../leaderboardComposer/leaderPlate";
import { dualRanksLayout } from "./dualRanksLayout";
import {
  dualExportColumns,
  type DualRanksDraft,
  type DualRanksLayout,
} from "./dualRanksState";
import type { PhotoPan } from "../playerOfTheDayComposer/playerOfTheDayState";

interface DualRanksGraphicProps {
  draft: DualRanksDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  exporting?: boolean;
  story?: boolean;
  square?: boolean;
  onHeaderChange: (side: "left" | "right", value: string) => void;
  onRowChange: (side: "left" | "right", index: number, patch: Partial<LeaderRow>) => void;
  onPan: (pan: PhotoPan) => void;
  onUpload: (dataUrl: string) => void;
  onPick: () => void;
}

const u = (value: number) => `calc(${value} * var(--u))`;

const boxStyle = (rect: { x: number; y: number; w: number; h: number }) =>
  ({
    left: u(rect.x),
    top: u(rect.y),
    width: u(rect.w),
    height: u(rect.h),
  }) as const;

const dualKind = (
  layout: DualRanksLayout,
  story: boolean,
  square: boolean,
): DualRanksLayout => {
  if (layout === "well") {
    return "well";
  }
  if (story || square || layout === "top") {
    return "top";
  }
  return "side";
};

const Column = ({
  header,
  entries,
  featuredId,
  season,
  aria,
  onHeader,
  onRow,
  nameStyle,
  namePlates,
}: {
  header: string;
  entries: Array<{ row: LeaderRow; index: number }>;
  featuredId: string | null;
  season: string;
  aria: string;
  onHeader: (value: string) => void;
  onRow: (index: number, patch: Partial<LeaderRow>) => void;
  nameStyle: "full" | "last" | "initial";
  namePlates: boolean;
}) => (
  <div className="dr-col">
    <input
      className="dr-head"
      value={header}
      aria-label={aria}
      spellCheck={false}
      onChange={(event) => onHeader(event.target.value)}
    />
    <ol className="dr-rows">
      {entries.map((entry, index) => {
        const row = entry.row;
        const logo = row.teamId
          ? getTeam(row.teamId)?.logoSrc ?? teamLogoSrc(row.teamId, season)
          : null;
        const featured = Boolean(featuredId && row.playerId === featuredId);
        return (
          <li
            key={`${aria}-${entry.index}`}
            className={[
              "dr-row",
              index === 0 ? "is-gold" : "",
              featured ? "is-feature" : "",
              namePlates ? "is-plate" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={
              namePlates
                ? ({
                    ["--team-fill" as string]: leaderPlateFill(row.teamId),
                    ["--team-accent" as string]: leaderPlateAccent(row.teamId),
                  } as CSSProperties)
                : undefined
            }
          >
            {namePlates && logo ? (
              <img className="dr-row__mark" src={logo} alt="" />
            ) : null}
            <span className="dr-rank">{index + 1}</span>
            {logo ? <img className="dr-logo" src={logo} alt="" /> : <span className="dr-logo" />}
            <input
              className="dr-name"
              value={
                formatComposerName(row.firstName, row.lastName, nameStyle) ||
                leaderRowName(row)
              }
              aria-label={`${aria} ${index + 1} name`}
              spellCheck={false}
              onChange={(event) => {
                const bits = event.target.value.split(/\s+/);
                onRow(entry.index, {
                  firstName: bits.slice(0, -1).join(" "),
                  lastName: bits.at(-1) ?? "",
                });
              }}
            />
            <input
              className="dr-value"
              value={row.value}
              aria-label={`${aria} ${index + 1} value`}
              spellCheck={false}
              onChange={(event) =>
                onRow(entry.index, { value: event.target.value })
              }
            />
          </li>
        );
      })}
    </ol>
  </div>
);

export const DualRanksGraphic = forwardRef<HTMLElement, DualRanksGraphicProps>(
  function DualRanksGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      photoGrade = false,
      exporting = false,
      story = false,
      square = false,
      onHeaderChange,
      onRowChange,
      onPan,
      onUpload,
      onPick,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(1);
    const [nameStyle] = useComposerNameStyle();
    const cols = dualExportColumns(draft, true, square);
    const boardH = story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
    const colCount = (cols.hideLeft ? 0 : 1) + (cols.hideRight ? 0 : 1);
    const rowCount = Math.max(cols.left.length, cols.right.length);
    const layout = dualRanksLayout(
      rowCount,
      dualKind(draft.layout, story, square),
      Math.max(1, colCount),
      boardH,
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

    const layoutClass =
      draft.layout === "top" ? "is-top" : draft.layout === "well" ? "is-well" : "";

    return (
      <article
        ref={setRefs}
        className={[
          "dr-board",
          draft.namePlates === true ? "is-plates" : "",
          layoutClass,
          story ? "is-story" : "",
          square ? "is-square" : "",
          cols.hideRight ? "is-hide-right" : "",
          cols.hideLeft ? "is-hide-left" : "",
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
            ["--dr-row-h" as string]: String(layout.rowH || 52),
          } as CSSProperties
        }
        aria-label="Instagram dual ranks graphic"
      >
        <div className="dr-photo-wrap" style={boxStyle(layout.photo)}>
          <PhotoFrame
            src={draft.photoSrc}
            label="featured player"
            pan={draft.pan}
            custom={draft.customPhoto}
            empty={!draft.photoSrc}
            vignette
            onPan={onPan}
            onUpload={onUpload}
            onPick={onPick}
          />
          {draft.photoSrc ? null : (
            <p className="dr-empty-title">
              {draft.leftHeader} · {draft.rightHeader}
            </p>
          )}
        </div>
        <div className="dr-cols" style={boxStyle(layout.pane)}>
          {cols.hideLeft ? null : (
            <Column
              header={draft.leftHeader}
              entries={cols.leftEntries}
              featuredId={draft.featuredPlayerId}
              season={draft.season}
              aria="Left board"
              onHeader={(value) => onHeaderChange("left", value)}
              onRow={(index, patch) => onRowChange("left", index, patch)}
              nameStyle={nameStyle}
              namePlates={draft.namePlates === true}
            />
          )}
          {cols.hideRight ? null : (
            <Column
              header={draft.rightHeader}
              entries={cols.rightEntries}
              featuredId={draft.featuredPlayerId}
              season={draft.season}
              aria="Right board"
              onHeader={(value) => onHeaderChange("right", value)}
              onRow={(index, patch) => onRowChange("right", index, patch)}
              nameStyle={nameStyle}
              namePlates={draft.namePlates === true}
            />
          )}
        </div>
        {draft.showBa !== false ? (
          <img className="composer-ba" src="/ba-logo-circled.png" alt="" aria-hidden="true" />
        ) : null}
      </article>
    );
  },
);
