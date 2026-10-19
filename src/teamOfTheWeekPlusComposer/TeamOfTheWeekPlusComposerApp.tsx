import { useCallback, useEffect, useRef, useState } from "react";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import {
  copyGraphicCaption,
  graphicCaption,
  stripCaptionName,
} from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { keepComposerPhotos } from "../instagramComposer/composerPhotos";
import { ComposerNamesToggle } from "../instagramComposer/ComposerNamesToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import {
  TEAM_OF_THE_WEEK_PLUS_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import {
  TOTW_PLUS_STANDOUT_PRESETS,
  TOTW_PLUS_STARTER_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { ComposerDateRange } from "../instagramComposer/ComposerDateRange";
import {
  isAutoWeekLine,
  rangeWeekLine,
  useComposerDateRange,
} from "../instagramComposer/composerDateRange";
import { readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import {
  fetchRangeProduction,
  type NightStandout,
} from "../playerOfTheDayComposer/nightStandouts";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { exportTeamOfTheWeekPlusPng } from "./exportTeamOfTheWeekPlusPng";
import { TeamOfTheWeekPlusGraphic } from "./TeamOfTheWeekPlusGraphic";
import {
  applyPlayerPick,
  clearStrip,
  DEFAULT_PLUS_STANDOUT_CAPTION,
  defaultTotwPlusDraft,
  fillPlusFromStandouts,
  hasCustomPhoto,
  isTotwPlusDraft,
  patchStrip,
  plusBoardEmpty,
  setStripPhoto,
  slotLabel,
  standoutSlots,
  starterSlots,
  totwPickerEmpty,
  totwPickerHeading,
  totwPickerSuggestions,
  usedPlusPlayerIds,
  type TotwPlusDraft,
  type TotwStrip,
} from "./teamOfTheWeekPlusState";
import "@fontsource/montserrat/latin-900.css";
import "./teamOfTheWeekPlusComposer.css";

const STORAGE_KEY = "ddgm:team-of-the-week-plus-composer";
const SAVES_KEY = "ddgm:team-of-the-week-plus-composer:saves";

const loadDraft = (): TotwPlusDraft => {
  const stored = readJson<Partial<TotwPlusDraft>>(STORAGE_KEY);
  if (isTotwPlusDraft(stored)) {
    return {
      ...stored,
      standoutCaption:
        stored.standoutCaption.trim() === "STANDOUTS"
          ? DEFAULT_PLUS_STANDOUT_CAPTION
          : stored.standoutCaption,
      showNames: stored.showNames !== false,
    };
  }
  const empty = defaultTotwPlusDraft();
  return {
    brand: stored?.brand?.trim() ? stored.brand : empty.brand,
    week: stored?.week?.trim() ? stored.week : empty.week,
    starterCaption: stored?.starterCaption?.trim()
      ? stored.starterCaption
      : empty.starterCaption,
    standoutCaption: stored?.standoutCaption?.trim()
      ? stored.standoutCaption
      : empty.standoutCaption,
    slots: empty.slots,
    showBa: stored?.showBa === true,
    showNames: stored?.showNames !== false,
  };
};

export function TeamOfTheWeekPlusComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultTotwPlusDraft();
  const [brand, setBrand] = useState(empty.brand);
  const [week, setWeek] = useState(empty.week);
  const [starterCaption, setStarterCaption] = useState(empty.starterCaption);
  const [standoutCaption, setStandoutCaption] = useState(empty.standoutCaption);
  const [slots, setSlots] = useState<TotwStrip[]>(empty.slots);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoTarget, setPhotoTarget] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(TEAM_OF_THE_WEEK_PLUS_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] = usePhotoGrade();
  const [showBa, setShowBa] = useState(false);
  const [showNames, setShowNames] = useState(true);
  const [storyCrop, setStoryCrop] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<TotwStrip[]>();
  const { range, setRange } = useComposerDateRange();
  const [weekRows, setWeekRows] = useState<NightStandout[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);

  useEffect(() => {
    document.title = "Team of the Week Plus graphic";
  }, []);

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

  const fillLastWeek = useCallback(async (
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
      setSlots((current) => {
        if (!force && !plusBoardEmpty(current)) {
          return current;
        }
        const next = fillPlusFromStandouts(current, rows);
        const starters = starterSlots(next).filter((slot) => slot.playerId);
        const standouts = standoutSlots(next).filter((slot) => slot.playerId);
        setStatus(
          starters.length
            ? `Filled PG–C and ${standouts.length} surprise standouts.`
            : "No box scores for this range yet — pick players for the empty slots.",
        );
        return next;
      });
    } catch (error) {
      console.error(error);
      setStatus("Could not load this range’s standouts.");
    }
  }, [loadWeek, range.from, range.to]);

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setWeek(draft.week);
    setStarterCaption(draft.starterCaption);
    setStandoutCaption(draft.standoutCaption);
    setSlots(draft.slots);
    setShowBa(draft.showBa === true);
    setShowNames(draft.showNames !== false);
    setHydrated(true);
    if (plusBoardEmpty(draft.slots)) {
      void fillLastWeek(false);
    }
  }, [fillLastWeek]);

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
      week,
      starterCaption,
      standoutCaption,
      slots,
      showBa,
      showNames,
    });
  }, [brand, week, starterCaption, standoutCaption, slots, showBa, showNames, hydrated]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

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
      await exportTeamOfTheWeekPlusPng(
        node,
        filename ??
          exportFilenameFromTitle(starterCaption, "team-of-the-week-plus", week),
        {
          brand,
          week,
          starterCaption,
          standoutCaption,
          slots,
          look,
          purpleFlair,
          photoGrade,
          showBa,
          showNames,
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

  const applyPlusDraft = (
    next: ReturnType<typeof defaultTotwPlusDraft>,
    status: string,
  ) => {
    push(slots);
    setBrand(next.brand);
    setWeek(next.week);
    setStarterCaption(next.starterCaption);
    setStandoutCaption(next.standoutCaption);
    setSlots(next.slots);
    setShowNames(next.showNames !== false);
    setActiveIndex(null);
    setStatus(status);
  };

  const handleResetKeepPhotos = () => {
    const blank = defaultTotwPlusDraft();
    applyPlusDraft(
      keepComposerPhotos(blank, {
        ...blank,
        brand,
        week,
        starterCaption,
        standoutCaption,
        slots,
        showBa,
        showNames,
      }),
      "Reset — photos kept.",
    );
  };

  const handleReset = () => {
    applyPlusDraft(defaultTotwPlusDraft(), "Blank post.");
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
    push(slots);
    setSlots((current) =>
      applyPlayerPick(current, index, player, keepCustomPhoto),
    );
    setActiveIndex(null);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name} as ${slotLabel(index)}.`
        : `Filled ${player.name} as ${slotLabel(index)}.`,
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
    const current = slots[activeIndex];
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
        push(slots);
        setSlots((current) => setStripPhoto(current, index, dataUrl));
        setStatus("Pasted photo into the portrait.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeIndex, photoTarget, push, slots]);

  const currentId =
    activeIndex != null ? slots[activeIndex]?.playerId ?? null : null;
  const pickerUsed = usedPlusPlayerIds(slots);
  const pickerUsedIds = new Set(
    Object.keys(pickerUsed).filter((id) => id !== currentId),
  );

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="TOTW Plus"
        identity={
          <>
        <label className="sc-field sc-field--wide">
          Title
          <input
            value={starterCaption}
            maxLength={48}
            onChange={(event) =>
              onComposerTextChange(event, setStarterCaption, 48)
            }
          />
        </label>
        <TitlePresetSelect
          value={starterCaption}
          presets={TOTW_PLUS_STARTER_PRESETS}
          onChange={setStarterCaption}
        />
        <label className="sc-field sc-field--wide">
          Section
          <input
            value={standoutCaption}
            maxLength={48}
            onChange={(event) =>
              onComposerTextChange(event, setStandoutCaption, 48)
            }
          />
        </label>
        <TitlePresetSelect
          value={standoutCaption}
          presets={TOTW_PLUS_STANDOUT_PRESETS}
          onChange={setStandoutCaption}
        />
        <label className="sc-field">
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
            onChange={(next) => {
              const written = setRange(next);
              void fillLastWeek(false, written.from, written.to);
            }}
            onFill={() => void fillLastWeek(true)}
            fillLabel="Fill range"
          />
          </>
        }
        board={
          <>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <PhotoGradeToggle on={photoGrade} onChange={setPhotoGrade} intensity={gradeIntensity} onIntensityChange={setGradeIntensity} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
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
          on={showNames}
          onChange={setShowNames}
          label="Name + logo"
          ariaLabel="Name and team logo"
        />
          </>
        }
        persist={
        <ComposerSaves
          storageKey={SAVES_KEY}
          board={{
            brand,
            week,
            starterCaption,
            standoutCaption,
            slots,
            showBa,
            showNames,
          }}
          onLoad={(next) => {
            setBrand(next.brand);
            setWeek(next.week);
            setStarterCaption(next.starterCaption);
            setStandoutCaption(next.standoutCaption);
            setSlots(next.slots);
            setShowBa(next.showBa === true);
            setShowNames(next.showNames !== false);
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
                setSlots(previous);
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
                  starterCaption,
                  slots.map(stripCaptionName).filter(Boolean),
                  [standoutCaption, week],
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
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void handleExport(
                exportFilenameFromTitle(
                  starterCaption,
                  "team-of-the-week-plus",
                  week,
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
          <TeamOfTheWeekPlusGraphic
            ref={boardRef}
            brand={brand}
            week={week}
            starterCaption={starterCaption}
            standoutCaption={standoutCaption}
            slots={slots}
            look={look}
            purpleFlair={purpleFlair}
            photoGrade={photoGrade}
            showBa={showBa}
            showNames={showNames}
            exporting={exporting}
            story={storyCrop}
            onBrandChange={setBrand}
            onWeekChange={setWeek}
            onStarterCaptionChange={setStarterCaption}
            onStandoutCaptionChange={setStandoutCaption}
            onHover={setPhotoTarget}
            onPick={(index) => {
              setPhotoTarget(index);
              setActiveIndex(index);
            }}
            onPan={(index, pan) => {
              setPhotoTarget(index);
              setSlots((current) => patchStrip(current, index, { pan }));
            }}
            onUpload={(index, dataUrl) => {
              setPhotoTarget(index);
              push(slots);
              setSlots((current) => setStripPhoto(current, index, dataUrl));
              setStatus(
                "Photo cropped inside the portrait — pinch, scroll, or +/− to scale, drag to pan.",
              );
            }}
            onNameChange={(index, names) =>
              setSlots((current) => patchStrip(current, index, names))
            }
          />
            <StoryCropGuide on={storyCrop} />
          </ComposerBoard>
          <p className="sc-hint">
            Top row is the week’s best five as PG, SG, SF, PF, C left to right,
            2+ games, ranked on TS%/eFG% times production, including stars.
            Standouts (bottom row only) are surprise / over-expectation nights,
            packed PG → C the same way — a big cannot sit in slot 1. Empty photo until you
            paste. Date range matches Cover / Stat / TOTW. Downloads a 4:5
            Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={`Pick ${slotLabel(activeIndex).toLowerCase()}`}
          hint="Gold cards are the most deserving remaining players for this slot — same ranking as Fill, by position. Search still lists everyone."
          currentId={currentId}
          usedLabels={pickerUsed}
          suggested={totwPickerSuggestions(weekRows, activeIndex, pickerUsedIds)}
          suggestedHeading={totwPickerHeading(activeIndex)}
          suggestedLoading={weekLoading}
          suggestedEmpty={totwPickerEmpty(activeIndex)}
          onPick={handlePick}
          onClear={() => {
            push(slots);
            setSlots((current) => clearStrip(current, activeIndex));
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
