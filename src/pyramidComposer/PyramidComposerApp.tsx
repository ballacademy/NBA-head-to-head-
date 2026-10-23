import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerHudSelect } from "../instagramComposer/ComposerHudSelect";
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
import { fetchConferenceStandingsBundle } from "../standingsComposer/nbaStandings";
import {
  GRAPHIC_HEIGHT,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  PYRAMID_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { PyramidGraphic } from "./PyramidGraphic";
import { exportPyramidPng } from "./exportPyramidPng";
import { renderPyramidCanvas } from "./renderPyramidCanvas";
import { pyramidSlotCount } from "./pyramidLayout";
import {
  applyPyramidPick,
  clearPyramidSlot,
  coachesFromStandings,
  createEmptyPyramidSlots,
  defaultPyramidDraft,
  fillPyramidFromPlayers,
  hasCustomPhoto,
  pyramidBoardEmpty,
  pyramidAwardFromTitle,
  pyramidAwardLadder,
  PYRAMID_AWARD_GROUPS,
  isPyramidDraft,
  parsePyramidRowLabels,
  parsePyramidRows,
  patchStrip,
  PYR_ROW_LABEL_MAX,
  PYR_MAX_ROWS,
  PYR_MIN_ROWS,
  resizePyramidSlots,
  swapStrips,
  setStripPhoto,
  usedPyramidPlayerIds,
  type PyramidDraft,
  type PyramidSlot,
} from "./pyramidState";
import "@fontsource/montserrat/latin-900.css";
import "./pyramidComposer.css";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";
import {
  nextEmptySlotIndex,
  slotMissingPlayer,
} from "../instagramComposer/nextEmptySlot";

const STORAGE_KEY = "ddgm:pyramid-composer";
const SAVES_KEY = "ddgm:pyramid-composer:saves";

const loadDraft = (): PyramidDraft => {
  const stored = readJson<Partial<PyramidDraft>>(STORAGE_KEY);
  if (isPyramidDraft(stored)) {
    const rows = parsePyramidRows(stored.rows, stored.slots.length);
    return {
      ...stored,
      rows,
      slots: resizePyramidSlots(stored.slots, rows),
      showBa: stored.showBa !== false,
      showNames: stored.showNames === true,
      showRankPip: stored.showRankPip !== false,
      rowLabels: parsePyramidRowLabels(stored.rowLabels, rows),
    };
  }
  const empty = defaultPyramidDraft();
  return {
    title: stored?.title?.trim() ? stored.title : empty.title,
    slots: empty.slots,
    rows: empty.rows,
    showBa: stored?.showBa !== false,
    showNames: stored?.showNames === true,
    showRankPip: stored?.showRankPip !== false,
    rowLabels: empty.rowLabels,
  };
};

export function PyramidComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultPyramidDraft();
  const [title, setTitle] = useState(empty.title);
  const [slots, setSlots] = useState<PyramidSlot[]>(empty.slots);
  const [rows, setRows] = useState(empty.rows ?? 4);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoTarget, setPhotoTarget] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(PYRAMID_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] = usePhotoGrade();
  const [showBa, setShowBa] = useState(true);
  const [showNames, setShowNames] = useState(false);
  const [showRankPip, setShowRankPip] = useState(true);
  const [storyCrop, setStoryCrop] = useState(false);
  const [rowLabels, setRowLabels] = useState(() =>
    parsePyramidRowLabels(undefined, empty.rows ?? 4),
  );
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<{
    slots: PyramidSlot[];
    rows: number;
  }>();

  useEffect(() => {
    document.title = "Pyramid graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setTitle(draft.title);
    setSlots(draft.slots);
    setRows(draft.rows ?? 4);
    setShowBa(draft.showBa !== false);
    setShowNames(draft.showNames === true);
    setShowRankPip(draft.showRankPip !== false);
    setRowLabels(parsePyramidRowLabels(draft.rowLabels, draft.rows ?? 4));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, {
      title,
      slots,
      rows,
      showBa,
      showNames,
      showRankPip,
      rowLabels,
    });
  }, [title, slots, rows, showBa, showNames, showRankPip, rowLabels, hydrated]);

  const fillRanking = useCallback(
    async (force = false, nextTitle = title, nextRows = rows) => {
      const count = pyramidSlotCount(nextRows);
      const award = pyramidAwardFromTitle(nextTitle);
      const group =
        PYRAMID_AWARD_GROUPS.find((item) => item.id === award) ??
        PYRAMID_AWARD_GROUPS[4];
      let players = pyramidAwardLadder(award, count);
      if (award === "coy") {
        try {
          const [east, west] = await Promise.all([
            fetchConferenceStandingsBundle("East"),
            fetchConferenceStandingsBundle("West"),
          ]);
          players = coachesFromStandings(
            east.slots,
            west.slots,
            { ...east.records, ...west.records },
            count,
          );
        } catch (error) {
          console.error(error);
        }
      }
      setSlots((current) => {
        if (!force && !pyramidBoardEmpty(current)) {
          return current;
        }
        const next = fillPyramidFromPlayers(nextRows, players, current);
        const filled = next.filter((slot) => slot.playerId).length;
        setStatus(
          filled
            ? `Filled ${filled} squares from the ${group.label} group.`
            : "Could not fill the pyramid — pick players for the empty squares.",
        );
        return next;
      });
    },
    [rows, title],
  );

  useEffect(() => {
    const draft = loadDraft();
    if (pyramidBoardEmpty(draft.slots)) {
      void fillRanking(false, draft.title, draft.rows ?? 4);
    }
  }, [fillRanking]);

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
      await exportPyramidPng(
        node,
        filename ?? exportFilenameFromTitle(title, "pyramid"),
        { title, slots, rows, rowLabels, look, purpleFlair, photoGrade, showBa, showNames, showRankPip },
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

  const applyPyramidDraft = (
    next: ReturnType<typeof defaultPyramidDraft>,
    status: string,
  ) => {
    push({ slots, rows });
    setTitle(next.title);
    setSlots(next.slots);
    setRows(next.rows ?? 4);
    setRowLabels(parsePyramidRowLabels(next.rowLabels, next.rows ?? 4));
    setActiveIndex(null);
    setStatus(status);
  };

  const handleResetKeepPhotos = () => {
    const blank = defaultPyramidDraft();
    applyPyramidDraft(
      keepComposerPhotos(
        { ...blank, rows, rowLabels, slots: createEmptyPyramidSlots(rows) },
        { ...blank, title, rows, rowLabels, slots },
      ),
      "Reset — photos kept.",
    );
  };

  const handleReset = () => {
    if (!confirmBlankPost()) {
      return;
    }
    applyPyramidDraft(defaultPyramidDraft(), "Blank post.");
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
    push({ slots, rows });
    setSlots((current) => {
      const next = applyPyramidPick(current, index, player, keepCustomPhoto);
      setActiveIndex(nextEmptySlotIndex(next, index, slotMissingPlayer));
      return next;
    });
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
      <ComposerToolbar
        title="Pyramid"
        identity={
          <>
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
          </>
        }
        data={
          <>
        <div className="sc-look sc-look--sort" role="group" aria-label="Award group">
          <span className="sc-look__label">Award</span>
          <select
            value={pyramidAwardFromTitle(title)}
            aria-label="Pyramid award group"
            onChange={(event) => {
              const group = PYRAMID_AWARD_GROUPS.find(
                (item) => item.id === event.target.value,
              );
              if (!group) {
                return;
              }
              setTitle(group.title);
              void fillRanking(true, group.title, rows);
            }}
          >
            <optgroup label="Awards">
              {PYRAMID_AWARD_GROUPS.filter((item) =>
                ["mvp", "dpoy", "mip", "6moy", "coy", "roy"].includes(item.id),
              ).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Teams">
              {PYRAMID_AWARD_GROUPS.filter((item) =>
                ["all-nba", "all-defense"].includes(item.id),
              ).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          </select>
          <button
            type="button"
            className="sc-chip"
            onClick={() => void fillRanking(true)}
          >
            Fill ranking
          </button>
        </div>
        <ComposerHudSelect
          label="Rows"
          ariaLabel="Pyramid rows"
          value={String(rows)}
          options={Array.from(
            { length: PYR_MAX_ROWS - PYR_MIN_ROWS + 1 },
            (_, index) => {
              const count = PYR_MIN_ROWS + index;
              return { value: String(count), label: String(count) };
            },
          )}
          onChange={(next) => {
            const count = Number(next);
            if (count === rows) {
              return;
            }
            push({ slots, rows });
            setRows(count);
            setSlots((current) => resizePyramidSlots(current, count));
            setRowLabels((current) => parsePyramidRowLabels(current, count));
            setActiveIndex(null);
            setStatus(
              `${count} rows · ${pyramidSlotCount(count)} photo squares.`,
            );
          }}
        />
        {Array.from({ length: rows }, (_, index) => (
          <label key={`pyr-label-${index}`} className="sc-field">
            Row {index + 1}
            <input
              value={rowLabels[index] ?? ""}
              maxLength={PYR_ROW_LABEL_MAX}
              placeholder={`${index + 1} / COY`}
              aria-label={`Row ${index + 1} label`}
              onChange={(event) =>
                setRowLabels((current) => {
                  const next = parsePyramidRowLabels(current, rows);
                  next[index] = event.target.value
                    .slice(0, PYR_ROW_LABEL_MAX);
                  return next;
                })
              }
            />
          </label>
        ))}
          </>
        }
        board={
          <>
        <ComposerNamesToggle
          on={showNames}
          onChange={setShowNames}
          ariaLabel="Show player names on cells"
        />
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Rank pip</span>
          <button
            type="button"
            className={showRankPip ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={showRankPip}
            aria-label="Show rank pip on cells"
            onClick={() => setShowRankPip((on) => !on)}
          >
            {showRankPip ? "On" : "Off"}
          </button>
        </label>
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
          </>
        }
        persist={
        <ComposerSaves
          storageKey={SAVES_KEY}
          board={{ title, slots, rows, showBa, showNames, showRankPip, rowLabels }}
          onLoad={(next) => {
            const nextRows = parsePyramidRows(next.rows, next.slots.length);
            setTitle(next.title);
            setRows(nextRows);
            setSlots(resizePyramidSlots(next.slots, nextRows));
            setShowBa(next.showBa !== false);
            setShowNames(next.showNames === true);
            setShowRankPip(next.showRankPip !== false);
            setRowLabels(parsePyramidRowLabels(next.rowLabels, nextRows));
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
                setSlots(previous.slots);
                setRows(previous.rows);
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
            className="sc-btn sc-btn--ghost sc-btn--aside"
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
                try {
                  const feedName = exportFilenameFromTitle(title, "pyramid");
                  const pyramidInput = {
                    title,
                    slots,
                    rows,
                    rowLabels,
                    look,
                    purpleFlair,
                    photoGrade,
                    showBa,
                    showNames,
                    showRankPip,
                  };
                  await downloadExportPack(
                    () => renderPyramidCanvas(pyramidInput, 2),
                    feedName,
                    [
                      {
                        filename: storyFilename(feedName),
                        render: () =>
                          renderPyramidCanvas(
                            { ...pyramidInput, story: true },
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
        <div className={storyCrop ? "sc-stage__frame is-story" : "sc-stage__frame"}>
          <ComposerBoard
            height={storyCrop ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT}
          >
          <PyramidGraphic
            ref={boardRef}
            title={title}
            slots={slots}
            rows={rows}
            rowLabels={rowLabels}
            look={look}
            purpleFlair={purpleFlair}
            photoGrade={photoGrade}
            showBa={showBa}
            showNames={showNames}
            showRankPip={showRankPip}
            exporting={exporting}
            story={storyCrop}
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
                "Photo cropped in the square — heads pop out the top. Pinch, scroll, or +/− to scale, drag to pan.",
              );
            }}
            onSwap={(from, to) => {
              push({ slots, rows });
              setSlots((current) => swapStrips(current, from, to));
              setStatus("Swapped pyramid cells.");
            }}
            />
            <StoryCropGuide on={storyCrop} />
          </ComposerBoard>
          <p className="sc-hint">
            Photo squares in a 1–2–3–4 (or 5 / 6) stack. A small gap under the
            title keeps popped heads clear of the letters; the bottom row keeps
            its inset. Stock headshots pop out of the top; custom photos stay
            in the box. Drag a cell on the preview to swap players. Names off by
            default. Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={`Pick person ${activeIndex + 1}`}
          hint="Players and head coaches. Upload or paste a custom photo anytime."
          includeCoaches
          currentId={currentId}
          usedLabels={usedPyramidPlayerIds(slots)}
          onPick={handlePick}
          onClear={() => {
            push({ slots, rows });
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
