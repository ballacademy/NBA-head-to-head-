import { useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerNightDate } from "../instagramComposer/ComposerNightDate";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";
import {
  PICKS_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { useComposerNight } from "../instagramComposer/composerNight";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import {
  PICKS_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { readJson, writeJson } from "../lib/browserStorage";
import { isoDateOnly } from "../playerOfTheDayComposer/lastGame";
import {
  GRAPHIC_HEIGHT,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { TeamPicker } from "../standingsComposer/TeamPicker";
import { PicksGraphic } from "./PicksGraphic";
import { exportPicksPng } from "./exportPicksPng";
import { renderPicksCanvas } from "./renderPicksCanvas";
import {
  applyScoresToPicksGames,
  applyScoresToPicksLedger,
  clampPicksPlateOpacity,
  cyclePicksConfidence,
  cyclePicksGrade,
  cyclePicksUnits,
  defaultPicksDraft,
  DEFAULT_PICKS_PLATE_OPACITY,
  effectivePicksResult,
  emptyPicksGame,
  emptyPicksLedger,
  fetchPicksSlate,
  formatPicksGraphicRecord,
  formatPicksSideTicket,
  isAutoPicksDateLine,
  isAutoPicksTitle,
  isPicksDraft,
  mergePicksFill,
  normalizePicksLedger,
  PICKS_LEDGER_KEY,
  picksDefaultTitle,
  picksDisplayTally,
  sortPicksGames,
  normalizePicksDraft,
  picksDateLine,
  refillPicksRow,
  setPicksDisplayedLine,
  setPicksLock,
  setPicksRecordField,
  setPicksTeam,
  togglePicksPick,
  ungradedPicksDates,
  upsertPicksLedger,
  type PicksAtsTally,
  type PicksDraft,
  type PicksLedger,
  type PicksSide,
} from "./picksState";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-900-italic.css";
import "./picksComposer.css";

const STORAGE_KEY = "ddgm:picks-composer";
const SAVES_KEY = "ddgm:picks-composer:saves";

const loadDraft = (): PicksDraft => {
  const stored = readJson<Partial<PicksDraft>>(STORAGE_KEY);
  if (isPicksDraft(stored)) {
    return normalizePicksDraft(stored);
  }
  return defaultPicksDraft();
};

export function PicksComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const slateRef = useRef<ReturnType<typeof emptyPicksGame>[]>([]);
  const autoFillRef = useRef(false);
  const [draft, setDraft] = useState<PicksDraft>(defaultPicksDraft);
  const [ledger, setLedger] = useState<PicksLedger>(emptyPicksLedger);
  const [exporting, setExporting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(PICKS_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const { push, pop, canUndo } = useComposerUndo<PicksDraft>();
  const [storyCrop, setStoryCrop] = useState(false);
  const [picker, setPicker] = useState<{ gameId: string; side: PicksSide } | null>(
    null,
  );
  const night = useComposerNight();

  useEffect(() => {
    document.title = "Daily spread picks";
    setDraft(loadDraft());
    setLedger(normalizePicksLedger(readJson(PICKS_LEDGER_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    setLedger((current) => upsertPicksLedger(current, draft.date, draft.games));
  }, [draft.date, draft.games, hydrated]);

  useEffect(() => {
    if (hydrated) {
      writeJson(PICKS_LEDGER_KEY, ledger);
    }
  }, [ledger, hydrated]);

  const gradeOpenSlates = async (current: PicksLedger, currentDate: string) => {
    const dates = ungradedPicksDates(current);
    await Promise.all(
      dates.map(async (iso) => {
        const incoming = await fetchPicksSlate(iso);
        if (!incoming.length) {
          return;
        }
        setLedger((led) => applyScoresToPicksLedger(led, iso, incoming));
        if (iso === currentDate) {
          setDraft((board) => ({
            ...board,
            games: applyScoresToPicksGames(board.games, incoming),
          }));
        }
      }),
    );
  };

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void gradeOpenSlates(ledger, draft.date);
    // Grade leftover slates once after hydrate; later fills upsert scores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const fillSlate = async (iso = draft.date, forceRowId?: string) => {
    const date = isoDateOnly(iso) || draft.date;
    setFilling(true);
    setStatus("Loading slate…");
    try {
      const incoming = await fetchPicksSlate(date);
      slateRef.current = incoming;
      push(draft);
      setDraft((current) => {
        const games = forceRowId
          ? current.games.map((game) =>
              game.id === forceRowId ? refillPicksRow(game, incoming) : game,
            )
          : mergePicksFill(current.games, incoming);
        return {
          ...current,
          date,
          dateLine: isAutoPicksDateLine(current.dateLine, current.date)
            ? picksDateLine(date)
            : current.dateLine,
          title: isAutoPicksTitle(current.title)
            ? picksDefaultTitle(date)
            : current.title,
          games,
        };
      });
      const nextLedger = applyScoresToPicksLedger(ledger, date, incoming);
      setLedger((current) => applyScoresToPicksLedger(current, date, incoming));
      void gradeOpenSlates(nextLedger, date);
      if (forceRowId) {
        setStatus("Re-filled that row from the slate.");
      } else {
        setStatus(
          incoming.length
            ? `Loaded ${incoming.length} games.`
            : "No games on that date.",
        );
      }
    } finally {
      setFilling(false);
    }
  };

  useEffect(() => {
    if (!hydrated || autoFillRef.current) {
      return;
    }
    autoFillRef.current = true;
    if (draft.games.length) {
      return;
    }
    const date = night.date || draft.date;
    void fillSlate(date);
    // First empty visit loads Tonight. Stored drafts keep their rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const resultMode = draft.resultMode === "su" ? "su" : "ats";
  const atsRecord = formatPicksGraphicRecord(ledger, resultMode);
  const hudRecord = picksDisplayTally(ledger, resultMode);

  const handleExport = async (story = false, square = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportPicksPng(
        node,
        exportFilenameFromTitle(draft.title, "picks", draft.date),
        { ...draft, look, purpleFlair, atsRecord },
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

  const usedLabels: Record<string, string> = {};
  draft.games.forEach((game, index) => {
    if (game.awayId) {
      usedLabels[game.awayId] = `Game ${index + 1} away`;
    }
    if (game.homeId) {
      usedLabels[game.homeId] = `Game ${index + 1} home`;
    }
  });
  const pickerGame = picker
    ? draft.games.find((game) => game.id === picker.gameId)
    : undefined;

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Picks"
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
              presets={[picksDefaultTitle(draft.date), ...PICKS_TITLE_PRESETS]}
              onChange={(title) => setDraft((current) => ({ ...current, title }))}
            />
          </>
        }
        data={
          <>
            <ComposerNightDate
              date={draft.date}
              todayIso={night.todayIso}
              yesterdayIso={night.yesterdayIso}
              onChange={(iso) => {
                night.setDate(iso);
                void fillSlate(iso);
              }}
            />
            <button
              type="button"
              className="sc-chip"
              aria-label="Fill tonight’s slate"
              onClick={() => void fillSlate(draft.date)}
              disabled={filling}
            >
              {filling ? "Loading…" : "Fill"}
            </button>
            <button
              type="button"
              className="sc-chip"
              aria-label="Add game"
              onClick={() => {
                push(draft);
                setDraft((current) => ({
                  ...current,
                  games: [...current.games, emptyPicksGame()],
                }));
              }}
            >
              Add game
            </button>
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
            <label className="sc-field sc-field--range">
              <span className="sc-toolbar__eyebrow">
                Plates{" "}
                <span className="sc-range__value">
                  {clampPicksPlateOpacity(
                    draft.plateOpacity ?? DEFAULT_PICKS_PLATE_OPACITY,
                  )}
                </span>
              </span>
              <span className="sc-range">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={clampPicksPlateOpacity(
                    draft.plateOpacity ?? DEFAULT_PICKS_PLATE_OPACITY,
                  )}
                  aria-label="Plate opacity"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={clampPicksPlateOpacity(
                    draft.plateOpacity ?? DEFAULT_PICKS_PLATE_OPACITY,
                  )}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onChange={(event) => {
                    const plateOpacity = clampPicksPlateOpacity(
                      Number(event.target.value),
                    );
                    setDraft((current) => ({ ...current, plateOpacity }));
                  }}
                />
              </span>
            </label>
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">O/U</span>
              <button
                type="button"
                className={draft.showTotal ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={draft.showTotal === true}
                aria-label="Show totals"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    showTotal: !current.showTotal,
                  }))
                }
              >
                {draft.showTotal ? "On" : "Off"}
              </button>
            </label>
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Moneyline</span>
              <button
                type="button"
                className={draft.showMoneyline ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={draft.showMoneyline === true}
                aria-label="Show moneylines"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    showMoneyline: !current.showMoneyline,
                  }))
                }
              >
                {draft.showMoneyline ? "On" : "Off"}
              </button>
            </label>
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Units</span>
              <button
                type="button"
                className={draft.showUnits ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={draft.showUnits === true}
                aria-label="Show units"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    showUnits: !current.showUnits,
                  }))
                }
              >
                {draft.showUnits ? "On" : "Off"}
              </button>
            </label>
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Juice</span>
              <button
                type="button"
                className={draft.showJuice ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={draft.showJuice === true}
                aria-label="Show juice"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    showJuice: !current.showJuice,
                  }))
                }
              >
                {draft.showJuice ? "On" : "Off"}
              </button>
            </label>
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Confidence</span>
              <button
                type="button"
                className={draft.showConfidence ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={draft.showConfidence === true}
                aria-label="Show confidence ticks"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    showConfidence: !current.showConfidence,
                  }))
                }
              >
                {draft.showConfidence ? "On" : "Off"}
              </button>
            </label>
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Result</span>
              <button
                type="button"
                className="sc-chip is-on"
                aria-label="Toggle ATS or straight up"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    resultMode: current.resultMode === "su" ? "ats" : "su",
                  }))
                }
              >
                {draft.resultMode === "su" ? "SU" : "ATS"}
              </button>
            </label>
            <div className="sc-field sc-field--wide pk-hud-ats">
              <span className="sc-toolbar__eyebrow">Record</span>
              <div className="pk-hud-ats__row" aria-label="Picks record">
                {(
                  [
                    ["wins", "W", "Record wins"],
                    ["losses", "L", "Record losses"],
                    ["pushes", "P", "Record pushes"],
                  ] as const
                ).map(([field, label, aria]) => (
                  <label key={field}>
                    {label}
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      aria-label={aria}
                      value={hudRecord[field]}
                      onChange={(event) =>
                        setLedger((current) =>
                          setPicksRecordField(
                            current,
                            field as keyof PicksAtsTally,
                            event.target.value,
                            resultMode,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
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
              setDraft(normalizePicksDraft(next));
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
                if (!confirmBlankPost()) {
                  return;
                }
                push(draft);
                setDraft(defaultPicksDraft());
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
                    sortPicksGames(draft.games).map((game) => {
                      const away = formatPicksSideTicket(game, "away") || game.awayId || "TBD";
                      const home = formatPicksSideTicket(game, "home") || game.homeId || "TBD";
                      const pick =
                        game.pick === "away"
                          ? game.awayId
                          : game.pick === "home"
                            ? game.homeId
                            : "";
                      return `${away} | ${home}${pick ? ` · ${pick}` : ""}${
                        game.locked ? " LOCK" : ""
                      }`;
                    }),
                    [draft.dateLine],
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
                    const filename = exportFilenameFromTitle(
                      draft.title,
                      "picks",
                      draft.date,
                    );
                    await downloadExportPack(
                      () =>
                        renderPicksCanvas(
                          { ...draft, look, purpleFlair, atsRecord },
                          2,
                        ),
                      filename,
                      [
                        {
                          filename: storyFilename(filename),
                          render: () =>
                            renderPicksCanvas(
                              { ...draft, look, purpleFlair, story: true, atsRecord },
                              2,
                            ),
                        },
                      ],
                      { letterbox: false },
                    );
                    setStatus("Pack download started (4:5 + 9:16 + 1:1).");
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
          <ComposerBoard
            height={storyCrop ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT}
          >
            <PicksGraphic
              ref={boardRef}
              draft={draft}
              atsRecord={atsRecord}
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
              onPickSide={(gameId, side) => {
                setDraft((current) => ({
                  ...current,
                  games: current.games.map((game) =>
                    game.id === gameId ? togglePicksPick(game, side) : game,
                  ),
                }));
              }}
              onLineChange={(gameId, side, line) => {
                push(draft);
                setDraft((current) => ({
                  ...current,
                  games: current.games.map((game) =>
                    game.id === gameId
                      ? setPicksDisplayedLine(game, line, side)
                      : game,
                  ),
                }));
              }}
              onPickTeam={(gameId, side) => setPicker({ gameId, side })}
              onLockGame={(gameId) => {
                push(draft);
                setDraft((current) => ({
                  ...current,
                  games: setPicksLock(current.games, gameId),
                }));
              }}
              onCycleUnits={(gameId) => {
                setDraft((current) => ({
                  ...current,
                  games: current.games.map((game) =>
                    game.id === gameId ? cyclePicksUnits(game) : game,
                  ),
                }));
              }}
              onCycleGrade={(gameId) => {
                setDraft((current) => {
                  const mode = current.resultMode === "su" ? "su" : "ats";
                  return {
                    ...current,
                    games: current.games.map((game) => {
                      if (game.id !== gameId) {
                        return game;
                      }
                      const auto = effectivePicksResult(
                        { ...game, gradeManual: null },
                        mode,
                      );
                      return {
                        ...game,
                        gradeManual: cyclePicksGrade(
                          effectivePicksResult(game, mode),
                          auto,
                        ),
                      };
                    }),
                  };
                });
              }}
              onNotesChange={(gameId, notes) => {
                setDraft((current) => ({
                  ...current,
                  games: current.games.map((game) =>
                    game.id === gameId
                      ? { ...game, notes: notes.slice(0, 48) }
                      : game,
                  ),
                }));
              }}
              onCycleConfidence={(gameId) => {
                setDraft((current) => ({
                  ...current,
                  games: current.games.map((game) =>
                    game.id === gameId
                      ? {
                          ...game,
                          confidence: cyclePicksConfidence(game.confidence),
                        }
                      : game,
                  ),
                }));
              }}
              onRemoveGame={(gameId) => {
                push(draft);
                setDraft((current) => ({
                  ...current,
                  games: current.games.filter((game) => game.id !== gameId),
                }));
              }}
              onRefillGame={(gameId) => {
                if (slateRef.current.length) {
                  push(draft);
                  setDraft((current) => ({
                    ...current,
                    games: current.games.map((game) =>
                      game.id === gameId
                        ? refillPicksRow(game, slateRef.current)
                        : game,
                    ),
                  }));
                  setStatus("Re-filled that row from the slate.");
                  return;
                }
                void fillSlate(draft.date, gameId);
              }}
            />
          </ComposerBoard>
          <StoryCropGuide on={storyCrop} />
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
      {picker && pickerGame ? (
        <TeamPicker
          heading={picker.side === "away" ? "Away team" : "Home team"}
          currentId={
            picker.side === "away" ? pickerGame.awayId : pickerGame.homeId
          }
          usedLabels={usedLabels}
          onPick={(teamId) => {
            push(draft);
            setDraft((current) => ({
              ...current,
              games: current.games.map((game) =>
                game.id === picker.gameId
                  ? setPicksTeam(game, picker.side, teamId)
                  : game,
              ),
            }));
            setPicker(null);
          }}
          onClear={() => {
            push(draft);
            setDraft((current) => ({
              ...current,
              games: current.games.map((game) =>
                game.id === picker.gameId
                  ? setPicksTeam(game, picker.side, "")
                  : game,
              ),
            }));
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </div>
  );
}
