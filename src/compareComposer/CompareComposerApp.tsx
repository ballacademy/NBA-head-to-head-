import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import {
  COMPARE_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack } from "../instagramComposer/exportPack";
import {
  copyGraphicCaption,
  graphicCaption,
  stripCaptionName,
} from "../instagramComposer/graphicCaption";
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
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { CompareGraphic } from "./CompareGraphic";
import { exportComparePng } from "./exportComparePng";
import { renderCompareCanvas } from "./renderCompareCanvas";
import {
  clearCompareSide,
  defaultCompareDraft,
  fillCompareSide,
  hasCustomPhoto,
  isCompareDraft,
  patchCompareStat,
  setComparePhoto,
  statsFromLastGame,
  type CompareDraft,
} from "./compareState";
import "@fontsource/montserrat/latin-900.css";
import "./compareComposer.css";

const STORAGE_KEY = "ddgm:compare-composer";
const SAVES_KEY = "ddgm:compare-composer:saves";

const loadDraft = (): CompareDraft => {
  const stored = readJson<Partial<CompareDraft>>(STORAGE_KEY);
  if (isCompareDraft(stored)) {
    return { ...stored, showBa: stored.showBa !== false };
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
  const [look, setLook] = useComposerLook(COMPARE_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [keepPrompt, setKeepPrompt] = useState<{
    side: 0 | 1;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<CompareDraft>();

  useEffect(() => {
    document.title = "Comparison graphic";
  }, []);

  useEffect(() => {
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, draft);
  }, [draft, hydrated]);

  const fillStats = async (side: 0 | 1, playerId: string) => {
    const game = await fetchLastGame(playerId);
    const values = statsFromLastGame(game);
    setDraft((current) => ({
      ...current,
      stats: current.stats.map((stat, index) => ({
        ...stat,
        [side === 0 ? "left" : "right"]: values[index] ?? "",
      })),
    }));
  };

  const commitPick = (side: 0 | 1, playerId: string, keep: boolean) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    push(draft);
    setDraft((current) => {
      const sides = [...current.sides] as CompareDraft["sides"];
      sides[side] = fillCompareSide(player, current.sides[side]!, keep);
      return { ...current, sides };
    });
    setPicker(null);
    setKeepPrompt(null);
    setStatus(`Filled ${player.name} on the ${side === 0 ? "left" : "right"}.`);
    void fillStats(side, player.id);
  };

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

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Compare</h1>
        </div>
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
              void copyGraphicCaption(
                graphicCaption(
                  draft.title,
                  draft.sides.map(stripCaptionName).filter(Boolean),
                  [draft.subtitle],
                ),
              ).then(
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
                  await downloadExportPack(
                    () =>
                      renderCompareCanvas({ ...draft, look, purpleFlair }, 2),
                    exportFilenameFromTitle(draft.title, "compare"),
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
            <CompareGraphic
              ref={boardRef}
              draft={draft}
              look={look}
              purpleFlair={purpleFlair}
              exporting={exporting}
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
          </ComposerBoard>
          <p className="sc-hint">
            Two photos, two editable stat columns, title and subtitle. Pick the
            same player twice or two different people. Last-game stats auto-fill
            when cheap. Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
      {picker != null ? (
        <PlayerPicker
          heading={picker === 0 ? "Pick left player" : "Pick right player"}
          hint="Same or different people. Stats fill from last night when available."
          currentId={draft.sides[picker]?.playerId}
          usedLabels={used}
          onPick={handlePick}
          onClear={() => {
            push(draft);
            setDraft((current) => {
              const sides = [...current.sides] as CompareDraft["sides"];
              sides[picker] = clearCompareSide();
              return { ...current, sides };
            });
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
