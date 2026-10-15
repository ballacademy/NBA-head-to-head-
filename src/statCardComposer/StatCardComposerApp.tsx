import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import {
  STAT_CARD_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { ComposerNightDate } from "../instagramComposer/ComposerNightDate";
import { ComposerPhotoHud } from "../instagramComposer/ComposerPhotoHud";
import { WatermarkToggle } from "../instagramComposer/WatermarkToggle";
import {
  nightStandoutPickerRows,
  useComposerNight,
} from "../instagramComposer/composerNight";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { GRAPHIC_HEIGHT, STORY_DESIGN_HEIGHT } from "../standingsComposer/rankingState";
import {
  copyGraphicCaption,
  statCardLineCaption,
} from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import { readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import {
  fetchLastGame,
  isoDateOnly,
  type LastGame,
} from "../playerOfTheDayComposer/lastGame";
import {
  everyTeamCurrentSeason,
  everyTeamSeasons,
  loadEveryTeamRosters,
} from "../everyTeamComposer/historicalRosters";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { StatCardGraphic } from "./StatCardGraphic";
import { exportStatCardPng } from "./exportStatCardPng";
import { renderStatCardCanvas } from "./renderStatCardCanvas";
import {
  addStatCardLine,
  applyPlayerName,
  clipStatLabel,
  clipStatMatchup,
  clearStatCardSubject,
  defaultStatCardDraft,
  fillStatCardFromGame,
  fillStatCardFromPlayer,
  fillStatCardFromSeason,
  fillStatCardFromStandout,
  formatStatCardMatchup,
  hasCustomPhoto,
  isStatCardDraft,
  normalizeStatCardDraft,
  parseStatCardKey,
  parseStatCardSource,
  playerName,
  moveStatCardLine,
  removeStatCardLine,
  setStatCardLineKey,
  setStatCardPhoto,
  nextStatCardLine,
  STAT_CARD_LINE_OPTIONS,
  STC_STAT_COUNT,
  STC_STAT_MAX,
  type StatCardDraft,
  type StatCardSource,
} from "./statCardState";
import "@fontsource/montserrat/latin-900.css";
import "./statCardComposer.css";

const STORAGE_KEY = "ddgm:stat-card-composer";
const SAVES_KEY = "ddgm:stat-card-composer:saves";

const loadDraft = (): StatCardDraft => {
  const stored = readJson<Partial<StatCardDraft>>(STORAGE_KEY);
  if (isStatCardDraft(stored)) {
    return normalizeStatCardDraft(stored);
  }
  return defaultStatCardDraft();
};

export function StatCardComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultStatCardDraft();
  const [draft, setDraft] = useState<StatCardDraft>(empty);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(STAT_CARD_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade] = usePhotoGrade();
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [rostersReady, setRostersReady] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);
  const [storyCrop, setStoryCrop] = useState(false);
  const lastGameRef = useRef<LastGame | null>(null);
  const { push, pop, canUndo } = useComposerUndo<StatCardDraft>();
  const night = useComposerNight();
  const source = parseStatCardSource(draft.source);
  const todayIso = night.todayIso;
  const yesterdayIso = night.yesterdayIso;
  const gameDate = night.date;

  useEffect(() => {
    document.title = "Stat card graphic";
    void loadEveryTeamRosters()
      .then(() => setRostersReady(true))
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(() => {
        setDraft(loadDraft());
        setHydrated(true);
      });
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const fillStats = async (
    next: StatCardDraft,
    sample = statsSample,
  ) => {
    if (!next.playerId) {
      return;
    }
    const source = parseStatCardSource(next.source);
    try {
      if (source === "season") {
        await loadEveryTeamRosters();
        setDraft((current) =>
          current.playerId === next.playerId
            ? fillStatCardFromSeason(current, next.season, sample)
            : current,
        );
        return;
      }
      const game = await fetchLastGame(
        next.playerId,
        sample,
        parseStatCardSource(next.source) === "last-game"
          ? next.gameDate
          : null,
      );
      if (!game) {
        return;
      }
      lastGameRef.current = game;
      setDraft((current) =>
        current.playerId === next.playerId
          ? fillStatCardFromGame(current, game)
          : current,
      );
    } catch {
      /* still editable */
    }
  };

  const setSource = (nextSource: StatCardSource) => {
    const next = { ...draft, source: nextSource };
    setDraft(next);
    void fillStats(next);
  };

  const setGameDate = (iso: string) => {
    const nextDate = isoDateOnly(iso) || todayIso;
    night.setDate(nextDate);
    const next = { ...draft, gameDate: nextDate };
    setDraft(next);
    void fillStats(next);
  };

  useEffect(() => {
    if (!hydrated || source !== "last-game") {
      return;
    }
    if (draft.gameDate !== night.date) {
      const next = { ...draft, gameDate: night.date };
      setDraft(next);
      void fillStats(next);
    }
  }, [hydrated, night.date, source]);

  useEffect(() => {
    if (!pickerOpen || source !== "last-game") {
      return;
    }
    void night.ensureStandouts(night.date);
  }, [pickerOpen, source, night.date, night.ensureStandouts]);

  const handleExport = async (filename?: string, story = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setStatus("Rendering PNG…");
    setPickerOpen(false);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await exportStatCardPng(
        node,
        filename ??
          exportFilenameFromTitle(playerName(draft) || "stat-card", "stat-card"),
        { ...draft, look, purpleFlair, photoGrade },
        story,
      );
      setStatus(story ? "Story PNG download started." : "Download started.");
    } catch (error) {
      console.error(error);
      setStatus("Could not export PNG.");
    } finally {
      setExporting(false);
    }
  };

  const commitPick = (playerId: string, keepCustomPhoto: boolean) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    push(draft);
    let next = fillStatCardFromPlayer(player, draft, keepCustomPhoto);
    const standout = night.standouts.find((row) => row.athleteId === playerId);
    if (standout && parseStatCardSource(next.source) === "last-game") {
      lastGameRef.current = standout.game;
      next = fillStatCardFromStandout(next, standout.game);
    }
    setDraft(next);
    setPickerOpen(false);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name}.`
        : `Filled ${player.name} — upload an action photo.`,
    );
    if (!standout) {
      void fillStats(next);
    }
  };

  const handlePick = (playerId: string) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    if (hasCustomPhoto(draft)) {
      setKeepPrompt({ playerId: player.id, playerName: player.name });
      setPickerOpen(false);
      return;
    }
    commitPick(player.id, false);
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        setDraft((current) => setStatCardPhoto(current, dataUrl));
        setStatus("Pasted photo into the frame.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const stem = playerName(draft) || "stat-card";
  const nextLine = nextStatCardLine(draft.stats);

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Stat card"
        identity={
          <label className="sc-field sc-field--wide">
            Name
            <input
              value={playerName(draft)}
              maxLength={32}
              onChange={(event) =>
                setDraft((current) =>
                  applyPlayerName(current, event.target.value),
                )
              }
            />
          </label>
        }
        data={
          <>
        <div className="sc-look" role="group" aria-label="Stat source">
          <span className="sc-look__label">Stats</span>
          <button
            type="button"
            className={
              parseStatCardSource(draft.source) === "last-game"
                ? "sc-chip is-on"
                : "sc-chip"
            }
            aria-pressed={parseStatCardSource(draft.source) === "last-game"}
            onClick={() => setSource("last-game")}
          >
            Last game
          </button>
          <button
            type="button"
            className={
              parseStatCardSource(draft.source) === "season"
                ? "sc-chip is-on"
                : "sc-chip"
            }
            aria-pressed={parseStatCardSource(draft.source) === "season"}
            onClick={() => setSource("season")}
          >
            Season avg
          </button>
        </div>
        <ComposerStatsSampleToggle
          sample={statsSample}
          onChange={(nextSample) => {
            setStatsSample(nextSample);
            void fillStats(draft, nextSample);
          }}
        />
        {source === "last-game" ? (
        <ComposerNightDate
          date={gameDate}
          todayIso={todayIso}
          yesterdayIso={yesterdayIso}
          onChange={setGameDate}
        />
        ) : (
        <label className="sc-field">
          Season
          <select
            value={draft.season || everyTeamCurrentSeason()}
            aria-label="Stat card season"
            disabled={!rostersReady}
            onChange={(event) => {
              const next = { ...draft, season: event.target.value };
              setDraft(next);
              void fillStats(next);
            }}
          >
            {everyTeamSeasons().map((option) => (
              <option key={option} value={option}>
                {option}
                {option === everyTeamCurrentSeason() ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        )}
          <ComposerPhotoHud
            onPick={() => setPickerOpen(true)}
            onUpload={(dataUrl) => {
              setDraft((current) => setStatCardPhoto(current, dataUrl));
              setStatus("Photo cropped inside the frame — pinch or drag.");
            }}
          />
          </>
        }
        filters={
          <>
        <span className="sc-toolbar__eyebrow">On-card stats</span>
        <p className="sc-hint">Drag a row on the graphic to reorder these slots.</p>
        {draft.stats.map((line, index) => (
          <div
            key={`${line.key}-${index}`}
            className="sc-field sc-field--stat-slot"
          >
            {`Stat ${index + 1}`}
            <div className="sc-stat-slot">
              <select
                value={line.key}
                aria-label={`Stat ${index + 1} on card`}
                onChange={(event) => {
                  const key = parseStatCardKey(event.target.value);
                  let next = {
                    ...draft,
                    stats: setStatCardLineKey(
                      draft.stats,
                      index,
                      key,
                      source,
                      lastGameRef.current?.stats,
                    ),
                  };
                  if (source === "season") {
                    next = fillStatCardFromSeason(
                      next,
                      next.season,
                      statsSample,
                    );
                  } else if (lastGameRef.current) {
                    next = fillStatCardFromGame(next, lastGameRef.current);
                  }
                  setDraft(next);
                  void fillStats(next);
                }}
              >
                {STAT_CARD_LINE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              {draft.stats.length > 1 ? (
                <button
                  type="button"
                  className="sc-chip sc-stat-slot__remove"
                  aria-label={`Remove stat ${index + 1} ${line.label}`}
                  onClick={() => {
                    const next = {
                      ...draft,
                      stats: removeStatCardLine(draft.stats, index),
                    };
                    setDraft(next);
                    void fillStats(next);
                  }}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="sc-chip"
          disabled={draft.stats.length >= STC_STAT_MAX}
          onClick={() => {
            let next = { ...draft, stats: addStatCardLine(draft.stats) };
            if (source === "season") {
              next = fillStatCardFromSeason(next, next.season, statsSample);
            } else if (lastGameRef.current) {
              next = fillStatCardFromGame(next, lastGameRef.current);
            }
            setDraft(next);
            void fillStats(next);
          }}
        >
          {nextLine ? `Add ${nextLine.label}` : "8 stats"}
        </button>
          </>
        }
        board={
          <>
            <ComposerLookToggle look={look} onChange={setLook} />
            <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
            <PhotoGradeToggle on={photoGrade} onChange={setPhotoGrade} />
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Matchup</span>
              <button
                type="button"
                className={draft.showMatchup ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={Boolean(draft.showMatchup)}
                aria-label="Show game matchup"
                onClick={() => {
                  setDraft((current) => {
                    const showMatchup = !current.showMatchup;
                    const matchup =
                      showMatchup && !clipStatMatchup(current.matchup ?? "")
                        ? formatStatCardMatchup(lastGameRef.current)
                        : current.matchup;
                    return { ...current, showMatchup, matchup };
                  });
                }}
              >
                {draft.showMatchup ? "On" : "Off"}
              </button>
            </label>
            <BaMarkToggle
              on={draft.showBa !== false}
              onChange={(showBa) =>
                setDraft((current) => ({ ...current, showBa }))
              }
            />
            <WatermarkToggle
              value={draft.watermark}
              onChange={(watermark) =>
                setDraft((current) => ({ ...current, watermark }))
              }
            />
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
              const loaded = normalizeStatCardDraft(next);
              setDraft(loaded);
              setStatus("Loaded named graphic.");
              void fillStats(loaded);
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
                setStatus("Undid last change.");
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
              setDraft(defaultStatCardDraft());
              setStatus("Board cleared.");
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void copyGraphicCaption(statCardLineCaption(draft)).then(
                () => setStatus("Caption copied."),
                () => setStatus("Could not copy caption."),
              );
            }}
          >
            Copy caption
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void handleExport(
                exportFilenameFromTitle(stem, "stat-card", "", true),
                true,
              )
            }
            disabled={exporting}
          >
            Export 9:16
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void (async () => {
                setExporting(true);
                setStatus("Rendering pack…");
                try {
                  const feed = exportFilenameFromTitle(stem, "stat-card");
                  await downloadExportPack(
                    () =>
                      renderStatCardCanvas(
                        { ...draft, look, purpleFlair, photoGrade },
                        2,
                      ),
                    feed,
                    [
                      {
                        filename: storyFilename(feed),
                        render: () =>
                          renderStatCardCanvas(
                            {
                              ...draft,
                              look,
                              purpleFlair,
                              photoGrade,
                              story: true,
                            },
                            2,
                          ),
                      },
                    ],
                    { letterbox: false },
                  );
                  setStatus("Pack download started (4:5 + 9:16).");
                } catch (error) {
                  console.error(error);
                  setStatus("Could not export pack.");
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
            <StatCardGraphic
              ref={boardRef}
              draft={draft}
              look={look}
              purpleFlair={purpleFlair}
              photoGrade={photoGrade}
              exporting={exporting}
              story={storyCrop}
              onNameChange={(value) =>
                setDraft((current) => applyPlayerName(current, value))
              }
              onStatValue={(index, value) =>
                setDraft((current) => ({
                  ...current,
                  stats: current.stats.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, value } : row,
                  ),
                }))
              }
              onStatLabel={(index, value) =>
                setDraft((current) => ({
                  ...current,
                  stats: current.stats.map((row, rowIndex) =>
                    rowIndex === index
                      ? { ...row, label: clipStatLabel(value) }
                      : row,
                  ),
                }))
              }
              onPan={(pan) => setDraft((current) => ({ ...current, pan }))}
              onUpload={(dataUrl) => {
                setDraft((current) => setStatCardPhoto(current, dataUrl));
                setStatus("Photo cropped inside the frame — pinch or drag.");
              }}
              onPick={() => setPickerOpen(true)}
              onRemoveStat={(index) => {
                const next = {
                  ...draft,
                  stats: removeStatCardLine(draft.stats, index),
                };
                setDraft(next);
                void fillStats(next);
              }}
              onMoveStat={(fromIndex, toIndex) => {
                setDraft((current) => ({
                  ...current,
                  stats: moveStatCardLine(current.stats, fromIndex, toIndex),
                }));
              }}
              onMatchupChange={(matchup) =>
                setDraft((current) => ({ ...current, matchup }))
              }
            />
          </ComposerBoard>
          <p className="sc-hint">
            Empty photo first — pick a player for the team-color name bar and
            3 huge stats on a light panel, then upload the action shot. 9:16 is a
            real story board (photo on top, stats in a row), not a letterboxed
            4:5. Drag a stat row on the graphic to reorder Stat 1–8 in the HUD.
            Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {pickerOpen ? (
        <PlayerPicker
          heading="Pick a player"
          hint="Fills the name bar, team color, and stats. No mugshot — upload or paste the action photo."
          currentId={draft.playerId}
          usedLabels={draft.playerId ? { [draft.playerId]: "Stat card" } : {}}
          suggested={
            source === "last-game"
              ? nightStandoutPickerRows(night.standouts)
              : []
          }
          suggestedHeading={night.heading}
          suggestedLoading={night.loading}
          onPick={handlePick}
          onClear={() => {
            push(draft);
            setDraft((current) => clearStatCardSubject(current));
            setPickerOpen(false);
          }}
          onClose={closePicker}
        />
      ) : null}
      {keepPrompt ? (
        <KeepCustomPhotoDialog
          playerName={keepPrompt.playerName}
          onKeep={() => commitPick(keepPrompt.playerId, true)}
          onReplace={() => commitPick(keepPrompt.playerId, false)}
          onClose={() => setKeepPrompt(null)}
        />
      ) : null}
    </div>
  );
}
