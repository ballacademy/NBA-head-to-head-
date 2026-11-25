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
  isAutoWeekLine,
  nextNDaysRange,
  rangeWeekLine,
} from "../instagramComposer/composerDateRange";
import {
  SCHEDULE_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack } from "../instagramComposer/exportPack";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import {
  SCHEDULE_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { nbaTodayIso } from "../playerOfTheDayComposer/lastGame";
import { readJson, writeJson } from "../lib/browserStorage";
import { ScheduleGraphic } from "./ScheduleGraphic";
import { exportSchedulePng } from "./exportSchedulePng";
import { renderScheduleCanvas } from "./renderScheduleCanvas";
import {
  defaultScheduleDraft,
  fetchScheduleRange,
  isScheduleDraft,
  normalizeScheduleDraft,
  schedulePageCount,
  schedulePageGames,
  type ScheduleDraft,
  type ScheduleGame,
} from "./scheduleState";
import "@fontsource/montserrat/latin-900.css";
import "./scheduleComposer.css";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";

const STORAGE_KEY = "ddgm:schedule-composer";
const SAVES_KEY = "ddgm:schedule-composer:saves";

const loadDraft = (): ScheduleDraft => {
  const stored = readJson<Partial<ScheduleDraft>>(STORAGE_KEY);
  if (isScheduleDraft(stored)) {
    return normalizeScheduleDraft(stored);
  }
  return defaultScheduleDraft();
};

export function ScheduleComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<ScheduleDraft>(defaultScheduleDraft);
  const [exporting, setExporting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(SCHEDULE_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const { push, undo, redo, canUndo, canRedo } = useComposerUndo<ScheduleDraft>();
  const [storyCrop, setStoryCrop] = useState(false);
  const [allGames, setAllGames] = useState<ScheduleGame[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    document.title = "Schedule poster";
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const applyRange = (from: string, to: string) => {
    setDraft((current) => ({
      ...current,
      from,
      to,
      weekLine: isAutoWeekLine(current.weekLine, current.from, current.to)
        ? rangeWeekLine(from, to)
        : current.weekLine,
    }));
  };

  const applyScheduleGames = (
    fetched: ScheduleGame[],
    from: string,
    to: string,
    page = 0,
  ) => {
    const games = schedulePageGames(fetched, page);
    const shownFrom = games[0]?.date || from;
    const shownTo = games[games.length - 1]?.date || to;
    setAllGames(fetched);
    setPageIndex(page);
    setDraft((current) => ({
      ...current,
      from,
      to,
      weekLine: isAutoWeekLine(current.weekLine, current.from, current.to)
        ? rangeWeekLine(shownFrom, shownTo)
        : current.weekLine,
      games,
    }));
    const pages = schedulePageCount(fetched);
    setStatus(
      fetched.length
        ? pages > 1
          ? `Showing ${games.length} of ${fetched.length} games · page ${page + 1} of ${pages}.`
          : `Loaded ${fetched.length} games.`
        : "No games in that range.",
    );
  };

  const fillRange = async (from = draft.from, to = draft.to) => {
    setFilling(true);
    setStatus("Loading schedule…");
    try {
      const fetched = await fetchScheduleRange({ from, to });
      push(draft);
      applyScheduleGames(fetched, from, to, 0);
    } finally {
      setFilling(false);
    }
  };

  const fillTonight = () => {
    const iso = nbaTodayIso();
    applyRange(iso, iso);
    void fillRange(iso, iso);
  };

  const handleExport = async (story = false, square = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportSchedulePng(
        node,
        exportFilenameFromTitle(draft.title, "schedule"),
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
        title="Schedule"
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
              presets={SCHEDULE_TITLE_PRESETS}
              onChange={(title) => setDraft((current) => ({ ...current, title }))}
            />
          </>
        }
        data={
          <>
            <button
              type="button"
              className="sc-chip sc-hud-full-only"
              aria-label="Next 7 days"
              onClick={() => {
                const range = nextNDaysRange(7);
                applyRange(range.from, range.to);
                void fillRange(range.from, range.to);
              }}
            >
              Next 7
            </button>
            <ComposerDateRange
              from={draft.from}
              to={draft.to}
              filling={filling}
              fillLabel="Fill schedule"
              simpleSet="night"
              onChange={(range) => applyRange(range.from, range.to)}
              onFill={fillTonight}
            />
            {schedulePageCount(allGames) > 1 ? (
              <div className="sc-look" role="group" aria-label="Schedule pages">
                <span className="sc-look__label">Page</span>
                {Array.from(
                  { length: schedulePageCount(allGames) },
                  (_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={pageIndex === index ? "sc-chip is-on" : "sc-chip"}
                      aria-pressed={pageIndex === index}
                      aria-label={`Page ${index + 1}`}
                      onClick={() =>
                        applyScheduleGames(
                          allGames,
                          draft.from,
                          draft.to,
                          index,
                        )
                      }
                    >
                      {index + 1}
                    </button>
                  ),
                )}
              </div>
            ) : null}
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
              <span className="sc-toolbar__eyebrow">Story crop</span>
              <button
                type="button"
                className={storyCrop ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={storyCrop}
                aria-label="Story crop check"
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
              setDraft(normalizeScheduleDraft(next));
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
                const previous = undo(draft);
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
                const next = redo(draft);
                if (next) {
                  setDraft(next);
                }
              }}
              disabled={!canRedo}
            >
              Redo
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              onClick={() => {
                if (!confirmBlankPost()) {
                  return;
                }
                push(draft);
                setDraft(defaultScheduleDraft());
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
                    draft.title,
                    draft.games.map(
                      (game) =>
                        `${game.awayId} @ ${game.homeId} ${game.timeLabel}`,
                    ),
                    [draft.weekLine],
                  ),
                )
              }
            >
              Copy caption
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost sc-hud-full-only"
              onClick={() => void handleExport(true)}
              disabled={exporting}
            >
              Export 9:16
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost sc-btn--aside sc-hud-full-only"
              onClick={() => void handleExport(false, true)}
              disabled={exporting}
              aria-label="Export 1:1"
            >
              Export 1:1
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost sc-btn--pack"
              onClick={() => {
                void (async () => {
                  setExporting(true);
                  try {
                    const pages = schedulePageCount(allGames);
                    await downloadExportPack(
                      () =>
                        renderScheduleCanvas({ ...draft, look, purpleFlair }, 2),
                      exportFilenameFromTitle(draft.title, "schedule"),
                      pages > 1
                        ? Array.from({ length: pages }, (_, index) => ({
                            filename: exportFilenameFromTitle(
                              `${draft.title} p${index + 1}`,
                              "schedule",
                            ),
                            render: () =>
                              renderScheduleCanvas(
                                {
                                  ...draft,
                                  games: schedulePageGames(allGames, index),
                                  look,
                                  purpleFlair,
                                },
                                2,
                              ),
                          }))
                        : [],
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
            <ScheduleGraphic
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
              onWeekLineChange={(weekLine) =>
                setDraft((current) => ({ ...current, weekLine }))
              }
            />
          </ComposerBoard>
          <StoryCropGuide on={storyCrop} />
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
    </div>
  );
}
