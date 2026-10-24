import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import { TeamHairlineToggle } from "../instagramComposer/TeamHairlineToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerPhotoHud } from "../instagramComposer/ComposerPhotoHud";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { ComposerDateRange } from "../instagramComposer/ComposerDateRange";
import {
  isAutoWeekLine,
  rangeWeekLine,
  useComposerDateRange,
} from "../instagramComposer/composerDateRange";
import {
  copyGraphicCaption,
  graphicCaption,
  stripCaptionName,
} from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { keepComposerPhotos } from "../instagramComposer/composerPhotos";
import { ComposerNamesToggle } from "../instagramComposer/ComposerNamesToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { StripStatHud } from "../instagramComposer/StripStatHud";
import { stripStatCaption } from "../instagramComposer/stripStatCaption";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import {
  everyTeamCurrentSeason,
  loadEveryTeamRosters,
  parseEveryTeamStatMetric,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  TEAM_OF_THE_WEEK_LOOK_KEY,
  parseShowTeamHairline,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  fetchRangeProduction,
  type NightStandout,
} from "../playerOfTheDayComposer/nightStandouts";
import {
  fillStartersFromStandouts,
  totwGames,
  totwPickerEmpty,
  totwPickerHeading,
  totwPickerSuggestions,
} from "../teamOfTheWeekPlusComposer/teamOfTheWeekPlusState";
import {
  TOTW_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { totwBoardH } from "./teamOfTheWeekLayout";
import { TeamOfTheWeekGraphic } from "./TeamOfTheWeekGraphic";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { exportTeamOfTheWeekPng } from "./exportTeamOfTheWeekPng";
import { renderTeamOfTheWeekCanvas } from "./renderTeamOfTheWeekCanvas";
import { exportTotwStatsPng } from "./exportTotwStatsPng";
import { renderTotwStatsCanvas } from "./renderTotwStatsCanvas";
import { TotwStatsExportHud } from "./TotwStatsExportHud";
import { TotwStatsGraphic } from "./TotwStatsGraphic";
import {
  buildTotwStatsSheet,
  totwStatsHasRows,
  totwStatsPngFilename,
} from "./totwStatsExport";
import {
  applyPlayerPick,
  clearStrip,
  defaultTotwDraft,
  hasCustomPhoto,
  isTotwDraft,
  patchStrip,
  setStripPhoto,
  swapStrips,
  usedPlayerIds,
  type TotwDraft,
  type TotwStrip,
} from "./teamOfTheWeekState";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-900-italic.css";
import "./teamOfTheWeekComposer.css";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";
import {
  nextEmptySlotIndex,
  slotMissingPlayer,
} from "../instagramComposer/nextEmptySlot";
import {
  fillQualityMessage,
  showComposerToast,
} from "../instagramComposer/composerFillToast";

const STORAGE_KEY = "ddgm:team-of-the-week-composer";
const SAVES_KEY = "ddgm:team-of-the-week-composer:saves";

const loadDraft = (): TotwDraft => {
  const stored = readJson<Partial<TotwDraft>>(STORAGE_KEY);
  if (isTotwDraft(stored)) {
    return {
      ...stored,
      showNames: stored.showNames === true,
      showTeamHairline: parseShowTeamHairline(stored.showTeamHairline),
      showStripStat: stored.showStripStat === true,
      stripStatMetric: parseEveryTeamStatMetric(stored.stripStatMetric),
    };
  }
  const empty = defaultTotwDraft();
  return {
    brand: stored?.brand?.trim() ? stored.brand : empty.brand,
    title: stored?.title?.trim() ? stored.title : empty.title,
    week: stored?.week?.trim() ? stored.week : empty.week,
    strips: empty.strips,
    showBa: stored?.showBa === true,
    showNames: stored?.showNames === true,
    showTeamHairline: parseShowTeamHairline(stored?.showTeamHairline),
    showStripStat: stored?.showStripStat === true,
    stripStatMetric: parseEveryTeamStatMetric(stored?.stripStatMetric),
  };
};

export function TeamOfTheWeekComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultTotwDraft();
  const [brand, setBrand] = useState(empty.brand);
  const [title, setTitle] = useState(empty.title);
  const [week, setWeek] = useState(empty.week);
  const [strips, setStrips] = useState<TotwStrip[]>(empty.strips);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoTarget, setPhotoTarget] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(TEAM_OF_THE_WEEK_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] = usePhotoGrade();
  const [showBa, setShowBa] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [showTeamHairline, setShowTeamHairline] = useState(true);
  const [storyCrop, setStoryCrop] = useState(false);
  const [showStripStat, setShowStripStat] = useState(false);
  const [stripStatMetric, setStripStatMetric] =
    useState<EveryTeamStatMetric>("points");
  const [statsSample] = useComposerStatsSample();
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<TotwStrip[]>();
  const { range, setRange } = useComposerDateRange();
  const [weekRows, setWeekRows] = useState<NightStandout[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);
  const [statsSheet, setStatsSheet] = useState(false);
  const totwEmpty = (slots: TotwStrip[]) => slots.every((slot) => !slot.playerId);

  const loadWeek = useCallback(async (fromIso: string, toIso: string) => {
    setWeekLoading(true);
    try {
      const rows = await fetchRangeProduction(fromIso, toIso);
      setWeekRows(rows);
      return rows;
    } finally {
      setWeekLoading(false);
    }
  }, []);

  const fillRange = useCallback(async (
    force = false,
    fromIso = range.from,
    toIso = range.to,
  ) => {
    setStatus("Loading box scores for this range…");
    try {
      const rows = await loadWeek(fromIso, toIso);
      setWeek((current) =>
        isAutoWeekLine(current, fromIso, toIso)
          ? rangeWeekLine(fromIso, toIso)
          : current,
      );
      setStrips((current) => {
        if (!force && !totwEmpty(current)) {
          return current;
        }
        const next = fillStartersFromStandouts(current, rows);
        const filled = next.filter((slot) => slot.playerId);
        setStatus(
          filled.length
            ? "Filled PG–C."
            : "No box scores for this range yet — pick players for the empty slots.",
        );
        const toast = fillQualityMessage(
          statsSample,
          rows.map((row) => totwGames(row)),
        );
        if (toast) {
          showComposerToast(toast);
        }
        return next;
      });
    } catch (error) {
      console.error(error);
      setStatus("Could not load this range’s standouts.");
    }
  }, [loadWeek, range.from, range.to, statsSample]);

  useEffect(() => {
    document.title = "Team of the Week graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setTitle(draft.title);
    setWeek(draft.week);
    setStrips(draft.strips);
    setShowBa(draft.showBa === true);
    setShowNames(draft.showNames === true);
    setShowTeamHairline(parseShowTeamHairline(draft.showTeamHairline));
    setShowStripStat(draft.showStripStat === true);
    setStripStatMetric(parseEveryTeamStatMetric(draft.stripStatMetric));
    setHydrated(true);
    void loadEveryTeamRosters().catch((error: unknown) => {
      console.error(error);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void loadWeek(range.from, range.to);
  }, [hydrated, loadWeek, range.from, range.to]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, {
      brand,
      title,
      week,
      strips,
      showBa,
      showNames,
      showTeamHairline,
      showStripStat,
      stripStatMetric,
    });
  }, [brand, title, week, strips, showBa, showNames, showTeamHairline, showStripStat, stripStatMetric, hydrated]);

  const closePicker = useCallback(() => setActiveIndex(null), []);
  const stripStats = showStripStat
    ? strips.map((strip) =>
        stripStatCaption(
          strip.playerId,
          stripStatMetric,
          everyTeamCurrentSeason(),
          statsSample,
        ),
      )
    : [];

  const handleExport = async (
    filename?: string,
    story = false,
    square = false,
  ) => {
    const node = boardRef.current;
    if (!statsSheet && !node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setStatus(statsSheet ? "Rendering week stats…" : "Rendering PNG…");
    setActiveIndex(null);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      if (statsSheet) {
        const sheet = buildTotwStatsSheet({
          brand,
          title,
          week,
          strips,
          weekRows,
        });
        if (!totwStatsHasRows(sheet)) {
          setStatus("Fill the lineup to export week stats.");
          return;
        }
        await exportTotwStatsPng(
          sheet,
          filename ?? totwStatsPngFilename(sheet, story),
          { look, purpleFlair, showBa },
          story,
          square,
        );
      } else {
        if (!node) {
          setStatus("Graphic is not ready to export.");
          return;
        }
        await exportTeamOfTheWeekPng(
          node,
          filename ?? exportFilenameFromTitle(title, "team-of-the-week", week),
          {
            brand,
            title,
            week,
            strips,
            look,
            purpleFlair,
            photoGrade,
            showBa,
            showNames,
            showTeamHairline,
            stripStats,
          },
          story,
          square,
        );
      }
      setStatus(
        square
          ? "1:1 PNG download started."
          : story
            ? "Story PNG download started."
            : statsSheet
              ? "Week stats PNG download started."
              : "Download started.",
      );
    } catch (error) {
      console.error(error);
      setStatus("Could not export PNG.");
    } finally {
      setExporting(false);
    }
  };

  const applyTotwDraft = (
    next: ReturnType<typeof defaultTotwDraft>,
    status: string,
  ) => {
    push(strips);
    setBrand(next.brand);
    setTitle(next.title);
    setWeek(next.week);
    setStrips(next.strips);
    setShowNames(next.showNames === true);
    setShowTeamHairline(parseShowTeamHairline(next.showTeamHairline));
    setShowStripStat(next.showStripStat === true);
    setStripStatMetric(parseEveryTeamStatMetric(next.stripStatMetric));
    setActiveIndex(null);
    setStatus(status);
  };

  const handleResetKeepPhotos = () => {
    const blank = defaultTotwDraft();
    applyTotwDraft(
      keepComposerPhotos(blank, {
        ...blank,
        brand,
        title,
        week,
        strips,
        showBa,
        showNames,
        showTeamHairline,
        showStripStat,
        stripStatMetric,
      }),
      "Reset — photos kept.",
    );
  };

  const handleReset = () => {
    if (!confirmBlankPost()) {
      return;
    }
    applyTotwDraft(defaultTotwDraft(), "Blank post.");
  };

  const commitPick = (
    index: number,
    playerId: string,
    keepCustomPhoto: boolean,
  ) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    push(strips);
    const next = applyPlayerPick(strips, index, player, keepCustomPhoto);
    setStrips(next);
    setActiveIndex(nextEmptySlotIndex(next, index, slotMissingPlayer));
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name} in strip ${index + 1}.`
        : `Filled ${player.name} in strip ${index + 1}.`,
    );
  };

  const handlePick = (playerId: string) => {
    if (activeIndex == null) {
      return;
    }
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    const current = strips[activeIndex];
    if (current && hasCustomPhoto(current)) {
      setKeepPrompt({
        index: activeIndex,
        playerId: player.id,
        playerName: player.name,
      });
      setActiveIndex(null);
      return;
    }
    commitPick(activeIndex, player.id, false);
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        const index = activeIndex ?? photoTarget;
        setStrips((current) => setStripPhoto(current, index, dataUrl));
        setStatus("Pasted photo into the strip.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeIndex, photoTarget]);

  const currentId =
    activeIndex != null ? strips[activeIndex]?.playerId ?? null : null;
  const pickerUsed = usedPlayerIds(strips);
  const pickerUsedIds = new Set(
    Object.keys(pickerUsed).filter((id) => id !== currentId),
  );
  const stats = useMemo(
    () =>
      buildTotwStatsSheet({
        brand,
        title,
        week,
        strips,
        weekRows,
      }),
    [brand, title, week, strips, weekRows],
  );

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Team of the Week"
        identity={
          <>
        <label className="sc-field sc-field--wide">
          Title
          <input
            value={title}
            maxLength={COMPOSER_TITLE_MAX_LENGTH}
            onChange={(event) => onComposerTextChange(event, setTitle)}
          />
        </label>
        <TitlePresetSelect
          value={title}
          presets={TOTW_TITLE_PRESETS}
          onChange={setTitle}
        />
        <label className="sc-field sc-field--wide">
          Week
          <input
            value={week}
            maxLength={40}
            onChange={(event) => setWeek(event.target.value.slice(0, 40))}
          />
        </label>
          </>
        }
        data={
          <>
          <ComposerDateRange
            from={range.from}
            to={range.to}
            simpleSet="week"
            onChange={(next) => {
              const written = setRange(next);
              void fillRange(false, written.from, written.to);
            }}
            onFill={() => void fillRange(true)}
            fillLabel="Fill range"
          />
          <ComposerPhotoHud
            onPick={() => {
              const index = activeIndex ?? photoTarget;
              setPhotoTarget(index);
              setActiveIndex(index);
            }}
            onUpload={(dataUrl) => {
              const index = activeIndex ?? photoTarget;
              setStrips((current) => setStripPhoto(current, index, dataUrl));
              setStatus("Photo cropped in the strip.");
            }}
            onUploadMany={(urls) => {
              const start = activeIndex ?? photoTarget;
              setStrips((current) => {
                let next = current;
                urls.forEach((url, offset) => {
                  next = setStripPhoto(next, start + offset, url);
                });
                return next;
              });
            }}
          />
          </>
        }
        board={
          <>
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
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <PhotoGradeToggle on={photoGrade} onChange={setPhotoGrade} intensity={gradeIntensity} onIntensityChange={setGradeIntensity} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <TeamHairlineToggle on={showTeamHairline} onChange={setShowTeamHairline} />
        <ComposerNamesToggle
          on={showNames}
          onChange={setShowNames}
          ariaLabel="Show first and last names"
        />
        <StripStatHud
          on={showStripStat}
          metric={stripStatMetric}
          onToggle={setShowStripStat}
          onMetric={setStripStatMetric}
        />
          </>
        }
        persist={
        <>
        <TotwStatsExportHud
          sheet={stats}
          statsSheet={statsSheet}
          onStatsSheet={setStatsSheet}
          onStatus={setStatus}
        />
        <ComposerSaves
          storageKey={SAVES_KEY}
          board={{
            brand,
            title,
            week,
            strips,
            showBa,
            showNames,
            showTeamHairline,
            showStripStat,
            stripStatMetric,
          }}
          onLoad={(next) => {
            setBrand(next.brand);
            setTitle(next.title);
            setWeek(next.week);
            setStrips(next.strips);
            setShowBa(next.showBa === true);
            setShowNames(next.showNames === true);
            setShowTeamHairline(parseShowTeamHairline(next.showTeamHairline));
            setShowStripStat(next.showStripStat === true);
            setStripStatMetric(parseEveryTeamStatMetric(next.stripStatMetric));
            setStatus("Loaded named graphic.");
          }}
        />
        </>
        }
        actions={
          <>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              const previous = pop();
              if (previous) {
                setStrips(previous);
                setStatus("Undid last change.");
              }
            }}
            disabled={!canUndo}
          >
            Undo
          </button>
          <button type="button" className="sc-btn sc-btn--ghost" onClick={handleResetKeepPhotos}>
            Reset keep photos
          </button>
          <button type="button" className="sc-btn sc-btn--ghost" onClick={handleReset}>
            Blank post
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void copyGraphicCaption(
                graphicCaption(
                  title,
                  strips.map(stripCaptionName).filter(Boolean),
                  [week],
                ),
              ).then(
                () => setStatus("Caption copied."),
                () => setStatus("Could not copy caption."),
              );
            }}
          >
            Copy caption
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost sc-hud-full-only"
            onClick={() =>
              void handleExport(
                exportFilenameFromTitle(title, "team-of-the-week", week, true),
                true,
              )
            }
            disabled={exporting}
          >
            Export 9:16
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost sc-btn--aside sc-hud-full-only"
            onClick={() => void handleExport(undefined, false, true)}
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
                setStatus("Rendering pack…");
                setActiveIndex(null);
                try {
                  if (statsSheet) {
                    const sheet = buildTotwStatsSheet({
                      brand,
                      title,
                      week,
                      strips,
                      weekRows,
                    });
                    if (!totwStatsHasRows(sheet)) {
                      setStatus("Fill the lineup to export week stats.");
                      return;
                    }
                    const feed = totwStatsPngFilename(sheet);
                    await downloadExportPack(
                      () =>
                        renderTotwStatsCanvas(
                          sheet,
                          { look, purpleFlair, showBa },
                          2,
                        ),
                      feed,
                    );
                  } else {
                    const input = {
                      brand,
                      title,
                      week,
                      strips,
                      look,
                      purpleFlair,
                      photoGrade,
                      showBa,
                      showNames,
                      showTeamHairline,
                      stripStats,
                    };
                    const feed = exportFilenameFromTitle(
                      title,
                      "team-of-the-week",
                      week,
                    );
                    await downloadExportPack(
                      () => renderTeamOfTheWeekCanvas(input, 2),
                      feed,
                      [
                        {
                          filename: storyFilename(feed),
                          render: () =>
                            renderTeamOfTheWeekCanvas(
                              { ...input, story: true },
                              2,
                            ),
                        },
                      ],
                      { letterbox: false },
                    );
                  }
                  setStatus("Pack download started (4:5 + 9:16 + 1:1).");
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
          <ComposerBoard height={totwBoardH(storyCrop)}>
          {statsSheet ? (
            <TotwStatsGraphic
              sheet={stats}
              look={look}
              purpleFlair={purpleFlair}
              showBa={showBa}
              exporting={exporting}
              onBrandChange={setBrand}
            />
          ) : (
          <TeamOfTheWeekGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            week={week}
            strips={strips}
            look={look}
            purpleFlair={purpleFlair}
            photoGrade={photoGrade}
            showBa={showBa}
            showNames={showNames}
            showTeamHairline={showTeamHairline}
            stripStats={stripStats}
            exporting={exporting}
            story={storyCrop}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onWeekChange={setWeek}
            onHover={setPhotoTarget}
            onPick={(index) => {
              setPhotoTarget(index);
              setActiveIndex(index);
            }}
            onPan={(index, pan) => {
              setPhotoTarget(index);
              setStrips((current) => patchStrip(current, index, { pan }));
            }}
            onUpload={(index, dataUrl) => {
              setPhotoTarget(index);
              setStrips((current) => setStripPhoto(current, index, dataUrl));
              setStatus(
                "Photo cropped inside the strip — pinch, scroll, or +/− to scale, drag to pan.",
              );
            }}
            onNameChange={(index, names) => {
              setStrips((current) => patchStrip(current, index, names));
            }}
            onSwap={(from, to) => {
              push(strips);
              setStrips((current) => swapStrips(current, from, to));
              setStatus("Swapped player slots.");
            }}
          />
          )}
          </ComposerBoard>
          <StoryCropGuide on={storyCrop} />
          <p className="sc-hint">
            Fill range picks the week’s best five, packed PG, SG, SF, PF, C
            among whoever made it — 2+ games (extra GP can break a close call), counting mixed
            with TS%/eFG% and docked for turnovers. Mix is rough, not a 2G quota.
            Stars belong here, not surprise over-expectation nights.
            Then upload or paste a photo. Drag a player on the preview to swap
            slots — photos, names, and logos move together. Drag inside a photo
            to pan, pinch or scroll to zoom — same as Player of the Day.
            Stats sheet (Copy stats / CSV / Export PNG) dumps the filled PG–C
            line — GP, PTS, REB, AST, STL, BLK, 3PM, FG%, 3P%, TS%, eFG% —
            without crowding the headshots. Downloads a
            4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={`Pick player ${activeIndex + 1}`}
          hint="Gold cards are the most deserving remaining players for this slot — same ranking as Fill, by position. Search still lists everyone."
          currentId={currentId}
          usedLabels={pickerUsed}
          suggested={totwPickerSuggestions(weekRows, activeIndex, pickerUsedIds)}
          suggestedHeading={totwPickerHeading(activeIndex)}
          suggestedLoading={weekLoading}
          suggestedEmpty={totwPickerEmpty(activeIndex)}
          onPick={handlePick}
          onClear={() => {
            push(strips);
            setStrips((current) => clearStrip(current, activeIndex));
            setActiveIndex(null);
          }}
          onClose={closePicker}
        />
      ) : null}
      {keepPrompt ? (
        <KeepCustomPhotoDialog
          playerName={keepPrompt.playerName}
          onKeep={() => commitPick(keepPrompt.index, keepPrompt.playerId, true)}
          onReplace={() =>
            commitPick(keepPrompt.index, keepPrompt.playerId, false)
          }
          onClose={() => setKeepPrompt(null)}
        />
      ) : null}
    </div>
  );
}
