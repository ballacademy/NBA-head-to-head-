import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { ComposerTitleField } from "../instagramComposer/ComposerTitleField";
import {
  composerFlairClass,
  composerLookClass,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { getTeamColors } from "../lib/teamColors";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import {
  clampPicksPlateOpacity,
  DEFAULT_PICKS_PLATE_OPACITY,
  effectivePicksResult,
  formatPicksLine,
  formatPicksTotal,
  parsePicksLineInput,
  picksDatePill,
  picksFillLayout,
  picksJuiceOrMove,
  picksLineForSide,
  picksListTop,
  picksMl,
  picksNameLabel,
  picksRecordLine,
  picksTitlePlateH,
  sortPicksGames,
  splitPicksTitle,
  visiblePicksGames,
  type PicksAtsResult,
  type PicksDraft,
  type PicksGame,
  type PicksResultMode,
  type PicksSide,
} from "./picksState";

interface PicksGraphicProps {
  draft: PicksDraft;
  look?: ComposerLook;
  purpleFlair?: boolean;
  exporting?: boolean;
  story?: boolean;
  onBrandChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onPickSide: (gameId: string, side: PicksSide) => void;
  onLineChange: (gameId: string, side: PicksSide, line: number | null) => void;
  onPickTeam: (gameId: string, side: PicksSide) => void;
  onRemoveGame: (gameId: string) => void;
  onRefillGame: (gameId: string) => void;
  onLockGame: (gameId: string) => void;
  onCycleUnits: (gameId: string) => void;
  onCycleGrade: (gameId: string) => void;
  onNotesChange: (gameId: string, notes: string) => void;
  onCycleConfidence: (gameId: string) => void;
}

export const PicksGraphic = forwardRef<HTMLElement, PicksGraphicProps>(
  function PicksGraphic(
    {
      draft,
      look = "white",
      purpleFlair = false,
      exporting = false,
      story = false,
      onBrandChange,
      onTitleChange,
      onPickSide,
      onLineChange,
      onPickTeam,
      onRemoveGame,
      onRefillGame,
      onLockGame,
      onCycleUnits,
      onCycleGrade,
      onNotesChange,
      onCycleConfidence,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const titleLines = splitPicksTitle(draft.title, draft.date);
    const allGames = sortPicksGames(draft.games);
    const games = visiblePicksGames(allGames, exporting);
    const fill = picksFillLayout(
      games.length,
      story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT,
      0,
      titleLines.length,
    );
    const notch = picksDatePill(exporting ? games.length : allGames.length);
    const mode: PicksResultMode = draft.resultMode === "su" ? "su" : "ats";

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
          "pk-board",
          exporting ? "is-exporting" : "",
          story ? "is-story" : "",
          composerLookClass(look),
          composerFlairClass(purpleFlair),
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            ["--u" as string]: `${unit}px`,
            ["--pk-logo" as string]: String(fill.logo),
            ["--pk-line" as string]: String(fill.line),
            ["--pk-name" as string]: String(fill.name),
            ["--pk-meta" as string]: String(fill.meta),
            ["--pk-check-size" as string]: String(fill.check),
            ["--pk-gap" as string]: String(fill.gap),
            ["--pk-row-h" as string]: String(fill.rowH),
            ["--pk-group-h" as string]: String(fill.groupH),
            ["--pk-plate-h" as string]: String(picksTitlePlateH(titleLines.length)),
            ["--pk-header-h" as string]: String(picksListTop(titleLines.length)),
            ["--pk-bottom" as string]: String(fill.listBottom),
            ["--pk-plate-opacity" as string]: String(
              clampPicksPlateOpacity(
                draft.plateOpacity ?? DEFAULT_PICKS_PLATE_OPACITY,
              ),
            ),
          } as CSSProperties
        }
        aria-label="Instagram daily spread picks poster"
      >
        {draft.showBa ? (
          <img
            className="composer-ba"
            src="/ba-logo-circled.png"
            alt=""
            aria-hidden="true"
          />
        ) : null}
        <header className="pk-header">
          {draft.showBa ? (
            <div className="pk-brand pk-brand--spacer" aria-hidden="true" />
          ) : (
            <input
              className="pk-brand"
              value={draft.brand}
              maxLength={24}
              spellCheck={false}
              aria-label="Brand label"
              onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
            />
          )}
          <div className="pk-title-plate">
            <div className="pk-title-block">
              <ComposerTitleField
                value={draft.title}
                lines={titleLines}
                ariaLabel="Picks title"
                inputClassName="pk-title-input"
                lineClassName="pk-title-line"
                onChange={onTitleChange}
              />
            </div>
          </div>
          {notch ? (
            <div className="pk-date-notch">
              <span className="pk-date">{notch}</span>
            </div>
          ) : null}
        </header>
        <div className="pk-list">
          {games.length ? (
            games.map((game) => (
              <PicksRow
                key={game.id}
                game={game}
                mode={mode}
                showTotal={draft.showTotal === true}
                showMoneyline={draft.showMoneyline === true}
                showUnits={draft.showUnits === true}
                showJuice={draft.showJuice === true}
                showConfidence={draft.showConfidence === true}
                onPickSide={onPickSide}
                onLineChange={onLineChange}
                onPickTeam={onPickTeam}
                onRemoveGame={onRemoveGame}
                onRefillGame={onRefillGame}
                onLockGame={onLockGame}
                onCycleUnits={onCycleUnits}
                onCycleGrade={onCycleGrade}
                onNotesChange={onNotesChange}
                onCycleConfidence={onCycleConfidence}
              />
            ))
          ) : (
            <p className="pk-empty">Fill tonight’s slate</p>
          )}
        </div>
      </article>
    );
  },
);

function PicksRow({
  game,
  mode,
  showTotal,
  showMoneyline,
  showUnits,
  showJuice,
  showConfidence,
  onPickSide,
  onLineChange,
  onPickTeam,
  onRemoveGame,
  onRefillGame,
  onLockGame,
  onCycleUnits,
  onCycleGrade,
  onNotesChange,
  onCycleConfidence,
}: {
  game: PicksGame;
  mode: PicksResultMode;
  showTotal: boolean;
  showMoneyline: boolean;
  showUnits: boolean;
  showJuice: boolean;
  showConfidence: boolean;
  onPickSide: (gameId: string, side: PicksSide) => void;
  onLineChange: (gameId: string, side: PicksSide, line: number | null) => void;
  onPickTeam: (gameId: string, side: PicksSide) => void;
  onRemoveGame: (gameId: string) => void;
  onRefillGame: (gameId: string) => void;
  onLockGame: (gameId: string) => void;
  onCycleUnits: (gameId: string) => void;
  onCycleGrade: (gameId: string) => void;
  onNotesChange: (gameId: string, notes: string) => void;
  onCycleConfidence: (gameId: string) => void;
}) {
  const awayColor = getTeamColors(game.awayId).primary;
  const homeColor = getTeamColors(game.homeId).primary;
  const stamp = game.pick ? effectivePicksResult(game, mode) : null;
  const showStamp = Boolean(
    game.pick && (stamp || game.final || game.gradeManual),
  );
  return (
    <div
      className={[
        "pk-row",
        game.pick === "away" ? "is-away-pick" : "",
        game.pick === "home" ? "is-home-pick" : "",
        game.locked ? "is-lock" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          ["--pk-away" as string]: awayColor,
          ["--pk-home" as string]: homeColor,
        } as CSSProperties
      }
    >
      <PicksSideBlock
        side="away"
        teamId={game.awayId}
        record={picksRecordLine(game.awayRecord, game.awayLast10)}
        picked={game.pick === "away"}
        locked={game.locked === true && game.pick === "away"}
        gameId={game.id}
        units={showUnits && game.pick === "away" ? game.units || "1u" : ""}
        onPickSide={onPickSide}
        onPickTeam={onPickTeam}
        onCycleUnits={onCycleUnits}
      />
      <OddsBlock
        game={game}
        showTotal={showTotal}
        showMoneyline={showMoneyline}
        showJuice={showJuice}
        stamp={stamp}
        showStamp={showStamp}
        onLineChange={onLineChange}
        onCycleGrade={onCycleGrade}
      />
      <PicksSideBlock
        side="home"
        teamId={game.homeId}
        record={picksRecordLine(game.homeRecord, game.homeLast10)}
        picked={game.pick === "home"}
        locked={game.locked === true && game.pick === "home"}
        gameId={game.id}
        units={showUnits && game.pick === "home" ? game.units || "1u" : ""}
        onPickSide={onPickSide}
        onPickTeam={onPickTeam}
        onCycleUnits={onCycleUnits}
      />
      {showConfidence && game.pick ? (
        <button
          type="button"
          className="pk-conf"
          aria-label="Cycle confidence"
          onClick={() => onCycleConfidence(game.id)}
        >
          {"●".repeat(game.confidence || 1)}
          {"○".repeat(Math.max(0, 3 - (game.confidence || 1)))}
        </button>
      ) : null}
      <input
        className="pk-notes"
        value={game.notes ?? ""}
        maxLength={48}
        placeholder="Note"
        spellCheck={false}
        aria-label="Pick note"
        onChange={(event) => onNotesChange(game.id, event.target.value.slice(0, 48))}
      />
      <div className="pk-row__tools">
        <button
          type="button"
          className={game.locked ? "pk-lock is-on" : "pk-lock"}
          aria-pressed={game.locked === true}
          aria-label={game.locked ? "Clear lock" : "Set lock"}
          title="Lock this pick"
          onClick={() => onLockGame(game.id)}
        >
          ★
        </button>
        {game.eventId ? (
          <button
            type="button"
            aria-label="Re-fill this row from the slate"
            title="Re-fill this row"
            onClick={() => onRefillGame(game.id)}
          >
            ↻
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Remove game"
          onClick={() => onRemoveGame(game.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function PicksSideBlock({
  side,
  teamId,
  record,
  picked,
  locked,
  gameId,
  units,
  onPickSide,
  onPickTeam,
  onCycleUnits,
}: {
  side: PicksSide;
  teamId: string;
  record: string;
  picked: boolean;
  locked: boolean;
  gameId: string;
  units: string;
  onPickSide: (gameId: string, side: PicksSide) => void;
  onPickTeam: (gameId: string, side: PicksSide) => void;
  onCycleUnits: (gameId: string) => void;
}) {
  const team = getTeam(teamId);
  return (
    <div
      className={["pk-side", `is-${side}`, picked ? "is-on" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className={[
          "pk-check",
          picked ? "is-on" : "",
          locked ? "is-lock" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={picked}
        aria-label={
          picked
            ? `Clear ${team?.id ?? side} pick`
            : `Pick ${team?.id ?? side}`
        }
        onClick={() => onPickSide(gameId, side)}
      />
      <div className="pk-side__lockup">
        <div
          className={["pk-logo", picked ? "is-on" : "", team ? "" : "is-empty"]
            .filter(Boolean)
            .join(" ")}
        >
          {team ? (
            <TeamLogo src={team.logoSrc} label={team.id} shadow={0} />
          ) : (
            "+"
          )}
        </div>
        <span
          className={[
            "pk-mark",
            picked ? "is-on" : "",
            locked ? "is-lock" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          {picked ? (locked ? "★" : "✓") : ""}
        </span>
      </div>
      <button
        type="button"
        className="pk-logo-edit"
        aria-label={team ? `Change ${team.id}` : `Pick ${side} team`}
        onClick={(event) => {
          event.stopPropagation();
          onPickTeam(gameId, side);
        }}
      >
        ✎
      </button>
      <span className="pk-name">{picksNameLabel(teamId, side)}</span>
      {record ? <span className="pk-record">{record}</span> : null}
      {units ? (
        <button
          type="button"
          className="pk-units"
          aria-label="Cycle units"
          onClick={() => onCycleUnits(gameId)}
        >
          {units}
        </button>
      ) : null}
    </div>
  );
}

function OddsBlock({
  game,
  showTotal,
  showMoneyline,
  showJuice,
  stamp,
  showStamp,
  onLineChange,
  onCycleGrade,
}: {
  game: PicksGame;
  showTotal: boolean;
  showMoneyline: boolean;
  showJuice: boolean;
  stamp: PicksAtsResult | null;
  showStamp: boolean;
  onLineChange: (gameId: string, side: PicksSide, line: number | null) => void;
  onCycleGrade: (gameId: string) => void;
}) {
  const total = showTotal ? formatPicksTotal(game.total) : "";
  return (
    <div className="pk-odds">
      <div className="pk-odds__row">
        <TicketField
          game={game}
          side="away"
          showMoneyline={showMoneyline}
          showJuice={showJuice}
          onLineChange={onLineChange}
        />
        <span className="pk-odds__pipe" aria-hidden="true" />
        <TicketField
          game={game}
          side="home"
          showMoneyline={showMoneyline}
          showJuice={showJuice}
          onLineChange={onLineChange}
        />
      </div>
      {showStamp ? (
        <button
          type="button"
          className={`pk-stamp${stamp ? ` is-${stamp.toLowerCase()}` : ""}${game.gradeManual ? " is-manual" : ""}`}
          aria-label="Cycle pick result"
          onClick={() => onCycleGrade(game.id)}
        >
          {stamp || "·"}
        </button>
      ) : null}
      {total ? <p className="pk-ou">{total}</p> : null}
      <p className="pk-tip-row">
        {game.tip ? <span className="pk-tip">{game.tip}</span> : null}
        {game.tv ? <span className="pk-tv">{game.tv}</span> : null}
      </p>
    </div>
  );
}

function TicketField({
  game,
  side,
  showMoneyline,
  showJuice,
  onLineChange,
}: {
  game: PicksGame;
  side: PicksSide;
  showMoneyline: boolean;
  showJuice: boolean;
  onLineChange: (gameId: string, side: PicksSide, line: number | null) => void;
}) {
  const display = formatPicksLine(picksLineForSide(game.line, side));
  const shown = picksLineForSide(game.line, side);
  const abbrev = side === "away" ? game.awayId : game.homeId;
  const juice = showJuice ? picksJuiceOrMove(game, side) : "";
  const ml = showMoneyline ? picksMl(game, side) : "";
  const picked = game.pick === side;
  const muted = Boolean(game.pick && game.pick !== side);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(display);

  const commit = (value: string) => {
    const parsed = parsePicksLineInput(value);
    if (parsed === undefined) {
      setDraft(display);
      setEditing(false);
      return;
    }
    if (parsed !== shown) {
      onLineChange(game.id, side, parsed);
    }
    setEditing(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit(event.currentTarget.value);
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(display);
      setEditing(false);
      event.currentTarget.blur();
    }
  };

  return (
    <div
      className={[
        "pk-ticket",
        picked ? "is-on" : "",
        muted ? "is-dim" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pk-ticket__row">
        {abbrev ? <span className="pk-ticket__id">{abbrev}</span> : null}
        <input
          className="pk-line"
          value={editing ? draft : display}
          placeholder="—"
          spellCheck={false}
          aria-label={`${side} spread`}
          onFocus={() => {
            setDraft(display);
            setEditing(true);
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {ml ? <span className="pk-ticket__ml">{ml}</span> : null}
      </div>
      {juice ? <span className="pk-ticket__juice">{juice}</span> : null}
    </div>
  );
}
