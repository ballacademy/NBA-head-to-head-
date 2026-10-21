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
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TeamLogo } from "../standingsComposer/TeamLogo";
import { getTeam } from "../standingsComposer/teams";
import {
  formatPicksGameLine,
  parsePicksLineInput,
  picksFillLayout,
  picksLineForSide,
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
  onLineChange: (gameId: string, line: number | null) => void;
  onPickTeam: (gameId: string, side: PicksSide) => void;
  onRemoveGame: (gameId: string) => void;
  onRefillGame: (gameId: string) => void;
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
    },
    ref,
  ) {
    const localRef = useRef<HTMLElement | null>(null);
    const [unit, setUnit] = useState(0.4);
    const titleLines = splitPicksTitle(draft.title);
    const fill = picksFillLayout(draft.games.length);

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
            ["--pk-check-size" as string]: String(fill.check),
            ["--pk-gap" as string]: String(fill.gap),
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
        {draft.showBa ? null : (
          <input
            className="pk-brand"
            value={draft.brand}
            maxLength={24}
            spellCheck={false}
            aria-label="Brand label"
            onChange={(event) => onComposerTextChange(event, onBrandChange, 24)}
          />
        )}
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
        <input
          className="pk-date"
          value={draft.dateLine}
          maxLength={40}
          spellCheck={false}
          aria-label="Picks date"
          onChange={(event) => onDateLineChange(event.target.value.slice(0, 40))}
        />
        <div className="pk-list">
          {draft.games.length ? (
            draft.games.map((game) => (
              <PicksRow
                key={game.id}
                game={game}
                onPickSide={onPickSide}
                onLineChange={onLineChange}
                onPickTeam={onPickTeam}
                onRemoveGame={onRemoveGame}
                onRefillGame={onRefillGame}
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
  onPickSide,
  onLineChange,
  onPickTeam,
  onRemoveGame,
  onRefillGame,
}: {
  game: PicksGame;
  onPickSide: (gameId: string, side: PicksSide) => void;
  onLineChange: (gameId: string, line: number | null) => void;
  onPickTeam: (gameId: string, side: PicksSide) => void;
  onRemoveGame: (gameId: string) => void;
  onRefillGame: (gameId: string) => void;
}) {
  const away = getTeam(game.awayId);
  const home = getTeam(game.homeId);
  return (
    <div className="pk-row">
      <PicksSide
        side="away"
        teamId={game.awayId}
        picked={game.pick === "away"}
        gameId={game.id}
        onPickTeam={onPickTeam}
      />
      <button
        type="button"
        className={game.pick === "away" ? "pk-check is-on" : "pk-check"}
        aria-pressed={game.pick === "away"}
        aria-label={
          game.pick === "away"
            ? `Clear ${away?.id ?? "away"} pick`
            : `Pick ${away?.id ?? "away"}`
        }
        onClick={() => onPickSide(game.id, "away")}
      >
        {game.pick === "away" ? "✓" : ""}
      </button>
      <LineField game={game} onLineChange={onLineChange} />
      <button
        type="button"
        className={game.pick === "home" ? "pk-check is-on" : "pk-check"}
        aria-pressed={game.pick === "home"}
        aria-label={
          game.pick === "home"
            ? `Clear ${home?.id ?? "home"} pick`
            : `Pick ${home?.id ?? "home"}`
        }
        onClick={() => onPickSide(game.id, "home")}
      >
        {game.pick === "home" ? "✓" : ""}
      </button>
      <PicksSide
        side="home"
        teamId={game.homeId}
        picked={game.pick === "home"}
        gameId={game.id}
        onPickTeam={onPickTeam}
      />
      <div className="pk-row__tools">
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

function PicksSide({
  side,
  teamId,
  picked,
  gameId,
  onPickTeam,
}: {
  side: PicksSide;
  teamId: string;
  picked: boolean;
  gameId: string;
  onPickTeam: (gameId: string, side: PicksSide) => void;
}) {
  const team = getTeam(teamId);
  return (
    <div className={`pk-side is-${side}`}>
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
      <span className="pk-name">{team?.id ?? "TEAM"}</span>
    </div>
  );
}

function LineField({
  game,
  onLineChange,
}: {
  game: PicksGame;
  onLineChange: (gameId: string, line: number | null) => void;
}) {
  const display = formatPicksGameLine(game);
  const shown = picksLineForSide(game.line, game.pick);
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
      onLineChange(game.id, parsed);
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
    <div className="pk-line-wrap">
      <input
        className="pk-line"
        value={editing ? draft : display}
        placeholder="—"
        spellCheck={false}
        aria-label="Spread"
        onFocus={() => {
          setDraft(display);
          setEditing(true);
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
