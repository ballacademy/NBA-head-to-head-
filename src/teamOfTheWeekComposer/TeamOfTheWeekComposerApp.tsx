import { useCallback, useEffect, useState, useRef } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  TEAM_OF_THE_WEEK_LOOK_KEY,
  useComposerLook,
} from "../instagramComposer/composerLook";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  TOTW_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { TeamOfTheWeekGraphic } from "./TeamOfTheWeekGraphic";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { exportTeamOfTheWeekPng } from "./exportTeamOfTheWeekPng";
import {
  applyPlayerPick,
  clearStrip,
  defaultTotwDraft,
  hasCustomPhoto,
  isTotwDraft,
  patchStrip,
  setStripPhoto,
  usedPlayerIds,
  type TotwDraft,
  type TotwStrip,
} from "./teamOfTheWeekState";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-900-italic.css";
import "./teamOfTheWeekComposer.css";

const STORAGE_KEY = "ddgm:team-of-the-week-composer";

const loadDraft = (): TotwDraft => {
  const stored = readJson<Partial<TotwDraft>>(STORAGE_KEY);
  if (isTotwDraft(stored)) {
    return stored;
  }
  const empty = defaultTotwDraft();
  return {
    brand: stored?.brand?.trim() ? stored.brand : empty.brand,
    title: stored?.title?.trim() ? stored.title : empty.title,
    week: stored?.week?.trim() ? stored.week : empty.week,
    strips: empty.strips,
    showBa: stored?.showBa === true,
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
  const [showBa, setShowBa] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<TotwStrip[]>();

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
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, { brand, title, week, strips, showBa });
  }, [brand, title, week, strips, showBa, hydrated]);

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
      await exportTeamOfTheWeekPng(
        node,
        filename ?? exportFilenameFromTitle(title, "team-of-the-week", week),
        { brand, title, week, strips, look, showBa },
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
    const next = defaultTotwDraft();
    push(strips);
    setBrand(next.brand);
    setTitle(next.title);
    setWeek(next.week);
    setStrips(next.strips);
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
    push(strips);
    setStrips((current) =>
      applyPlayerPick(current, index, player, keepCustomPhoto),
    );
    setActiveIndex(null);
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

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Team of the Week</h1>
        </div>
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
            maxLength={32}
            onChange={(event) => setWeek(event.target.value.slice(0, 32))}
          />
        </label>
        <ComposerLookToggle look={look} onChange={setLook} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <div className="sc-toolbar__actions">
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
          <button type="button" className="sc-btn sc-btn--ghost" onClick={handleReset}>
            Reset
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
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
          <TeamOfTheWeekGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            week={week}
            strips={strips}
            look={look}
            showBa={showBa}
            exporting={exporting}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onWeekChange={setWeek}
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
          />
          <p className="sc-hint">
            Pick a player for each strip, then upload or paste a photo. Drag to
            pan, pinch or scroll to zoom — same as Player of the Day. +/− still
            work. Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={`Pick player ${activeIndex + 1}`}
          hint="Search a name. We’ll drop their headshot into this strip — upload your own photo to replace it."
          currentId={currentId}
          usedLabels={usedPlayerIds(strips)}
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
