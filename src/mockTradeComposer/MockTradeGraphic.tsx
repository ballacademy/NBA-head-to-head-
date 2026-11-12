import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import {
  composerSlotClass,
  useComposerSlotSwap,
} from "../instagramComposer/composerSlotSwap";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { composerGradeClass } from "../instagramComposer/photoGrade";
import { PlayerNameFade } from "../instagramComposer/PlayerNameFade";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { LetterGradePlate } from "../instagramComposer/LetterGradePlate";
import { headlinePanelHex } from "../headlineComposer/headlineLayout";
import {
  DEFAULT_LETTER_GRADE,
  parseLetterGrade,
  type LetterGrade,
} from "../lib/letterGrade";
import { PhotoFrame } from "../playerOfTheDayComposer/PhotoFrame";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { salaryLabelForPlayer } from "../lib/playerSalaries";
import { getTeam } from "../standingsComposer/teams";
import { mockTradeLayout } from "./mockTradeLayout";
import {
  MOCK_TRADE_TITLE_MAX,
  compactMockTradeDraft,
  mockTradePickLabel,
  mockTradeSalaryTotalsLabel,
  mockTradePlayerSlot,
  mockTradeTeamCount,
  type MockTradeDraft,
  type PhotoPan,
} from "./mockTradeState";

interface MockTradeGraphicProps {
  draft: MockTradeDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  exporting?: boolean;
  story?: boolean;
  onTitleChange: (value: string) => void;
  onPlayerFirstNameChange: (
    side: number,
    player: number,
    firstName: string,
  ) => void;
  onPlayerLastNameChange: (
    side: number,
    player: number,
    lastName: string,
  ) => void;
  onPickPlayer: (side: number, player: number) => void;
  onActivate?: (side: number, player: number) => void;
  onPan: (side: number, player: number, pan: PhotoPan) => void;
  onUpload: (side: number, player: number, dataUrl: string) => void;
  onSwap?: (from: number, to: number) => void;
  onLetterGradeChange?: (grade: LetterGrade) => void;
  onLetterGradeReasonChange?: (reason: string) => void;
}

const u = (value: number) => `calc(${value} * var(--u))`;

const boxStyle = (rect: { x: number; y: number; w: number; h: number }) =>
  ({
    left: u(rect.x),
    top: u(rect.y),
    width: u(rect.w),
    height: u(rect.h),
  }) as const;

export const MockTradeGraphic = forwardRef<HTMLElement, MockTradeGraphicProps>(
  function MockTradeGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      photoGrade = false,
      exporting = false,
      story = false,
      onTitleChange,
      onPlayerFirstNameChange,
      onPlayerLastNameChange,
      onPickPlayer,
      onActivate,
      onPan,
      onUpload,
      onSwap,
      onLetterGradeChange,
      onLetterGradeReasonChange,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const slotSwap = useComposerSlotSwap({
      enabled: !exporting,
      onSwap,
    });
    const board = exporting ? compactMockTradeDraft(draft) : draft;
    const teamCount = mockTradeTeamCount(board);
    const layout = mockTradeLayout(
      teamCount,
      board.sides.map((side) => side.players.length),
      board.sides.map((side) => side.picks.length),
      story,
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

    return (
      <article
        ref={setRefs}
        className={[
          "mt-board",
          exporting ? "is-exporting" : "",
          story ? "is-story" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
          composerGradeClass(photoGrade),
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ ["--u" as string]: `${unit}px` }}
        aria-label="Instagram mock trade graphic"
      >
        {layout.columns.map((column, sideIndex) => {
          const side = board.sides[sideIndex]!;
          const team = getTeam(side.teamId);
          const local = (rect: { x: number; y: number; w: number; h: number }) => ({
            x: rect.x - column.x,
            y: rect.y - column.y,
            w: rect.w,
            h: rect.h,
          });
          const hero = side.players.length <= 2;
          return (
            <section
              key={`mt-col-${sideIndex}`}
              className="mt-col"
              style={{
                ...boxStyle(column),
                ["--col-fill" as string]: headlinePanelHex(side.teamId),
              }}
              aria-label={`Team ${sideIndex + 1} gets`}
            >
              <div className="mt-logo" style={boxStyle(local(column.logo))}>
                {team ? (
                  <TeamLogo
                    src={team.logoSrc}
                    label={team.name}
                    shadow={18}
                    fitX={0.82}
                    fitY={0.82}
                  />
                ) : (
                  <span className="mt-team-fallback">{`TEAM ${sideIndex + 1}`}</span>
                )}
              </div>
              {draft.showSalaries ? (
                <p className="mt-cap">{mockTradeSalaryTotalsLabel(board, sideIndex)}</p>
              ) : null}
              {column.players.map((slot, playerIndex) => {
                const person = side.players[playerIndex]!;
                const slotIndex = mockTradePlayerSlot(sideIndex, playerIndex);
                const empty = !person.photoSrc;
                return (
                  <div
                    key={`mt-player-${sideIndex}-${playerIndex}`}
                    className={[
                      "mt-player",
                      hero ? "is-hero" : "is-grid",
                      composerSlotClass(
                        slotIndex,
                        slotSwap.draggingFrom,
                        slotSwap.dropIndex,
                      ),
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-composer-slot={slotIndex}
                    style={boxStyle(local(slot.photo))}
                    onPointerDown={(event) => {
                      onActivate?.(sideIndex, playerIndex);
                      slotSwap.startDrag(slotIndex, event);
                    }}
                  >
                    <PhotoFrame
                      src={person.photoSrc}
                      label={person.lastName || `player ${playerIndex + 1}`}
                      pan={person.pan}
                      custom={person.customPhoto}
                      empty={empty}
                      vignette
                      pickLabel="Pick player"
                      changeLabel="Change player"
                      slotSwapEnabled={!exporting && Boolean(onSwap)}
                      onActivate={() => onActivate?.(sideIndex, playerIndex)}
                      onPan={(pan) => onPan(sideIndex, playerIndex, pan)}
                      onUpload={(dataUrl) =>
                        onUpload(sideIndex, playerIndex, dataUrl)
                      }
                      onPick={() => onPickPlayer(sideIndex, playerIndex)}
                    />
                    {empty ? null : (
                      <PlayerNameFade
                        firstName={person.firstName}
                        lastName={person.lastName}
                        teamId={side.teamId ?? person.teamId}
                        empty={false}
                        givenAria={`Team ${sideIndex + 1} player ${playerIndex + 1} first name`}
                        familyAria={`Team ${sideIndex + 1} player ${playerIndex + 1} name`}
                        stat={
                          draft.showSalaries && person.playerId
                            ? salaryLabelForPlayer(undefined, person.playerId)
                            : ""
                        }
                        onFirstChange={(value) =>
                          onPlayerFirstNameChange(sideIndex, playerIndex, value)
                        }
                        onLastChange={(value) =>
                          onPlayerLastNameChange(sideIndex, playerIndex, value)
                        }
                        onEmptyClick={() =>
                          onPickPlayer(sideIndex, playerIndex)
                        }
                      />
                    )}
                  </div>
                );
              })}
              {column.picks.map((chip, pickIndex) => {
                const pick = side.picks[pickIndex]!;
                const label = mockTradePickLabel(pick);
                return (
                  <div
                    key={`mt-pick-${sideIndex}-${pickIndex}`}
                    className={[
                      "mt-chip",
                      pick.swap ? "is-swap" : "",
                      pick.top4 ? "is-top4" : "",
                      pick.twoWay ? "is-twoway" : "",
                      pick.cash ? "is-cash" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={boxStyle(local(chip))}
                  >
                    {label}
                  </div>
                );
              })}
            </section>
          );
        })}
        <div className="mt-title-plate" style={boxStyle(layout.title)}>
          <input
            className="mt-title"
            value={draft.title}
            maxLength={MOCK_TRADE_TITLE_MAX}
            spellCheck={false}
            aria-label="Mock trade title"
            onChange={(event) =>
              onComposerTextChange(event, onTitleChange, MOCK_TRADE_TITLE_MAX)
            }
          />
        </div>
        {draft.showLetterGrade ? (
          <LetterGradePlate
            className="mt-grade"
            grade={parseLetterGrade(draft.letterGrade ?? DEFAULT_LETTER_GRADE)}
            reason={draft.letterGradeReason ?? ""}
            exporting={exporting}
            onGrade={(next) => onLetterGradeChange?.(next)}
            onReason={onLetterGradeReasonChange}
          />
        ) : null}
        {draft.showBa !== false ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
            style={boxStyle(layout.ba)}
          />
        ) : null}
      </article>
    );
  },
);
