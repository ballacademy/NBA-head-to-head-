import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { StripStatHud } from "../instagramComposer/StripStatHud";
import { stripStatCaption } from "../instagramComposer/stripStatCaption";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import { TeamHairlineToggle } from "../instagramComposer/TeamHairlineToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerPhotoHud } from "../instagramComposer/ComposerPhotoHud";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { keepComposerPhotos } from "../instagramComposer/composerPhotos";
import { ComposerNamesToggle } from "../instagramComposer/ComposerNamesToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  LINEUP_LOOK_KEY,
  RANKED_LINEUPS_LOOK_KEY,
  parseShowTeamHairline,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import {
  copyGraphicCaption,
  rankedLineupCaption,
} from "../instagramComposer/graphicCaption";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  LINEUP_TITLE_PRESETS,
  RANKED_LINEUP_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { RankedLineupsGraphic } from "./RankedLineupsGraphic";
import { renderRankedLineupsCanvas } from "./renderRankedLineupsCanvas";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { exportRankedLineupsPng } from "./exportRankedLineupsPng";
import { autoSortMetricLabel } from "../everyTeamComposer/everyTeamState";
import {
  EVERY_TEAM_STAT_METRICS,
  everyTeamCurrentSeason,
  everyTeamSeasons,
  isEveryTeamRostersReady,
  loadEveryTeamRosters,
  parseEveryTeamSeason,
  parseEveryTeamStatMetric,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import {
  applyPlayerPick,
  clampActiveSlide,
  clearStrip,
  defaultRankedLineupsDraft,
  emptyLineupSlide,
  fillLineupByStatLeaders,
  hasCustomPhoto,
  isRankedLineupsDraft,
  lineupPosition,
  nextRankPill,
  patchStrip,
  DEFAULT_LINEUP_TITLE,
  DEFAULT_RANK_DISPLAY,
  parsePositionLabels,
  parseRankDisplay,
  parseStripCount,
  POSITION_LABEL_MAX,
  RANK_PILL_MAX,
  RANK_PILL_PRESETS,
  RANKED_LINEUP_STRIP_MAX,
  RANKED_LINEUP_STRIP_MIN,
  rankOrdinalNumber,
  resizeRankedStrips,
  setStripPhoto,
  slidesFromDraft,
  swapRankedLineup,
  usedLineupPlayerIds,
  withActiveSlide,
  type RankedLineupSlide,
  type RankedLineupStrip,
  type RankedLineupsDraft,
} from "./rankedLineupsState";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-900-italic.css";
import "./rankedLineupsComposer.css";

const RANKED_STORAGE_KEY = "ddgm:ranked-lineups-composer";
const RANKED_SAVES_KEY = "ddgm:ranked-lineups-composer:saves";
const LINEUP_STORAGE_KEY = "ddgm:lineup-composer";
const LINEUP_SAVES_KEY = "ddgm:lineup-composer:saves";

const loadDraft = (unranked: boolean): RankedLineupsDraft => {
  const stored = readJson<Partial<RankedLineupsDraft>>(
    unranked ? LINEUP_STORAGE_KEY : RANKED_STORAGE_KEY,
  );
  const empty = defaultRankedLineupsDraft();
  if (unranked) {
    empty.title = DEFAULT_LINEUP_TITLE;
    empty.rankDisplay = "none";
    empty.rank = "";
  }
  if (isRankedLineupsDraft(stored)) {
    const slides = slidesFromDraft(stored);
    return withActiveSlide(
      {
        ...empty,
        ...stored,
        showBa: stored.showBa === true,
        showFade: stored.showFade === true,
        showTeamHairline: parseShowTeamHairline(stored.showTeamHairline),
        rankDisplay: parseRankDisplay(
          stored.rankDisplay,
          unranked ? "none" : "pill",
        ),
        positionLabels: parsePositionLabels(
          stored.positionLabels,
          stored.strips.length,
        ),
        season:
          typeof stored.season === "string" && stored.season
            ? stored.season
            : everyTeamCurrentSeason(),
      },
      slides,
      stored.activeSlide ?? 0,
    );
  }
  return {
    ...empty,
    brand: stored?.brand?.trim() ? stored.brand : empty.brand,
    title: stored?.title?.trim()
      ? stored.title
      : unranked
        ? DEFAULT_LINEUP_TITLE
        : empty.title,
    showBa: stored?.showBa === true,
    showFade: stored?.showFade === true,
    showTeamHairline: parseShowTeamHairline(stored?.showTeamHairline),
    rankDisplay: parseRankDisplay(
      stored?.rankDisplay,
      unranked ? "none" : "pill",
    ),
    positionLabels: parsePositionLabels(
      stored?.positionLabels,
      stored?.strips?.length,
    ),
    season:
      typeof stored?.season === "string" && stored.season
        ? stored.season
        : everyTeamCurrentSeason(),
  };
};

export function RankedLineupsComposerApp({
  unranked = false,
}: {
  unranked?: boolean;
}) {
  const boardRef = useRef<HTMLElement | null>(null);
  const storageKey = unranked ? LINEUP_STORAGE_KEY : RANKED_STORAGE_KEY;
  const savesKey = unranked ? LINEUP_SAVES_KEY : RANKED_SAVES_KEY;
  const empty = defaultRankedLineupsDraft();
  if (unranked) {
    empty.title = DEFAULT_LINEUP_TITLE;
    empty.rankDisplay = "none";
    empty.rank = "";
  }
  const [brand, setBrand] = useState(empty.brand);
  const [title, setTitle] = useState(empty.title);
  const [rank, setRank] = useState(empty.rank);
  const [strips, setStrips] = useState<RankedLineupStrip[]>(empty.strips);
  const [slides, setSlides] = useState<RankedLineupSlide[]>(empty.slides ?? []);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoTarget, setPhotoTarget] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(
    unranked ? LINEUP_LOOK_KEY : RANKED_LINEUPS_LOOK_KEY,
  );
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] = usePhotoGrade();
  const [showBa, setShowBa] = useState(false);
  const [showFade, setShowFade] = useState(false);
  const [showTeamHairline, setShowTeamHairline] = useState(true);
  const [storyCrop, setStoryCrop] = useState(false);
  const [rankDisplay, setRankDisplay] = useState(
    unranked ? "none" : DEFAULT_RANK_DISPLAY,
  );
  const [positionLabels, setPositionLabels] = useState(
    parsePositionLabels(empty.positionLabels),
  );
  const [season, setSeason] = useState(everyTeamCurrentSeason);
  const [fillMetric, setFillMetric] = useState<EveryTeamStatMetric>("points");
  const [showStripStat, setShowStripStat] = useState(false);
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [rostersReady, setRostersReady] = useState(isEveryTeamRostersReady);
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<{
    strips: RankedLineupStrip[];
    positionLabels: string[];
  }>();
  const snapshotBoard = () => ({
    strips,
    positionLabels: parsePositionLabels(positionLabels, strips.length),
  });

  const persistSlide = useCallback(
    (nextStrips: RankedLineupStrip[], nextRank = rank, index = activeSlide) => {
      setSlides((current) =>
        current.map((slide, slideIndex) =>
          slideIndex === index
            ? { rank: nextRank, strips: nextStrips }
            : slide,
        ),
      );
    },
    [activeSlide, rank],
  );

  useEffect(() => {
    document.title = unranked ? "Lineup graphic" : "Ranked lineups graphic";
  }, [unranked]);

  useEffect(() => {
    const draft = loadDraft(unranked);
    setBrand(draft.brand);
    setTitle(draft.title);
    setRank(draft.rank);
    setStrips(draft.strips);
    setSlides(slidesFromDraft(draft));
    setActiveSlide(draft.activeSlide ?? 0);
    setShowBa(draft.showBa === true);
    setShowFade(draft.showFade === true);
    setShowTeamHairline(parseShowTeamHairline(draft.showTeamHairline));
    setRankDisplay(
      parseRankDisplay(draft.rankDisplay, unranked ? "none" : "pill"),
    );
    setPositionLabels(
      parsePositionLabels(draft.positionLabels, draft.strips.length),
    );
    setSeason(draft.season || everyTeamCurrentSeason());
    setShowStripStat(draft.showStripStat === true);
    if (draft.stripStatMetric) {
      setFillMetric(draft.stripStatMetric);
    }
    setHydrated(true);
    void loadEveryTeamRosters()
      .then(() => {
        setRostersReady(true);
        setSeason((current) => parseEveryTeamSeason(current));
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  }, [unranked]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(storageKey, {
      brand,
      title,
      rank,
      strips,
      slides,
      activeSlide,
      showBa,
      showFade,
      showTeamHairline,
      rankDisplay,
      positionLabels,
      season,
      showStripStat,
      stripStatMetric: fillMetric,
    });
  }, [brand, title, rank, strips, slides, activeSlide, showBa, showFade, showTeamHairline, rankDisplay, positionLabels, season, showStripStat, fillMetric, hydrated, storageKey]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

  const applyDraft = (draft: RankedLineupsDraft) => {
    const next = withActiveSlide(
      draft,
      slidesFromDraft(draft),
      draft.activeSlide ?? 0,
    );
    setBrand(next.brand);
    setTitle(next.title);
    setRank(next.rank);
    setStrips(next.strips);
    setSlides(slidesFromDraft(next));
    setActiveSlide(next.activeSlide ?? 0);
    setShowBa(next.showBa === true);
    setShowFade(next.showFade === true);
    setShowStripStat(next.showStripStat === true);
    if (next.stripStatMetric) {
      setFillMetric(next.stripStatMetric);
    }
    setShowTeamHairline(parseShowTeamHairline(next.showTeamHairline));
    setRankDisplay(parseRankDisplay(next.rankDisplay));
    setPositionLabels(
      parsePositionLabels(next.positionLabels, next.strips.length),
    );
    setSeason(parseEveryTeamSeason(next.season));
    setActiveIndex(null);
  };

  const selectSlide = (index: number) => {
    const committed = slides.map((slide, slideIndex) =>
      slideIndex === activeSlide ? { rank, strips } : slide,
    );
    const nextIndex = clampActiveSlide(committed, index);
    const slide = committed[nextIndex];
    if (!slide) {
      return;
    }
    setSlides(committed);
    setActiveSlide(nextIndex);
    setRank(slide.rank);
    setStrips(slide.strips);
    setActiveIndex(null);
  };

  const handleExport = async (
    filename?: string,
    story = false,
    square = false,
  ) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setStatus("Rendering PNG…");
    setActiveIndex(null);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await exportRankedLineupsPng(
        node,
        filename ??
          exportFilenameFromTitle(
            title,
            unranked ? "lineup" : "ranked-lineups",
            unranked ? "" : rank.toLowerCase(),
          ),
        {
          brand,
          title,
          rank,
          strips,
          look,
          purpleFlair,
          photoGrade,
          showBa,
          showFade,
          showTeamHairline,
          rankDisplay: unranked ? "none" : rankDisplay,
          positionLabels,
          stripStats,
        },
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

  const handleExportAll = async () => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setActiveIndex(null);
    try {
      for (const [index, slide] of slides.entries()) {
        setStatus(`Rendering slide ${index + 1} of ${slides.length}…`);
        await exportRankedLineupsPng(
          node,
          exportFilenameFromTitle(
            title,
            "ranked-lineups",
            slide.rank.toLowerCase(),
          ),
          {
            brand,
            title,
            rank: slide.rank,
            strips: slide.strips,
            look,
            purpleFlair,
            photoGrade,
            showBa,
            showFade,
            showTeamHairline,
            rankDisplay,
            positionLabels,
            stripStats: showStripStat
              ? slide.strips.map((strip) =>
                  stripStatCaption(strip.playerId, fillMetric, season, statsSample),
                )
              : [],
          },
        );
        await new Promise((resolve) => window.setTimeout(resolve, 280));
      }
      setStatus(`Exported ${slides.length} PNG${slides.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      setStatus("Could not export all slides.");
    } finally {
      setExporting(false);
    }
  };

  const handleResetKeepPhotos = () => {
    const blank = defaultRankedLineupsDraft();
    push(snapshotBoard());
    applyDraft(
      keepComposerPhotos(blank, {
        ...blank,
        brand,
        title,
        rank,
        strips,
        showBa,
        showFade,
        showTeamHairline,
        rankDisplay,
        positionLabels,
        season,
      }),
    );
    setStatus("Reset — photos kept.");
  };

  const handleReset = () => {
    const next = defaultRankedLineupsDraft();
    push(snapshotBoard());
    applyDraft(next);
    setStatus("Blank post.");
  };

  const handleNextSlide = () => {
    const nextRank = nextRankPill(rank);
    const next = emptyLineupSlide(nextRank, strips.length);
    const nextSlides = [
      ...slides.slice(0, activeSlide),
      { rank, strips },
      next,
    ];
    push(snapshotBoard());
    setSlides(nextSlides);
    setActiveSlide(nextSlides.length - 1);
    setRank(next.rank);
    setStrips(next.strips);
    setActiveIndex(null);
    setStatus(`Started ${next.rank} with the same title.`);
  };

  const handlePopulateLeaders = () => {
    const rankIndex = unranked ? 1 : rankOrdinalNumber(rank);
    const result = fillLineupByStatLeaders(
      strips,
      season,
      fillMetric,
      statsSample,
      rankIndex,
    );
    const label = autoSortMetricLabel(fillMetric);
    if (result.filled === 0) {
      setStatus(
        `No ${label} leaders for ${season} — last season’s table is used when this year has none.`,
      );
      return;
    }
    push(snapshotBoard());
    setStrips(result.strips);
    persistSlide(result.strips);
    setPositionLabels(parsePositionLabels(undefined, result.strips.length));
    const rankCue = unranked
      ? "PG–C"
      : `${rank.trim().toUpperCase() || "BEST"} PG–C`;
    setStatus(
      result.filled < 5
        ? `Filled ${result.filled} of 5 ${rankCue} ${label} leaders.`
        : `Filled ${rankCue} with ${season} ${label} leaders.`,
    );
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
    push(snapshotBoard());
    setStrips((current) => {
      const next = applyPlayerPick(current, index, player, keepCustomPhoto);
      persistSlide(next);
      return next;
    });
    setActiveIndex(null);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name} at ${lineupPosition(index)}.`
        : `Filled ${player.name} at ${lineupPosition(index)}.`,
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
        setStrips((current) => {
          const next = setStripPhoto(current, index, dataUrl);
          persistSlide(next);
          return next;
        });
        setStatus("Pasted photo into the strip.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeIndex, photoTarget, persistSlide]);

  const currentId =
    activeIndex != null ? strips[activeIndex]?.playerId ?? null : null;
  const activePos =
    activeIndex != null ? lineupPosition(activeIndex) : "PG";
  const stripStats = showStripStat
    ? strips.map((strip) =>
        stripStatCaption(strip.playerId, fillMetric, season, statsSample),
      )
    : [];
  const board: RankedLineupsDraft = {
    brand,
    title,
    rank,
    strips,
    slides,
    activeSlide,
    showBa,
    showFade,
    showTeamHairline,
    rankDisplay,
    positionLabels,
    season,
    showStripStat,
    stripStatMetric: fillMetric,
  };

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title={unranked ? "Lineup" : "Ranked lineups"}
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
          presets={unranked ? LINEUP_TITLE_PRESETS : RANKED_LINEUP_TITLE_PRESETS}
          onChange={setTitle}
        />
        {unranked ? null : (
        <>
        <label className="sc-field">
          Rank
          <select
            value={
              (RANK_PILL_PRESETS as readonly string[]).includes(
                rank.toUpperCase(),
              )
                ? rank.toUpperCase()
                : ""
            }
            aria-label="Rank pill preset"
            onChange={(event) => {
              if (event.target.value) {
                setRank(event.target.value);
                persistSlide(strips, event.target.value);
              }
            }}
          >
            <option value="">Custom</option>
            {RANK_PILL_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </label>
        <div className="sc-look" role="group" aria-label="Rank style">
          <span className="sc-look__label">Rank style</span>
          <button
            type="button"
            className={rankDisplay === "headline" ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={rankDisplay === "headline"}
            onClick={() => setRankDisplay("headline")}
          >
            #1
          </button>
          <button
            type="button"
            className={rankDisplay === "pill" ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={rankDisplay === "pill"}
            onClick={() => setRankDisplay("pill")}
          >
            Pill
          </button>
        </div>
        <label className="sc-field">
          Pill
          <input
            value={rank}
            maxLength={RANK_PILL_MAX}
            aria-label="Rank pill text"
            onChange={(event) => {
              const next = event.target.value.slice(0, RANK_PILL_MAX);
              setRank(next);
              persistSlide(strips, next);
            }}
          />
        </label>
        </>
        )}
        <div className="sc-look" role="group" aria-label="Lineup size">
          <span className="sc-look__label">Players</span>
          {Array.from(
            { length: RANKED_LINEUP_STRIP_MAX - RANKED_LINEUP_STRIP_MIN + 1 },
            (_, offset) => RANKED_LINEUP_STRIP_MIN + offset,
          ).map((count) => (
            <button
              key={count}
              type="button"
              className={strips.length === count ? "sc-chip is-on" : "sc-chip"}
              aria-pressed={strips.length === count}
              aria-label={`${count}-man lineup`}
              onClick={() => {
                const n = parseStripCount(count);
                if (n === strips.length) {
                  return;
                }
                push(snapshotBoard());
                const next = resizeRankedStrips(strips, n);
                setStrips(next);
                setPositionLabels(parsePositionLabels(positionLabels, n));
                setSlides((current) =>
                  current.map((slide, index) => ({
                    rank: index === activeSlide ? rank : slide.rank,
                    strips:
                      index === activeSlide
                        ? next
                        : resizeRankedStrips(slide.strips, n),
                  })),
                );
              }}
            >
              {count}
            </button>
          ))}
        </div>
          </>
        }
        data={
          <>
        <label className="sc-field">
          Season
          <select
            value={season}
            aria-label="Lineup season"
            disabled={!rostersReady}
            onChange={(event) =>
              setSeason(parseEveryTeamSeason(event.target.value))
            }
          >
            {everyTeamSeasons().map((option) => (
              <option key={option} value={option}>
                {option}
                {option === everyTeamCurrentSeason() ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        <ComposerStatsSampleToggle
          sample={statsSample}
          onChange={setStatsSample}
        />
        <div className="sc-look sc-look--sort" role="group" aria-label="Populate position leaders">
          <span className="sc-look__label">Auto-fill</span>
          <select
            value={fillMetric}
            aria-label="Auto-fill stat"
            onChange={(event) =>
              setFillMetric(parseEveryTeamStatMetric(event.target.value))
            }
          >
            {EVERY_TEAM_STAT_METRICS.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="sc-chip"
            onClick={handlePopulateLeaders}
            disabled={!rostersReady}
          >
            Populate
          </button>
        </div>
          <ComposerPhotoHud
            onPick={() => {
              const index = activeIndex ?? photoTarget;
              setPhotoTarget(index);
              setActiveIndex(index);
            }}
            onUpload={(dataUrl) => {
              const index = activeIndex ?? photoTarget;
              setPhotoTarget(index);
              setStrips((current) => {
                const next = setStripPhoto(current, index, dataUrl);
                persistSlide(next);
                return next;
              });
              setStatus("Photo cropped in the strip.");
            }}
            onUploadMany={(urls) => {
              const start = activeIndex ?? photoTarget;
              setStrips((current) => {
                let next = current;
                urls.forEach((url, offset) => {
                  next = setStripPhoto(next, start + offset, url);
                });
                persistSlide(next);
                return next;
              });
            }}
          />
          </>
        }
        board={
          <>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <PhotoGradeToggle on={photoGrade} onChange={setPhotoGrade} intensity={gradeIntensity} onIntensityChange={setGradeIntensity} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <TeamHairlineToggle on={showTeamHairline} onChange={setShowTeamHairline} />
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
        <ComposerNamesToggle
          on={showFade}
          onChange={setShowFade}
          label="Names in photo"
          ariaLabel="First and last name with team logo on the photo"
        />
        <StripStatHud
          on={showStripStat}
          metric={fillMetric}
          onToggle={setShowStripStat}
          onMetric={setFillMetric}
        />
          </>
        }
        persist={
        <ComposerSaves
          storageKey={savesKey}
          board={board}
          onLoad={(next) => {
            applyDraft(next);
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
                setStrips(previous.strips);
                setPositionLabels(
                  parsePositionLabels(
                    previous.positionLabels,
                    previous.strips.length,
                  ),
                );
                persistSlide(previous.strips);
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
          {unranked ? null : (
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={handleNextSlide}
            disabled={exporting}
          >
            Next slide
          </button>
          )}
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void copyGraphicCaption(
                rankedLineupCaption(title, rank, strips),
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
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void handleExport(
                exportFilenameFromTitle(
                  title,
                  "ranked-lineups",
                  rank.toLowerCase(),
                  true,
                ),
                true,
              )
            }
            disabled={exporting}
          >
            Export 9:16
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost sc-btn--aside"
            onClick={() => void handleExport(undefined, false, true)}
            disabled={exporting}
            aria-label="Export 1:1"
          >
            Export 1:1
          </button>
          {unranked ? null : (
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => void handleExportAll()}
            disabled={exporting || slides.length === 0}
          >
            Export all slides
          </button>
          )}
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void (async () => {
                setExporting(true);
                setStatus("Rendering pack…");
                try {
                  const stem = unranked ? "lineup" : "ranked-lineups";
                  const extras =
                    unranked || slides.length < 2
                      ? []
                      : slides.slice(activeSlide + 1, activeSlide + 2).map(
                          (slide) => ({
                            filename: exportFilenameFromTitle(
                              title,
                              stem,
                              slide.rank.toLowerCase(),
                            ),
                            render: () =>
                              renderRankedLineupsCanvas(
                                {
                                  brand,
                                  title,
                                  rank: slide.rank,
                                  strips: slide.strips,
                                  look,
                                  purpleFlair,
                                  photoGrade,
                                  showBa,
                                  showFade,
                                  showTeamHairline,
                                  rankDisplay,
                                  positionLabels,
                                  stripStats: showStripStat
                                    ? slide.strips.map((strip) =>
                                        stripStatCaption(
                                          strip.playerId,
                                          fillMetric,
                                          season,
                                          statsSample,
                                        ),
                                      )
                                    : [],
                                },
                                2,
                              ),
                          }),
                        );
                  const feedName = exportFilenameFromTitle(
                    title,
                    stem,
                    unranked ? "" : rank.toLowerCase(),
                  );
                  const rankedInput = {
                    brand,
                    title,
                    rank,
                    strips,
                    look,
                    purpleFlair,
                    photoGrade,
                    showBa,
                    showFade,
                    showTeamHairline,
                    rankDisplay: unranked ? "none" as const : rankDisplay,
                    positionLabels,
                    stripStats,
                  };
                  await downloadExportPack(
                    () => renderRankedLineupsCanvas(rankedInput, 2),
                    feedName,
                    [
                      ...extras,
                      {
                        filename: storyFilename(feedName),
                        render: () =>
                          renderRankedLineupsCanvas(
                            { ...rankedInput, story: true },
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
        <div className="sc-stage__frame">
          <ComposerBoard>
          <RankedLineupsGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            rank={rank}
            strips={strips}
            look={look}
            purpleFlair={purpleFlair}
            photoGrade={photoGrade}
            showBa={showBa}
            showFade={showFade}
            showTeamHairline={showTeamHairline}
            rankDisplay={unranked ? "none" : rankDisplay}
            positionLabels={positionLabels}
            stripStats={stripStats}
            onPositionChange={(index, label) =>
              setPositionLabels((current) => {
                const next = parsePositionLabels(current);
                next[index] = label.slice(0, POSITION_LABEL_MAX);
                return next;
              })
            }
            exporting={exporting}
            story={storyCrop}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onRankChange={(value) => {
              setRank(value);
              persistSlide(strips, value);
            }}
            onHover={setPhotoTarget}
            onPick={(index) => {
              setPhotoTarget(index);
              setActiveIndex(index);
            }}
            onPan={(index, pan) => {
              setPhotoTarget(index);
              setStrips((current) => {
                const next = patchStrip(current, index, { pan });
                persistSlide(next);
                return next;
              });
            }}
            onUpload={(index, dataUrl) => {
              setPhotoTarget(index);
              setStrips((current) => {
                const next = setStripPhoto(current, index, dataUrl);
                persistSlide(next);
                return next;
              });
              setStatus(
                "Photo cropped inside the strip — pinch, scroll, or +/− to scale, drag to pan.",
              );
            }}
            onNameChange={(index, names) => {
              setStrips((current) => {
                const next = patchStrip(current, index, names);
                persistSlide(next);
                return next;
              });
            }}
            onSwap={(from, to) => {
              push(snapshotBoard());
              const next = swapRankedLineup(strips, positionLabels, from, to);
              setStrips(next.strips);
              setPositionLabels(
                parsePositionLabels(next.positionLabels, next.strips.length),
              );
              persistSlide(next.strips);
              setStatus("Swapped player slots.");
            }}
          />
            <StoryCropGuide on={storyCrop} />
          </ComposerBoard>
          {unranked ? null : (
          <div className="rl-series" role="tablist" aria-label="Carousel slides">
            {slides.map((slide, index) => (
              <button
                key={`slide-${index}-${slide.rank}`}
                type="button"
                role="tab"
                className={
                  index === activeSlide ? "rl-series__thumb is-on" : "rl-series__thumb"
                }
                aria-selected={index === activeSlide}
                aria-label={`${slide.rank} slide`}
                onClick={() => selectSlide(index)}
              >
                <span className="rl-series__rank">{slide.rank}</span>
                <span className="rl-series__strips" aria-hidden="true">
                  {slide.strips.map((strip, stripIndex) => (
                    <span
                      key={`${slide.rank}-${stripIndex}`}
                      className="rl-series__strip"
                      style={
                        strip.photoSrc
                          ? { backgroundImage: `url(${strip.photoSrc})` }
                          : undefined
                      }
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>
          )}
          <p className="sc-hint">
            {unranked
              ? "Five PG–C strips with no rank pill. Populate fills the season-stat leader at each position. Drag a player on the preview to swap slots — photos, names, logos, and position labels move together. Positions are editable or removable. Custom photos, frames, purple, and named saves. Downloads a 4:5 Instagram PNG — nothing is posted."
              : "Five PG–C strips for one carousel part. Populate fills that rank’s season-stat leader at each position. Drag a player on the preview to swap slots — photos, names, logos, and position labels move together. Next slide keeps the title, bumps BEST to 2ND, and clears players. Paste or drop a photo onto a strip. Downloads a 4:5 Instagram PNG — nothing is posted."}
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={`Pick ${activePos}`}
          hint={`Only one player per strip. We’ll drop their headshot into ${activePos} — upload your own photo to replace it.`}
          currentId={currentId}
          usedLabels={usedLineupPlayerIds(strips)}
          onPick={handlePick}
          onClear={() => {
            push(snapshotBoard());
            setStrips((current) => {
              const next = clearStrip(current, activeIndex);
              persistSlide(next);
              return next;
            });
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
