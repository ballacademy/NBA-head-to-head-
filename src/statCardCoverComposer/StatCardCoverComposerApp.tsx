import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import {
  STAT_CARD_COVER_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { ComposerNightDate } from "../instagramComposer/ComposerNightDate";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { WatermarkToggle } from "../instagramComposer/WatermarkToggle";
import {
  nightStandoutPickerRows,
  useComposerNight,
} from "../instagramComposer/composerNight";
import { downloadExportPack } from "../instagramComposer/exportPack";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { StatCardCoverGraphic } from "./StatCardCoverGraphic";
import { exportStatCardCoverPng } from "./exportStatCardCoverPng";
import { renderStatCardCoverCanvas } from "./renderStatCardCoverCanvas";
import {
  DEFAULT_COVER_TITLE,
  SCC_DATE_MAX,
  SCC_TITLE_MAX,
  applyCoverNight,
  clearCoverSlot,
  coverSlotName,
  coverSlotNames,
  defaultStatCardCoverDraft,
  fillCoverFromStandouts,
  hasCustomPhoto,
  isStatCardCoverDraft,
  normalizeStatCardCoverDraft,
  patchCoverSlot,
  setCoverSlotPhotoAt,
  setCoverSlotPlayer,
  usedCoverPlayerIds,
  type StatCardCoverDraft,
} from "./statCardCoverState";
import "@fontsource/montserrat/latin-900.css";
import "./statCardCoverComposer.css";

const STORAGE_KEY = "ddgm:stat-card-cover-composer";
const SAVES_KEY = "ddgm:stat-card-cover-composer:saves";

const loadDraft = (): StatCardCoverDraft => {
  const stored = readJson<Partial<StatCardCoverDraft>>(STORAGE_KEY);
  if (isStatCardCoverDraft(stored)) {
    return normalizeStatCardCoverDraft(stored);
  }
  return defaultStatCardCoverDraft();
};

export function StatCardCoverComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultStatCardCoverDraft();
  const [draft, setDraft] = useState<StatCardCoverDraft>(empty);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoTarget, setPhotoTarget] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(STAT_CARD_COVER_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade] = usePhotoGrade();
  const [storyCrop, setStoryCrop] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const filledKey = useRef("");
  const autoFill = useRef(true);
  const { push, pop, canUndo } = useComposerUndo<StatCardCoverDraft>();
  const night = useComposerNight();

  useEffect(() => {
    document.title = "Stat card cover";
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    autoFill.current = true;
    void night.ensureStandouts(night.date).then((rows) => {
      if (!autoFill.current) {
        return;
      }
      const key = `${night.date}:${rows.map((row) => row.athleteId).join(",")}`;
      if (filledKey.current === key) {
        return;
      }
      filledKey.current = key;
      setDraft((current) =>
        fillCoverFromStandouts(applyCoverNight(current, night.date), rows),
      );
    });
  }, [hydrated, night.date, night.ensureStandouts]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

  const fillFromNight = () => {
    autoFill.current = true;
    void night.ensureStandouts(night.date).then((rows) => {
      const key = `${night.date}:${rows.map((row) => row.athleteId).join(",")}`;
      filledKey.current = key;
      setDraft((current) => {
        const next = fillCoverFromStandouts(
          applyCoverNight(current, night.date),
          rows,
        );
        const filled = next.slots.filter((slot) => slot.playerId).length;
        setStatus(
          filled
            ? `Cover filled with ${filled} standout${filled === 1 ? "" : "s"}.`
            : "No standouts for that night yet — pick players for the empty slots.",
        );
        return next;
      });
    });
  };

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
      await exportStatCardCoverPng(
        node,
        filename ??
          exportFilenameFromTitle(draft.title || "stat-card-cover", "stat-card-cover"),
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

  const commitPick = (
    index: number,
    playerId: string,
    keepCustomPhoto: boolean,
  ) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    push(draft);
    setDraft((current) => ({
      ...current,
      slots: setCoverSlotPlayer(current.slots, index, player, keepCustomPhoto),
    }));
    setActiveIndex(null);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name}.`
        : `Filled ${player.name} — upload or paste an action photo.`,
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
    const current = draft.slots[activeIndex];
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
        setDraft((current) => ({
          ...current,
          slots: setCoverSlotPhotoAt(current.slots, index, dataUrl),
        }));
        setStatus("Pasted photo into the cover slot.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeIndex, photoTarget]);

  const stem = draft.title || "stat-card-cover";
  const currentId =
    activeIndex != null ? draft.slots[activeIndex]?.playerId ?? null : null;

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Cover"
        identity={
          <>
            <label className="sc-field sc-field--wide">
              Title
              <input
                value={draft.title}
                maxLength={SCC_TITLE_MAX}
                onChange={(event) =>
                  onComposerTextChange(event, (title) =>
                    setDraft((current) => ({
                      ...current,
                      title: title.slice(0, SCC_TITLE_MAX),
                    })),
                    SCC_TITLE_MAX,
                  )
                }
              />
            </label>
            <div className="sc-look" role="group" aria-label="Cover title presets">
              <button
                type="button"
                className={
                  draft.title.trim().toUpperCase() === DEFAULT_COVER_TITLE
                    ? "sc-chip is-on"
                    : "sc-chip"
                }
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    title: DEFAULT_COVER_TITLE,
                  }))
                }
              >
                Stars and standouts
              </button>
            </div>
            <label className="sc-field">
              Date pill
              <input
                value={draft.dateLine}
                maxLength={SCC_DATE_MAX}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dateLine: event.target.value.slice(0, SCC_DATE_MAX),
                  }))
                }
              />
            </label>
          </>
        }
        data={
          <>
            <ComposerNightDate
              date={night.date}
              todayIso={night.todayIso}
              yesterdayIso={night.yesterdayIso}
              onChange={(iso) => night.setDate(iso)}
            />
            <button
              type="button"
              className="sc-chip"
              onClick={fillFromNight}
            >
              Fill cover
            </button>
          </>
        }
        filters={
          <>
            <span className="sc-toolbar__eyebrow">Cover slots</span>
            {draft.slots.map((slot, index) => (
              <div key={`cover-slot-${index}`} className="sc-field sc-field--stat-slot">
                {`Player ${index + 1}`}
                <div className="sc-stat-slot">
                  <button
                    type="button"
                    className="sc-chip"
                    onClick={() => {
                      setPhotoTarget(index);
                      setActiveIndex(index);
                    }}
                  >
                    {coverSlotName(slot) || "Pick"}
                  </button>
                  {slot.playerId ? (
                    <button
                      type="button"
                      className="sc-chip sc-stat-slot__remove"
                      aria-label={`Remove player ${index + 1}`}
                      onClick={() => {
                        push(draft);
                        setDraft((current) => ({
                          ...current,
                          slots: clearCoverSlot(current.slots, index),
                        }));
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </>
        }
        board={
          <>
            <ComposerLookToggle look={look} onChange={setLook} />
            <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
            <PhotoGradeToggle on={photoGrade} onChange={setPhotoGrade} />
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
              const loaded = normalizeStatCardCoverDraft(next);
              autoFill.current = false;
              filledKey.current = `${loaded.gameDate}:${loaded.slots
                .map((slot) => slot.playerId ?? "")
                .join(",")}`;
              setDraft(loaded);
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
                filledKey.current = "";
                setDraft(defaultStatCardCoverDraft());
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
                  graphicCaption(draft.title, coverSlotNames(draft), [
                    draft.dateLine,
                  ]),
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
                  exportFilenameFromTitle(stem, "stat-card-cover", "", true),
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
                        renderStatCardCoverCanvas(
                          { ...draft, look, purpleFlair, photoGrade },
                          2,
                        ),
                      exportFilenameFromTitle(stem, "stat-card-cover"),
                      [],
                      { safe: true },
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
          <div className="sc-board-wrap">
            <ComposerBoard>
              <StatCardCoverGraphic
                ref={boardRef}
                draft={draft}
                look={look}
                purpleFlair={purpleFlair}
                photoGrade={photoGrade}
                exporting={exporting}
                onTitleChange={(title) =>
                  setDraft((current) => ({ ...current, title }))
                }
                onDateLineChange={(dateLine) =>
                  setDraft((current) => ({ ...current, dateLine }))
                }
                onHover={setPhotoTarget}
                onPick={(index) => {
                  setPhotoTarget(index);
                  setActiveIndex(index);
                }}
                onPan={(index, pan) => {
                  setPhotoTarget(index);
                  setDraft((current) => ({
                    ...current,
                    slots: patchCoverSlot(current.slots, index, { pan }),
                  }));
                }}
                onUpload={(index, dataUrl) => {
                  setPhotoTarget(index);
                  setDraft((current) => ({
                    ...current,
                    slots: setCoverSlotPhotoAt(current.slots, index, dataUrl),
                  }));
                  setStatus("Photo cropped inside the frame — pinch or drag.");
                }}
                onNameChange={(index, names) =>
                  setDraft((current) => ({
                    ...current,
                    slots: patchCoverSlot(current.slots, index, names),
                  }))
                }
              />
            </ComposerBoard>
            <StoryCropGuide on={storyCrop} />
          </div>
          <p className="sc-hint">
            Stars and standouts cover for that night’s stat cards — three
            full-bleed faces in one row, no individual stats. Tonight / Last
            night fills the three most impressive standouts; empty slots stay
            pickable.
            Upload or paste to replace a photo. Downloads a 4:5 Instagram PNG —
            nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={`Pick cover player ${activeIndex + 1}`}
          hint="Leads with that night’s standouts. Headshot drops in — upload or paste an action photo to replace it."
          currentId={currentId}
          usedLabels={usedCoverPlayerIds(draft.slots)}
          suggested={nightStandoutPickerRows(night.standouts)}
          suggestedHeading={night.heading}
          suggestedLoading={night.loading}
          onPick={handlePick}
          onClear={() => {
            push(draft);
            setDraft((current) => ({
              ...current,
              slots: clearCoverSlot(current.slots, activeIndex),
            }));
            setActiveIndex(null);
          }}
          onClose={closePicker}
        />
      ) : null}
      {keepPrompt ? (
        <KeepCustomPhotoDialog
          playerName={keepPrompt.playerName}
          onKeep={() =>
            commitPick(keepPrompt.index, keepPrompt.playerId, true)
          }
          onReplace={() =>
            commitPick(keepPrompt.index, keepPrompt.playerId, false)
          }
          onClose={() => setKeepPrompt(null)}
        />
      ) : null}
    </div>
  );
}
