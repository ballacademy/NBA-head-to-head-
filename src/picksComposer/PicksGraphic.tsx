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
  formatPicksLine,
  formatPicksTotal,
  parsePicksLineInput,
  picksFillLayout,
  picksListTop,
  picksTitlePlateH,
  picksJuiceOrMove,
  picksLineForSide,
  picksMl,
  picksRecordLine,
  picksNameLabel,
  sortPicksGames,
  splitPicksTitle,
  type PicksDraft,
  type PicksGame,
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
  onDateLineChange: (value: string) => void;
  onPickSide: (gameId: string, side: PicksSide) => void;
  onLineChange: (gameId: string, side: PicksSide, line: number | null) => void;
  onPickTeam: (gameId: string, side: PicksSide) => void;
  onRemoveGame: (gameId: string) => void;
  onRefillGame: (gameId: string) => void;
  onLockGame: (gameId: string) => void;
  onCycleUnits: (gameId: string) => void;
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
      onDateLineChange,
      onPickSide,
      onLineChange,
      onPickTeam,
      onRemoveGame,
      onRefillGame,
      onLockGame,
      onCycleUnits,
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const titleLines = splitPicksTitle(draft.title, draft.date);
    const games = sortPicksGames(draft.games);
    const fill = picksFillLayout(
      games.length,
      story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT,
      0,
      titleLines.length,
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
          <div className="pk-date-notch">
            <input
              className="pk-date"
              value={draft.dateLine}
              maxLength={40}
              spellCheck={false}
              aria-label="Picks date"
              size={Math.max(12, draft.dateLine.trim().length + 1)}
              onChange={(event) => onDateLineChange(event.target.value.slice(0, 40))}
            />
            {games.length ? (
              <span className="pk-date-count">
                {" · "}
                {games.length} GAME{games.length === 1 ? "" : "S"}
              </span>
            ) : null}
          </div>
        </header>
        <div className="pk-list">
          {games.length ? (
            games.map((game) => (
              <PicksRow
                key={game.id}
                game={game}
                showTotal={draft.showTotal === true}
                showMoneyline={draft.showMoneyline === true}
                showUnits={draft.showUnits === true}
                onPickSide={onPickSide}
                onLineChange={onLineChange}
                onPickTeam={onPickTeam}
                onRemoveGame={onRemoveGame}
                onRefillGame={onRefillGame}
                onLockGame={onLockGame}
                onCycleUnits={onCycleUnits}
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
  showTotal,
  showMoneyline,
  showUnits,
  onPickSide,
  onLineChange,
  onPickTeam,
  onRemoveGame,
  onRefillGame,
  onLockGame,
  onCycleUnits,
}: {
  game: PicksGame;
  showTotal: boolean;
  showMoneyline: boolean;
  showUnits: boolean;
  onPickSide: (gameId: string, side: PicksSide) => void;
  onLineChange: (gameId: string, side: PicksSide, line: number | null) => void;
  onPickTeam: (gameId: string, side: PicksSide) => void;
  onRemoveGame: (gameId: string) => void;
  onRefillGame: (gameId: string) => void;
  onLockGame: (gameId: string) => void;
  onCycleUnits: (gameId: string) => void;
}) {
  const away = getTeam(game.awayId);
  const home = getTeam(game.homeId);
  const awayColor = getTeamColors(game.awayId).primary;
  const homeColor = getTeamColors(game.homeId).primary;
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
        dimmed={game.pick === "home"}
        gameId={game.id}
        units={showUnits && game.pick === "away" ? game.units || "1u" : ""}
        onPickTeam={onPickTeam}
        onCycleUnits={onCycleUnits}
      />
      <button
        type="button"
        className={[
          "pk-check",
          game.pick === "away" ? "is-on" : "",
          game.locked && game.pick === "away" ? "is-lock" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={game.pick === "away"}
        aria-label={
          game.pick === "away"
            ? `Clear ${away?.id ?? "away"} pick`
            : `Pick ${away?.id ?? "away"}`
        }
        onClick={() => onPickSide(game.id, "away")}
      >
        {game.pick === "away" ? (game.locked ? "★" : "✓") : ""}
      </button>
      <OddsBlock
        game={game}
        showTotal={showTotal}
        showMoneyline={showMoneyline}
        onLineChange={onLineChange}
      />
      <button
        type="button"
        className={[
          "pk-check",
          game.pick === "home" ? "is-on" : "",
          game.locked && game.pick === "home" ? "is-lock" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={game.pick === "home"}
        aria-label={
          game.pick === "home"
            ? `Clear ${home?.id ?? "home"} pick`
            : `Pick ${home?.id ?? "home"}`
        }
        onClick={() => onPickSide(game.id, "home")}
      >
        {game.pick === "home" ? (game.locked ? "★" : "✓") : ""}
      </button>
      <PicksSideBlock
        side="home"
        teamId={game.homeId}
        record={picksRecordLine(game.homeRecord, game.homeLast10)}
        picked={game.pick === "home"}
        dimmed={game.pick === "away"}
        gameId={game.id}
        units={showUnits && game.pick === "home" ? game.units || "1u" : ""}
        onPickTeam={onPickTeam}
        onCycleUnits={onCycleUnits}
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
  dimmed,
  gameId,
  units,
  onPickTeam,
  onCycleUnits,
}: {
  side: PicksSide;
  teamId: string;
  record: string;
  picked: boolean;
  dimmed: boolean;
  gameId: string;
  units: string;
  onPickTeam: (gameId: string, side: PicksSide) => void;
  onCycleUnits: (gameId: string) => void;
}) {
  const team = getTeam(teamId);
  return (
    <div
      className={[
        "pk-side",
        `is-${side}`,
        picked ? "is-on" : "",
        dimmed ? "is-dim" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className={["pk-logo", picked ? "is-on" : "", team ? "" : "is-empty"]
          .filter(Boolean)
          .join(" ")}
        aria-label={team ? `Change ${team.id}` : `Pick ${side} team`}
        onClick={() => onPickTeam(gameId, side)}
      >
        {team ? (
          <TeamLogo src={team.logoSrc} label={team.id} shadow={0} />
        ) : (
          "+"
        )}
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
  onLineChange,
}: {
  game: PicksGame;
  showTotal: boolean;
  showMoneyline: boolean;
  onLineChange: (gameId: string, side: PicksSide, line: number | null) => void;
}) {
  const total = showTotal ? formatPicksTotal(game.total) : "";
  return (
    <div className="pk-odds">
      <div className="pk-odds__row">
        <TicketField
          game={game}
          side="away"
          showMoneyline={showMoneyline}
          onLineChange={onLineChange}
        />
        <span className="pk-odds__pipe" aria-hidden="true">
          |
        </span>
        <TicketField
          game={game}
          side="home"
          showMoneyline={showMoneyline}
          onLineChange={onLineChange}
        />
      </div>
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
  onLineChange,
}: {
  game: PicksGame;
  side: PicksSide;
  showMoneyline: boolean;
  onLineChange: (gameId: string, side: PicksSide, line: number | null) => void;
}) {
  const display = formatPicksLine(picksLineForSide(game.line, side));
  const shown = picksLineForSide(game.line, side);
  const abbrev = side === "away" ? game.awayId : game.homeId;
  const juice = picksJuiceOrMove(game, side);
  const ml = showMoneyline ? picksMl(game, side) : "";
  const picked = game.pick === side;
  const dimmed = Boolean(game.pick && game.pick !== side);
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
        dimmed ? "is-dim" : "",
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
