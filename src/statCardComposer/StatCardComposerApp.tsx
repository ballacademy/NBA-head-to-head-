import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import {
  STAT_CARD_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack } from "../instagramComposer/exportPack";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import { readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { fetchLastGame } from "../playerOfTheDayComposer/lastGame";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { StatCardGraphic } from "./StatCardGraphic";
import { exportStatCardPng } from "./exportStatCardPng";
import { renderStatCardCanvas } from "./renderStatCardCanvas";
import {
  applyPlayerName,
  clipStatLabel,
  clipStatValue,
  clearStatCardSubject,
  defaultStatCardDraft,
  fillStatCardFromGame,
  fillStatCardFromPlayer,
  hasCustomPhoto,
  isStatCardDraft,
  playerName,
  setStatCardPhoto,
  type StatCardDraft,
} from "./statCardState";
import "@fontsource/montserrat/latin-900.css";
import "./statCardComposer.css";

const STORAGE_KEY = "ddgm:stat-card-composer";
const SAVES_KEY = "ddgm:stat-card-composer:saves";

const loadDraft = (): StatCardDraft => {
  const stored = readJson<Partial<StatCardDraft>>(STORAGE_KEY);
  if (isStatCardDraft(stored)) {
    return { ...stored, showBa: stored.showBa !== false };
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
  const [keepPrompt, setKeepPrompt] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<StatCardDraft>();

  useEffect(() => {
    document.title = "Stat card graphic";
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const fillGame = async (next: StatCardDraft) => {
    if (!next.playerId) {
      return;
    }
    try {
      const game = await fetchLastGame(next.playerId);
      setDraft((current) =>
        current.playerId === next.playerId
          ? fillStatCardFromGame(current, game)
          : current,
      );
    } catch {
      /* still editable */
    }
  };

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
        { ...draft, look, purpleFlair },
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
    const next = fillStatCardFromPlayer(player, draft, keepCustomPhoto);
    setDraft(next);
    setPickerOpen(false);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name}.`
        : `Filled ${player.name} — upload an action photo. Stats auto-fill from the last game.`,
    );
    void fillGame(next);
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

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Stat card</h1>
        </div>
        <label className="sc-field sc-field--wide">
          Name
          <input
            value={playerName(draft)}
            maxLength={32}
            onChange={(event) =>
              setDraft((current) => applyPlayerName(current, event.target.value))
            }
          />
        </label>
        {draft.stats.map((line, index) => (
          <label key={`${line.key}-hud`} className="sc-field">
            {line.label || "Stat"}
            <input
              value={line.value}
              maxLength={8}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  stats: current.stats.map((row, rowIndex) =>
                    rowIndex === index
                      ? { ...row, value: clipStatValue(event.target.value) }
                      : row,
                  ),
                }))
              }
            />
          </label>
        ))}
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle
          on={draft.showBa !== false}
          onChange={(showBa) => setDraft((current) => ({ ...current, showBa }))}
        />
        <ComposerSaves
          storageKey={SAVES_KEY}
          board={draft}
          onLoad={(next) => {
            setDraft(next);
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
              void copyGraphicCaption(
                graphicCaption(
                  playerName(draft) || "Stat card",
                  [],
                  draft.stats.map((line) => `${line.value} ${line.label}`),
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
                  await downloadExportPack(
                    () =>
                      renderStatCardCanvas({ ...draft, look, purpleFlair }, 2),
                    exportFilenameFromTitle(stem, "stat-card"),
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
        </div>
      </header>

      <main className="sc-stage">
        <div className="sc-stage__frame">
          <ComposerBoard>
            <StatCardGraphic
              ref={boardRef}
              draft={draft}
              look={look}
              purpleFlair={purpleFlair}
              exporting={exporting}
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
            />
          </ComposerBoard>
          <p className="sc-hint">
            Empty photo first — pick a player for name, team, and last-game
            stats, then upload the action shot. Downloads a 4:5 Instagram PNG —
            nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {pickerOpen ? (
        <PlayerPicker
          heading="Pick a player"
          hint="Fills the name bar, team color, and last-game stats. No mugshot — upload or paste the action photo."
          currentId={draft.playerId}
          usedLabels={draft.playerId ? { [draft.playerId]: "Stat card" } : {}}
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
