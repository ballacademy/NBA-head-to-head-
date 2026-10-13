import { useCallback, useEffect, useRef, useState } from "react";
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
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  PYRAMID_LOOK_KEY,
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
  PYRAMID_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { PyramidGraphic } from "./PyramidGraphic";
import { exportPyramidPng } from "./exportPyramidPng";
import {
  applyPyramidPick,
  clearPyramidSlot,
  defaultPyramidDraft,
  hasCustomPhoto,
  isPyramidDraft,
  patchStrip,
  setStripPhoto,
  usedPyramidPlayerIds,
  type PyramidDraft,
  type PyramidSlot,
} from "./pyramidState";
import "@fontsource/montserrat/latin-900.css";
import "./pyramidComposer.css";

const STORAGE_KEY = "ddgm:pyramid-composer";
const SAVES_KEY = "ddgm:pyramid-composer:saves";

const loadDraft = (): PyramidDraft => {
  const stored = readJson<Partial<PyramidDraft>>(STORAGE_KEY);
  if (isPyramidDraft(stored)) {
    return { ...stored, showBa: stored.showBa !== false };
  }
  const empty = defaultPyramidDraft();
  return {
    title: stored?.title?.trim() ? stored.title : empty.title,
    slots: empty.slots,
    showBa: stored?.showBa !== false,
  };
};

export function PyramidComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultPyramidDraft();
  const [title, setTitle] = useState(empty.title);
  const [slots, setSlots] = useState<PyramidSlot[]>(empty.slots);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoTarget, setPhotoTarget] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(PYRAMID_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [showBa, setShowBa] = useState(true);
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<PyramidSlot[]>();

  useEffect(() => {
    document.title = "Pyramid graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setTitle(draft.title);
    setSlots(draft.slots);
    setShowBa(draft.showBa !== false);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, { title, slots, showBa });
  }, [title, slots, showBa, hydrated]);

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
      await exportPyramidPng(
        node,
        filename ?? exportFilenameFromTitle(title, "pyramid"),
        { title, slots, look, purpleFlair, showBa },
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
    const next = defaultPyramidDraft();
    push(slots);
    setTitle(next.title);
    setSlots(next.slots);
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
      applyPyramidPick(current, index, player, keepCustomPhoto),
    );
    setActiveIndex(null);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name} in slot ${index + 1}.`
        : `Filled ${player.name} in slot ${index + 1}.`,
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
        setSlots((current) => setStripPhoto(current, index, dataUrl));
        setStatus("Pasted photo into the slot.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeIndex, photoTarget]);

  const currentId =
    activeIndex != null ? slots[activeIndex]?.playerId ?? null : null;

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Pyramid</h1>
        </div>
        <label className="sc-field sc-field--wide">
          Title
          <input
            value={title}
            maxLength={COMPOSER_TITLE_MAX_LENGTH}
            onChange={(event) => onComposerTextChange(event, setTitle, 48)}
          />
        </label>
        <TitlePresetSelect
          value={title}
          presets={PYRAMID_TITLE_PRESETS}
          onChange={setTitle}
        />
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <ComposerSaves
          storageKey={SAVES_KEY}
          board={{ title, slots, showBa }}
          onLoad={(next) => {
            setTitle(next.title);
            setSlots(next.slots);
            setShowBa(next.showBa !== false);
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
                  title,
                  slots.map(stripCaptionName).filter(Boolean),
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
                exportFilenameFromTitle(title, "pyramid", "", true),
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
          <PyramidGraphic
            ref={boardRef}
            title={title}
            slots={slots}
            look={look}
            purpleFlair={purpleFlair}
            showBa={showBa}
            exporting={exporting}
            onTitleChange={setTitle}
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
              setSlots((current) => setStripPhoto(current, index, dataUrl));
              setStatus(
                "Photo cropped inside the square — pinch, scroll, or +/− to scale, drag to pan.",
              );
            }}
          />
          <p className="sc-hint">
            Ten photo squares in a 1–2–3–4 stack. Pick a player or upload/paste
            a custom photo, then pan and zoom like Team of the Week. Downloads a
            4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={`Pick person ${activeIndex + 1}`}
          hint="Search a player. Coaches are not in the NBA data — upload or paste a custom photo for them."
          currentId={currentId}
          usedLabels={usedPyramidPlayerIds(slots)}
          onPick={handlePick}
          onClear={() => {
            push(slots);
            setSlots((current) => clearPyramidSlot(current, activeIndex));
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
