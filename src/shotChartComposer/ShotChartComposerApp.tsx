import { useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerDateRange } from "../instagramComposer/ComposerDateRange";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import {
  rangeWeekLine,
  useComposerDateRange,
} from "../instagramComposer/composerDateRange";
import {
  SHOT_CHART_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack } from "../instagramComposer/exportPack";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import {
  SHOT_CHART_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { readJson, writeJson } from "../lib/browserStorage";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { ShotChartGraphic } from "./ShotChartGraphic";
import { exportShotChartPng } from "./exportShotChartPng";
import { renderShotChartCanvas } from "./renderShotChartCanvas";
import {
  applyShotChartPlayer,
  defaultShotChartDraft,
  fetchRecentGames,
  fetchShotChartForGame,
  gamesForShotWindow,
  isShotChartDraft,
  type ShotChartDraft,
  type ShotChartWindow,
} from "./shotChartState";
import "@fontsource/montserrat/latin-900.css";
import "./shotChartComposer.css";

const STORAGE_KEY = "ddgm:shot-chart-composer";
const SAVES_KEY = "ddgm:shot-chart-composer:saves";

const loadDraft = (): ShotChartDraft => {
  const stored = readJson<Partial<ShotChartDraft>>(STORAGE_KEY);
  if (isShotChartDraft(stored)) {
    return { ...defaultShotChartDraft(), ...stored };
  }
  return defaultShotChartDraft();
};

export function ShotChartComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<ShotChartDraft>(defaultShotChartDraft);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(SHOT_CHART_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const { range, setRange } = useComposerDateRange();
  const { push, pop, canUndo } = useComposerUndo<ShotChartDraft>();
  const [storyCrop, setStoryCrop] = useState(false);

  useEffect(() => {
    document.title = "Shot chart graphic";
    const loaded = loadDraft();
    setDraft({
      ...loaded,
      from: loaded.from || range.from,
      to: loaded.to || range.to,
    });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const fillShots = async (next = draft) => {
    if (!next.playerId) {
      setStatus("Pick a player first.");
      return;
    }
    setFilling(true);
    setStatus("Loading shots…");
    try {
      const games = await fetchRecentGames(next.playerId);
      const windowGames = gamesForShotWindow(games, next.window, {
        from: next.from || range.from,
        to: next.to || range.to,
      });
      const batches = await Promise.all(
        windowGames.map((game) =>
          fetchShotChartForGame(game.eventId, next.playerId),
        ),
      );
      const shots = batches.flat();
      const makes = shots.filter((shot) => shot.made).length;
      const label =
        next.window === "last-game"
          ? windowGames[0]?.dateLabel || "LAST GAME"
          : rangeWeekLine(next.from || range.from, next.to || range.to);
      push(draft);
      setDraft({
        ...next,
        shots,
        makes,
        attempts: shots.length,
        gameLabel: label,
      });
      setStatus(
        shots.length
          ? `Plotted ${makes}-${shots.length} from ${windowGames.length || 0} game${windowGames.length === 1 ? "" : "s"}.`
          : "No shot locations for that window.",
      );
    } finally {
      setFilling(false);
    }
  };

  const pickPlayer = (playerId: string) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    push(draft);
    const next = applyShotChartPlayer(draft, playerId);
    setDraft(next);
    setPickerOpen(false);
    void fillShots(next);
  };

  const setWindow = (window: ShotChartWindow) => {
    const next = {
      ...draft,
      window,
      from: range.from,
      to: range.to,
    };
    setDraft(next);
    void fillShots(next);
  };

  const handleExport = async (story = false, square = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportShotChartPng(
        node,
        exportFilenameFromTitle(draft.title, "shot-chart"),
        { ...draft, look, purpleFlair },
        story,
        square,
      );
      setStatus(
        square
          ? "1:1 PNG download started."
          : story
            ? "Story PNG download started."
            : "Download started.",
      );
    } catch (error) {
      console.error(error);
      setStatus("Could not export PNG.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Shot chart"
        identity={
          <>
            <label className="sc-field sc-field--wide">
              Title
              <input
                value={draft.title}
                maxLength={48}
                onChange={(event) =>
                  onComposerTextChange(event, (title) =>
                    setDraft((current) => ({ ...current, title })),
                  )
                }
              />
            </label>
            <TitlePresetSelect
              value={draft.title}
              presets={SHOT_CHART_TITLE_PRESETS}
              onChange={(title) => setDraft((current) => ({ ...current, title }))}
            />
          </>
        }
        data={
          <>
            <button
              type="button"
              className="sc-chip"
              onClick={() => setPickerOpen(true)}
            >
              Pick player
            </button>
            <div className="sc-look" role="group" aria-label="Shot window">
              <span className="sc-look__label">Window</span>
              <button
                type="button"
                className={draft.window === "last-game" ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={draft.window === "last-game"}
                onClick={() => setWindow("last-game")}
              >
                Last game
              </button>
              <button
                type="button"
                className={draft.window === "range" ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={draft.window === "range"}
                onClick={() => setWindow("range")}
              >
                Date range
              </button>
            </div>
            {draft.window === "range" ? (
              <ComposerDateRange
                from={draft.from || range.from}
                to={draft.to || range.to}
                filling={filling}
                fillLabel="Fill shots"
                onChange={(next) => {
                  setRange(next);
                  setDraft((current) => ({
                    ...current,
                    from: next.from,
                    to: next.to,
                  }));
                }}
                onFill={() => void fillShots()}
              />
            ) : (
              <button
                type="button"
                className="sc-chip"
                onClick={() => void fillShots()}
                disabled={filling}
              >
                {filling ? "Loading…" : "Fill last game"}
              </button>
            )}
          </>
        }
        board={
          <>
            <ComposerLookToggle look={look} onChange={setLook} />
            <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
            <BaMarkToggle
              on={draft.showBa === true}
              onChange={(showBa) =>
                setDraft((current) => ({ ...current, showBa }))
              }
            />
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Makes</span>
              <button
                type="button"
                className={draft.showMakes !== false ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={draft.showMakes !== false}
                aria-label="Show made shots"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    showMakes: current.showMakes === false,
                  }))
                }
              >
                {draft.showMakes !== false ? "On" : "Off"}
              </button>
            </label>
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Misses</span>
              <button
                type="button"
                className={draft.showMisses !== false ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={draft.showMisses !== false}
                aria-label="Show missed shots"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    showMisses: current.showMisses === false,
                  }))
                }
              >
                {draft.showMisses !== false ? "On" : "Off"}
              </button>
            </label>
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">9:16 crop</span>
              <button
                type="button"
                className={storyCrop ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={storyCrop}
                aria-label="9:16 crop check"
                onClick={() => setStoryCrop((on) => !on)}
              >
                {storyCrop ? "On" : "Off"}
              </button>
            </label>
          </>
        }
        persist={
          <ComposerSaves
            storageKey={SAVES_KEY}
            board={draft}
            onLoad={(next) => {
              setDraft({ ...defaultShotChartDraft(), ...next });
              setStatus("Loaded named graphic.");
            }}
          />
        }
        actions={
          <>
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              onClick={() => {
                const previous = pop();
                if (previous) {
                  setDraft(previous);
                }
              }}
              disabled={!canUndo}
            >
              Undo
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              onClick={() => {
                push(draft);
                setDraft(defaultShotChartDraft());
                setStatus("Blank post.");
              }}
            >
              Blank post
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              onClick={() =>
                void copyGraphicCaption(
                  graphicCaption(
                    `${draft.firstName} ${draft.lastName}`.trim() || draft.title,
                    [],
                    [draft.gameLabel, `${draft.makes}-${draft.attempts}`],
                  ),
                )
              }
            >
              Copy caption
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              onClick={() => void handleExport(true)}
              disabled={exporting}
            >
              Export 9:16
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost sc-btn--aside"
              onClick={() => void handleExport(false, true)}
              disabled={exporting}
              aria-label="Export 1:1"
            >
              Export 1:1
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              onClick={() => {
                void (async () => {
                  setExporting(true);
                  try {
                    await downloadExportPack(
                      () =>
                        renderShotChartCanvas({ ...draft, look, purpleFlair }, 2),
                      exportFilenameFromTitle(draft.title, "shot-chart"),
                    );
                    setStatus("Pack download started (4:5 + 9:16).");
                  } finally {
                    setExporting(false);
                  }
                })();
              }}
              disabled={exporting}
            >
              Export pack
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--primary"
              onClick={() => void handleExport()}
              disabled={exporting}
            >
              {exporting ? "Exporting…" : "Export PNG"}
            </button>
          </>
        }
      />
      <main className="sc-stage">
        <div className={storyCrop ? "sc-stage__frame is-story" : "sc-stage__frame"}>
          <ComposerBoard>
            <ShotChartGraphic
              ref={boardRef}
              draft={draft}
              look={look}
              purpleFlair={purpleFlair}
              exporting={exporting}
              story={storyCrop}
              onBrandChange={(brand) =>
                setDraft((current) => ({ ...current, brand }))
              }
              onTitleChange={(title) =>
                setDraft((current) => ({ ...current, title }))
              }
              onPick={() => setPickerOpen(true)}
            />
          </ComposerBoard>
          <StoryCropGuide on={storyCrop} />
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
      {pickerOpen ? (
        <PlayerPicker
          heading="Pick a shooter"
          hint="Last game or a date range. Makes glow gold; misses stay open."
          currentId={draft.playerId}
          usedLabels={draft.playerId ? { [draft.playerId]: "Chart" } : {}}
          onPick={pickPlayer}
          onClear={() => {
            push(draft);
            setDraft(defaultShotChartDraft());
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}
