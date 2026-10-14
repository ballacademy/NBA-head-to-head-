import { useCallback, useEffect, useRef, useState } from "react";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import {
  copyGraphicCaption,
  graphicCaption,
  stripCaptionName,
} from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
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
import { readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { exportTeamOfTheWeekPlusPng } from "./exportTeamOfTheWeekPlusPng";
import { TeamOfTheWeekPlusGraphic } from "./TeamOfTheWeekPlusGraphic";
import {
  applyPlayerPick,
  clearStrip,
  DEFAULT_PLUS_STANDOUT_CAPTION,
  defaultTotwPlusDraft,
  hasCustomPhoto,
  isTotwPlusDraft,
  patchStrip,
  setStripPhoto,
  slotLabel,
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
  const [showBa, setShowBa] = useState(false);
  const [showNames, setShowNames] = useState(true);
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<TotwStrip[]>();

  useEffect(() => {
    document.title = "Team of the Week Plus graphic";
  }, []);

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
  }, []);

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

  const handleExport = async (filename?: string, story = false) => {
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
          showBa,
          showNames,
        },
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

  const handleReset = () => {
    const next = defaultTotwPlusDraft();
    push(slots);
    setBrand(next.brand);
    setWeek(next.week);
    setStarterCaption(next.starterCaption);
    setStandoutCaption(next.standoutCaption);
    setSlots(next.slots);
    setShowNames(next.showNames !== false);
    setActiveIndex(null);
    setStatus("Board cleared.");
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

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">TOTW Plus</h1>
        </div>
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
            maxLength={32}
            onChange={(event) => setWeek(event.target.value.slice(0, 32))}
          />
        </label>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Name + logo</span>
          <button
            type="button"
            className={showNames ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={showNames}
            aria-label="Name and team logo"
            onClick={() => setShowNames((on) => !on)}
          >
            {showNames ? "On" : "Off"}
          </button>
        </label>
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
        <div className="sc-toolbar__actions">
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
          <button type="button" className="sc-btn sc-btn--ghost" onClick={handleReset}>
            Reset
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
            className="sc-btn sc-btn--primary"
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export PNG"}
          </button>
        </div>
      </header>

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
            showBa={showBa}
            showNames={showNames}
            exporting={exporting}
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
          </ComposerBoard>
          <p className="sc-hint">
            Five starters on the hero row, five standouts on the shorter bench.
            Pick a player for a headshot, or upload/paste a custom photo. Drag to
            pan, pinch or scroll to zoom — same as Player of the Day. +/− still
            work. Name + logo can be toggled off.
            Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={`Pick ${slotLabel(activeIndex).toLowerCase()}`}
          hint="Search a name. We’ll drop their headshot into this portrait — upload your own photo to replace it."
          currentId={currentId}
          usedLabels={usedPlusPlayerIds(slots)}
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
