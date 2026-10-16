import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { ComposerNightDate } from "../instagramComposer/ComposerNightDate";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { WatermarkToggle } from "../instagramComposer/WatermarkToggle";
import {
  nightStandoutPickerRows,
  useComposerNight,
} from "../instagramComposer/composerNight";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import {
  COMPARE_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { copyGraphicCaption } from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  COMPARE_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { fetchLastGame } from "../playerOfTheDayComposer/lastGame";
import {
  everyTeamCurrentSeason,
  everyTeamSeasons,
  loadEveryTeamRosters,
} from "../everyTeamComposer/historicalRosters";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { CompareGraphic } from "./CompareGraphic";
import {
  GRAPHIC_HEIGHT,
  STORY_DESIGN_HEIGHT,
} from "./compareLayout";
import { exportComparePng } from "./exportComparePng";
import { renderCompareCanvas } from "./renderCompareCanvas";
import {
  addCompareStat,
  applySideStatValues,
  autoCompareStatsLabel,
  compareCaptionFor,
  clearCompareSide,
  COMPARE_STAT_COUNT,
  COMPARE_STAT_MAX,
  COMPARE_STAT_PRESETS,
  defaultCompareDraft,
  nextCompareStat,
  effectiveCompareSeason,
  fillCompareSide,
  hasCustomPhoto,
  isCompareDraft,
  normalizeCompareDraft,
  parseCompareStatKey,
  parseCompareStatsMode,
  patchCompareStat,
  removeCompareStat,
  setComparePhoto,
  setCompareStatKey,
  statsFromLastGame,
  statsFromSeason,
  type CompareDraft,
  type CompareStatsMode,
} from "./compareState";
import "@fontsource/montserrat/latin-900.css";
import "./compareComposer.css";

const STORAGE_KEY = "ddgm:compare-composer";
const SAVES_KEY = "ddgm:compare-composer:saves";

const loadDraft = (): CompareDraft => {
  const stored = readJson<Partial<CompareDraft>>(STORAGE_KEY);
  if (isCompareDraft(stored)) {
    return normalizeCompareDraft(stored);
  }
  return defaultCompareDraft();
};

export function CompareComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultCompareDraft();
  const [draft, setDraft] = useState<CompareDraft>(empty);
  const [picker, setPicker] = useState<0 | 1 | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [rostersReady, setRostersReady] = useState(false);
  const [look, setLook] = useComposerLook(COMPARE_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] = usePhotoGrade();
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [keepPrompt, setKeepPrompt] = useState<{
    side: 0 | 1;
    playerId: string;
    playerName: string;
  } | null>(null);
  const [storyCrop, setStoryCrop] = useState(false);
  const { push, pop, canUndo } = useComposerUndo<CompareDraft>();
  const night = useComposerNight();

  useEffect(() => {
    document.title = "Comparison graphic";
  }, []);

  useEffect(() => {
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
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, draft);
  }, [draft, hydrated]);

  const fillStats = async (
    snapshot: CompareDraft,
    side?: 0 | 1,
    playerId?: string,
    sample = statsSample,
    onDate = night.date,
  ) => {
    const mode = parseCompareStatsMode(snapshot.statsMode);
    const sides: Array<0 | 1> = side == null ? [0, 1] : [side];
    let nextStats = snapshot.stats;
    for (const index of sides) {
      const person = snapshot.sides[index]!;
      const id = playerId && index === side ? playerId : person.playerId;
      if (!id) {
        nextStats = applySideStatValues(nextStats, index, nextStats.map(() => ""));
        continue;
      }
      if (mode === "game") {
        const game = await fetchLastGame(id, sample, onDate);
        nextStats = applySideStatValues(
          nextStats,
          index,
          statsFromLastGame(game, nextStats),
        );
      } else {
        const season = effectiveCompareSeason(snapshot, index);
        nextStats = applySideStatValues(
          nextStats,
          index,
          statsFromSeason(id, person.teamId, season, nextStats, sample),
        );
      }
    }
    setDraft((current) => ({ ...current, stats: nextStats }));
  };

  const commitPick = (side: 0 | 1, playerId: string, keep: boolean) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    push(draft);
    const nextSides = [...draft.sides] as CompareDraft["sides"];
    nextSides[side] = fillCompareSide(player, draft.sides[side]!, keep);
    const next = { ...draft, sides: nextSides };
    setDraft(next);
    setPicker(null);
    setKeepPrompt(null);
    setStatus(
      keep
        ? `Kept the photo for ${player.name}.`
        : `Filled ${player.name} — upload an action photo.`,
    );
    void fillStats(next, side, player.id);
  };

  useEffect(() => {
    if (picker == null) {
      return;
    }
    void night.ensureStandouts(night.date);
  }, [picker, night.date, night.ensureStandouts]);

  const handlePick = (playerId: string) => {
    if (picker == null) {
      return;
    }
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    if (hasCustomPhoto(draft.sides[picker]!)) {
      setKeepPrompt({
        side: picker,
        playerId: player.id,
        playerName: player.name,
      });
      setPicker(null);
      return;
    }
    commitPick(picker, player.id, false);
  };

  const setStatsMode = (statsMode: CompareStatsMode) => {
    if (parseCompareStatsMode(draft.statsMode) === statsMode) {
      return;
    }
    const season = draft.season || everyTeamCurrentSeason();
    const previousAuto = autoCompareStatsLabel(
      parseCompareStatsMode(draft.statsMode),
      season,
    );
    const statsLabel =
      !draft.statsLabel.trim() || draft.statsLabel === previousAuto
        ? autoCompareStatsLabel(statsMode, season)
        : draft.statsLabel;
    const next = { ...draft, statsMode, statsLabel };
    setDraft(next);
    void fillStats(next);
  };

  const setSharedSeason = (season: string) => {
    const mode = parseCompareStatsMode(draft.statsMode);
    const previousAuto = autoCompareStatsLabel(mode, draft.season || season);
    const statsLabel =
      mode === "season" &&
      (!draft.statsLabel.trim() || draft.statsLabel === previousAuto)
        ? autoCompareStatsLabel(mode, season)
        : draft.statsLabel;
    const next = { ...draft, season, statsLabel };
    setDraft(next);
    if (mode === "season") {
      void fillStats(next);
    }
  };

  const setSideSeason = (side: 0 | 1, value: string) => {
    const sideSeasons = [...(draft.sideSeasons ?? [null, null])] as [
      string | null,
      string | null,
    ];
    sideSeasons[side] = value || null;
    const next = { ...draft, sideSeasons };
    setDraft(next);
    if (parseCompareStatsMode(draft.statsMode) === "season") {
      void fillStats(next, side);
    }
  };

  const handleExport = async (filename?: string, story = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportComparePng(
        node,
        filename ?? exportFilenameFromTitle(draft.title, "compare"),
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

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        const side = picker ?? 0;
        setDraft((current) => {
          const sides = [...current.sides] as CompareDraft["sides"];
          sides[side] = setComparePhoto(current.sides[side]!, dataUrl);
          return { ...current, sides };
        });
        setStatus("Pasted photo.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [picker]);

  const closePicker = useCallback(() => setPicker(null), []);
  const used: Record<string, string> = {};
  draft.sides.forEach((side, index) => {
    if (side.playerId) {
      used[side.playerId] = index === 0 ? "Left" : "Right";
    }
  });
  const seasons = everyTeamSeasons();
  const mode = parseCompareStatsMode(draft.statsMode);
  const nextStat = nextCompareStat(draft.stats);

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Compare"
        identity={
          <>
          <label className="sc-field sc-field--wide">
          Title
          <input
            value={draft.title}
            maxLength={36}
            onChange={(event) =>
              onComposerTextChange(
                event,
                (title) => setDraft((current) => ({ ...current, title })),
                36,
              )
            }
          />
        </label>
        <TitlePresetSelect
          value={draft.title}
          presets={COMPARE_TITLE_PRESETS}
          onChange={(title) => setDraft((current) => ({ ...current, title }))}
        />
          </>
        }
        data={
          <>
        <div className="sc-look" role="group" aria-label="Stats source">
          <span className="sc-look__label">Stats</span>
          <button
            type="button"
            className={mode === "season" ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={mode === "season"}
            onClick={() => setStatsMode("season")}
          >
            Season avg
          </button>
          <button
            type="button"
            className={mode === "game" ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={mode === "game"}
            onClick={() => setStatsMode("game")}
          >
            Last game
          </button>
        </div>
        <ComposerStatsSampleToggle
          sample={statsSample}
          onChange={(nextSample) => {
            setStatsSample(nextSample);
            void fillStats(draft, undefined, undefined, nextSample);
          }}
        />
        {mode === "game" ? (
          <ComposerNightDate
            date={night.date}
            todayIso={night.todayIso}
            yesterdayIso={night.yesterdayIso}
            onChange={(iso) => {
              night.setDate(iso);
              void fillStats(draft, undefined, undefined, statsSample, iso);
            }}
          />
        ) : null}
        <label className="sc-field">
          Season
          <select
            value={draft.season || everyTeamCurrentSeason()}
            aria-label="Shared compare season"
            disabled={!rostersReady || mode !== "season"}
            onChange={(event) => setSharedSeason(event.target.value)}
          >
            {seasons.map((option) => (
              <option key={option} value={option}>
                {option}
                {option === everyTeamCurrentSeason() ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="sc-field">
          Left season
          <select
            value={draft.sideSeasons?.[0] ?? ""}
            aria-label="Left player season"
            disabled={!rostersReady || mode !== "season"}
            onChange={(event) => setSideSeason(0, event.target.value)}
          >
            <option value="">Same</option>
            {seasons.map((option) => (
              <option key={`left-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="sc-field">
          Right season
          <select
            value={draft.sideSeasons?.[1] ?? ""}
            aria-label="Right player season"
            disabled={!rostersReady || mode !== "season"}
            onChange={(event) => setSideSeason(1, event.target.value)}
          >
            <option value="">Same</option>
            {seasons.map((option) => (
              <option key={`right-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {draft.stats.map((stat, index) => (
          <label key={`cmp-key-${stat.key}-${index}`} className="sc-field">
            Stat {index + 1}
            <select
              value={stat.key}
              aria-label={`Compare stat ${index + 1}`}
              onChange={(event) => {
                const key = parseCompareStatKey(event.target.value);
                const next = {
                  ...draft,
                  stats: setCompareStatKey(draft.stats, index, key),
                };
                setDraft(next);
                void fillStats(next);
              }}
            >
              {COMPARE_STAT_PRESETS.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button
          type="button"
          className="sc-chip"
          disabled={draft.stats.length >= COMPARE_STAT_MAX}
          onClick={() => {
            const next = { ...draft, stats: addCompareStat(draft.stats) };
            setDraft(next);
            void fillStats(next);
          }}
        >
          {nextStat ? `Add ${nextStat.label}` : "10 stats"}
        </button>
        {draft.stats.length > COMPARE_STAT_COUNT ? (
          <button
            type="button"
            className="sc-chip"
            onClick={() => {
              const next = {
                ...draft,
                stats: removeCompareStat(
                  draft.stats,
                  draft.stats.length - 1,
                ),
              };
              setDraft(next);
              void fillStats(next);
            }}
          >
            {draft.stats.length === COMPARE_STAT_COUNT + 1
              ? "5 stats"
              : "Remove last"}
          </button>
        ) : null}
          </>
        }
        board={
          <>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <PhotoGradeToggle on={photoGrade} onChange={setPhotoGrade} intensity={gradeIntensity} onIntensityChange={setGradeIntensity} />
        <BaMarkToggle
          on={draft.showBa !== false}
          onChange={(showBa) => setDraft((current) => ({ ...current, showBa }))}
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
            const loaded = normalizeCompareDraft(next);
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
              setDraft(defaultCompareDraft());
              setStatus("Board cleared.");
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void copyGraphicCaption(compareCaptionFor(draft)).then(
                () => setStatus("Caption copied."),
                () => setStatus("Could not copy caption."),
              )
            }
          >
            Copy caption
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void handleExport(
                exportFilenameFromTitle(draft.title, "compare", "", true),
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
                try {
                  const feed = exportFilenameFromTitle(draft.title, "compare");
                  const input = { ...draft, look, purpleFlair, photoGrade };
                  await downloadExportPack(
                    () => renderCompareCanvas(input, 2),
                    feed,
                    [
                      {
                        filename: storyFilename(feed),
                        render: () =>
                          renderCompareCanvas({ ...input, story: true }, 2),
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
            <CompareGraphic
              ref={boardRef}
              draft={draft}
              look={look}
              purpleFlair={purpleFlair}
              photoGrade={photoGrade}
              exporting={exporting}
              story={storyCrop}
              onTitleChange={(title) =>
                setDraft((current) => ({ ...current, title }))
              }
              onSubtitleChange={(subtitle) =>
                setDraft((current) => ({ ...current, subtitle }))
              }
              onStatsLabelChange={(statsLabel) =>
                setDraft((current) => ({ ...current, statsLabel }))
              }
              onStatChange={(index, patch) =>
                setDraft((current) => ({
                  ...current,
                  stats: patchCompareStat(current.stats, index, patch),
                }))
              }
              onPick={setPicker}
              onPan={(side, pan) =>
                setDraft((current) => {
                  const sides = [...current.sides] as CompareDraft["sides"];
                  sides[side] = { ...current.sides[side]!, pan };
                  return { ...current, sides };
                })
              }
              onUpload={(side, dataUrl) =>
                setDraft((current) => {
                  const sides = [...current.sides] as CompareDraft["sides"];
                  sides[side] = setComparePhoto(current.sides[side]!, dataUrl);
                  return { ...current, sides };
                })
              }
            />
            <StoryCropGuide on={storyCrop} />
          </ComposerBoard>
          <p className="sc-hint">
            Empty photos first — pick two players for this-season averages,
            then upload action shots. Number + label stack on each side; the
            leader highlights. Toggle last-game or a per-side season. Downloads
            a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
      {picker != null ? (
        <PlayerPicker
          heading={picker === 0 ? "Pick left player" : "Pick right player"}
          hint="Same or different people. Stats fill from this season’s averages unless you switch to last game."
          currentId={draft.sides[picker]?.playerId}
          usedLabels={used}
          suggested={nightStandoutPickerRows(night.standouts)}
          suggestedHeading={night.heading}
          suggestedLoading={night.loading}
          onPick={handlePick}
          onClear={() => {
            push(draft);
            const nextSides = [...draft.sides] as CompareDraft["sides"];
            nextSides[picker] = clearCompareSide();
            const next = {
              ...draft,
              sides: nextSides,
              stats: applySideStatValues(
                draft.stats,
                picker,
                draft.stats.map(() => ""),
              ),
            };
            setDraft(next);
            setPicker(null);
          }}
          onClose={closePicker}
        />
      ) : null}
      {keepPrompt ? (
        <KeepCustomPhotoDialog
          playerName={keepPrompt.playerName}
          onKeep={() => commitPick(keepPrompt.side, keepPrompt.playerId, true)}
          onReplace={() =>
            commitPick(keepPrompt.side, keepPrompt.playerId, false)
          }
          onClose={() => setKeepPrompt(null)}
        />
      ) : null}
    </div>
  );
}
