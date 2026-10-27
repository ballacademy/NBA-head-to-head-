import { useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { GRAPHIC_HEIGHT, STORY_DESIGN_HEIGHT } from "../standingsComposer/rankingState";
import { ComposerDateRange } from "../instagramComposer/ComposerDateRange";
import { ComposerHudExtras } from "../instagramComposer/ComposerHudExtras";
import { ComposerHudSelect } from "../instagramComposer/ComposerHudSelect";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerNameStyleToggle } from "../instagramComposer/ComposerNameStyleToggle";
import { ComposerNightDate } from "../instagramComposer/ComposerNightDate";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import {
  rangeWeekLine,
  useComposerDateRange,
} from "../instagramComposer/composerDateRange";
import { useComposerNight } from "../instagramComposer/composerNight";
import {
  SHOT_CHART_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
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
import type { LastGame } from "../playerOfTheDayComposer/lastGame";
import {
  applyShotChartFilter,
  applyShotChartPlayer,
  defaultShotChartDraft,
  fetchRecentGames,
  fetchShotChartForGame,
  formatShotMatchup,
  gamesForShotWindow,
  isoDateOnly,
  isShotChartDraft,
  shotChartFilter,
  shotGameOptionLabel,
  type ShotChartDraft,
  type ShotChartFilter,
  type ShotChartWindow,
} from "./shotChartState";
import "@fontsource/montserrat/latin-900.css";
import "./shotChartComposer.css";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";
import { carriedPlayerId } from "../instagramComposer/composerCarry";

const STORAGE_KEY = "ddgm:shot-chart-composer";
const SAVES_KEY = "ddgm:shot-chart-composer:saves";

const loadDraft = (): ShotChartDraft => {
  const stored = readJson<Partial<ShotChartDraft>>(STORAGE_KEY);
  const base = isShotChartDraft(stored)
    ? { ...defaultShotChartDraft(), ...stored }
    : defaultShotChartDraft();
  if (base.playerId) {
    return base;
  }
  const carried = carriedPlayerId();
  return carried ? applyShotChartPlayer(base, carried) : base;
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
  const night = useComposerNight();
  const { push, pop, canUndo } = useComposerUndo<ShotChartDraft>();
  const [storyCrop, setStoryCrop] = useState(false);
  const [recentGames, setRecentGames] = useState<LastGame[]>([]);
  const fillSeq = useRef(0);

  useEffect(() => {
    document.title = "Shot chart graphic";
    const loaded = loadDraft();
    setDraft({
      ...loaded,
      from: loaded.from || range.from,
      to: loaded.to || range.to,
      nightDate: loaded.nightDate || night.date,
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
    const seq = ++fillSeq.current;
    setFilling(true);
    setStatus("Loading shots…");
    try {
      const games = await fetchRecentGames(next.playerId);
      setRecentGames(games);
      const windowGames = gamesForShotWindow(
        games,
        next.window,
        {
          from: next.from || range.from,
          to: next.to || range.to,
        },
        { eventId: next.eventId, nightDate: next.nightDate || night.date },
      );
      const batches = await Promise.all(
        windowGames.map((game) =>
          fetchShotChartForGame(game.eventId, next.playerId),
        ),
      );
      if (seq !== fillSeq.current) {
        return;
      }
      const shots = batches.flat();
      const makes = shots.filter((shot) => shot.made).length;
      const single = windowGames.length === 1 ? windowGames[0] : undefined;
      const label = single
        ? single.dateLabel || "LAST GAME"
        : next.window === "last-game"
          ? windowGames[0]?.dateLabel || "LAST GAME"
          : rangeWeekLine(next.from || range.from, next.to || range.to);
      push(draft);
      setDraft({
        ...next,
        nightDate: next.nightDate || night.date,
        eventId: single?.eventId || "",
        matchup: single ? formatShotMatchup(single) : "",
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
      if (seq === fillSeq.current) {
        setFilling(false);
      }
    }
  };

  useEffect(() => {
    if (!hydrated || !draft.playerId || draft.shots.length > 0) {
      return;
    }
    void fillShots(draft);
    // Carry an empty shot chart onto the current player once, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !draft.playerId) {
      setRecentGames([]);
      return;
    }
    let cancelled = false;
    void fetchRecentGames(draft.playerId).then((games) => {
      if (!cancelled) {
        setRecentGames(games);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, draft.playerId]);

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
      eventId: window === "range" ? "" : draft.eventId,
    };
    setDraft(next);
    void fillShots(next);
  };

  const setNight = (iso: string) => {
    night.setDate(iso);
    const next = {
      ...draft,
      window: "last-game" as const,
      nightDate: iso,
      eventId: "",
    };
    setDraft(next);
    void fillShots(next);
  };

  const pickRecentGame = (eventId: string) => {
    const game = recentGames.find((row) => row.eventId === eventId);
    const next = {
      ...draft,
      window: "last-game" as const,
      eventId,
      nightDate: game ? isoDateOnly(game.gameDate) : draft.nightDate,
      matchup: game ? formatShotMatchup(game) : "",
    };
    setDraft(next);
    void fillShots(next);
  };

  const setShotFilter = (filter: ShotChartFilter) => {
    setDraft((current) => applyShotChartFilter(current, filter));
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
                  const updated = {
                    ...draft,
                    window: "range" as const,
                    from: next.from,
                    to: next.to,
                    eventId: "",
                  };
                  setDraft(updated);
                  void fillShots(updated);
                }}
                onFill={() => void fillShots()}
              />
            ) : (
              <>
                <ComposerNightDate
                  date={draft.nightDate || night.date}
                  todayIso={night.todayIso}
                  yesterdayIso={night.yesterdayIso}
                  onChange={setNight}
                />
                <label className="sc-field">
                  Game
                  <select
                    value={draft.eventId || ""}
                    aria-label="Recent game"
                    onChange={(event) => pickRecentGame(event.target.value)}
                  >
                    <option value="">Latest</option>
                    {draft.eventId &&
                    !recentGames.some((game) => game.eventId === draft.eventId) ? (
                      <option value={draft.eventId}>
                        {draft.gameLabel || "Selected game"}
                      </option>
                    ) : null}
                    {recentGames.slice(0, 20).map((game) => (
                      <option key={game.eventId} value={game.eventId}>
                        {shotGameOptionLabel(game)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="sc-chip"
                  onClick={() => void fillShots()}
                  disabled={filling}
                >
                  {filling ? "Loading…" : "Fill"}
                </button>
              </>
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
            <ComposerHudSelect
              label="Shots"
              ariaLabel="Makes or misses"
              value={shotChartFilter(draft)}
              options={[
                { value: "both", label: "Both" },
                { value: "makes", label: "Makes" },
                { value: "misses", label: "Misses" },
              ]}
              onChange={setShotFilter}
            />
            <ComposerHudExtras
              label="Board extras"
              ariaLabel="Shot board extras"
              items={[
                {
                  key: "opponent",
                  label: "Opponent",
                  on: draft.showOpponent === true,
                  onChange: (showOpponent) =>
                    setDraft((current) => ({ ...current, showOpponent })),
                },
                {
                  key: "zones",
                  label: "Zones",
                  on: draft.showZones !== false,
                  onChange: (showZones) =>
                    setDraft((current) => ({ ...current, showZones })),
                },
                {
                  key: "legend",
                  label: "Legend",
                  on: draft.showLegend !== false,
                  onChange: (showLegend) =>
                    setDraft((current) => ({ ...current, showLegend })),
                },
              ]}
            />
            <ComposerNameStyleToggle />
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
                if (!confirmBlankPost()) {
                  return;
                }
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
              className="sc-btn sc-btn--ghost"
              onClick={() => {
                void (async () => {
                  setExporting(true);
                  try {
                    const feed = exportFilenameFromTitle(
                      draft.title,
                      "shot-chart",
                    );
                    await downloadExportPack(
                      () =>
                        renderShotChartCanvas({ ...draft, look, purpleFlair }, 2),
                      feed,
                      [
                        {
                          filename: storyFilename(feed),
                          render: () =>
                            renderShotChartCanvas(
                              { ...draft, look, purpleFlair, story: true },
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
