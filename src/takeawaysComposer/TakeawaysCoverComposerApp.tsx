import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerDateRange } from "../instagramComposer/ComposerDateRange";
import { ComposerHudExtras } from "../instagramComposer/ComposerHudExtras";
import { ComposerHudSelect } from "../instagramComposer/ComposerHudSelect";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";
import { rememberComposerPlayer } from "../instagramComposer/composerCarry";
import { useComposerDateRange } from "../instagramComposer/composerDateRange";
import {
  TAKEAWAYS_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { keepComposerPhotos } from "../instagramComposer/composerPhotos";
import { exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { nextEmptySlotIndex, slotMissingPlayer } from "../instagramComposer/nextEmptySlot";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { hydrateJsonStorage, readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { fetchStandoutsInRange } from "../playerOfTheDayComposer/nightStandouts";
import {
  GRAPHIC_HEIGHT,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { TakeawaysCoverGraphic } from "./TakeawaysCoverGraphic";
import {
  exportTakeawaysCarouselZip,
  exportTakeawaysCoverPng,
} from "./exportTakeawaysPng";
import { renderTakeawaysCoverCanvas } from "./renderTakeawaysCoverCanvas";
import {
  TAKEAWAYS_SAVES_KEY,
  TAKEAWAYS_STORAGE_KEY,
  applyTakeawaysRange,
  clearTakeawaysCard,
  defaultTakeawaysDraft,
  fillTakeawaysNames,
  hasCustomTakeawaysPhoto,
  insertTakeawaysCards,
  isTakeawaysDraft,
  normalizeTakeawaysDraft,
  patchTakeawaysCard,
  setTakeawaysCardCount,
  setTakeawaysCardPlayer,
  takeawaysCaptionLines,
  takeawaysWeekPill,
  usedTakeawaysPlayerLabels,
  type TakeawaysCoverFaces,
  type TakeawaysCoverField,
  type TakeawaysDraft,
  type TakeawaysTitleStyle,
  type TakeawaysWeekPip,
} from "./takeawaysState";
import "@fontsource/montserrat/latin-900.css";
import "../statCardCoverComposer/statCardCoverComposer.css";
import "./takeawaysComposer.css";

const loadDraft = (): TakeawaysDraft => {
  const stored = readJson<Partial<TakeawaysDraft>>(TAKEAWAYS_STORAGE_KEY);
  if (isTakeawaysDraft(stored)) {
    return normalizeTakeawaysDraft(stored);
  }
  return defaultTakeawaysDraft();
};

export function TakeawaysCoverComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultTakeawaysDraft();
  const [draft, setDraft] = useState<TakeawaysDraft>(empty);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoTarget, setPhotoTarget] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(TAKEAWAYS_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] =
    usePhotoGrade();
  const [storyCrop, setStoryCrop] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<TakeawaysDraft>();
  const { range, setRange } = useComposerDateRange();
  const pickerOpen = activeIndex != null;

  useEffect(() => {
    document.title = "NBA takeaways cover";
    void hydrateJsonStorage().then(() => {
      setDraft(loadDraft());
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(TAKEAWAYS_STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    setDraft((current) => applyTakeawaysRange(current, range.from, range.to));
  }, [hydrated, range.from, range.to]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

  const commitPick = (index: number, playerId: string, keepPhoto: boolean) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    rememberComposerPlayer(playerId);
    setDraft((current) => ({
      ...current,
      cards: setTakeawaysCardPlayer(current.cards, index, player, keepPhoto),
      currentIndex: index,
    }));
    const nextEmpty = nextEmptySlotIndex(
      draft.cards,
      index,
      slotMissingPlayer,
    );
    setActiveIndex(nextEmpty);
    setPhotoTarget(nextEmpty ?? index);
  };

  const fillWeek = () => {
    setFilling(true);
    void fetchStandoutsInRange(range.from, range.to)
      .then((rows) => {
        setDraft((current) => {
          const next = fillTakeawaysNames(
            applyTakeawaysRange(current, range.from, range.to),
            rows,
          );
          const filled = next.cards.filter((card) => card.playerId).length;
          setStatus(
            filled
              ? `Filled ${filled} names — add takeaways yourself.`
              : "No TOTW names for that week yet — pick players.",
          );
          return next;
        });
      })
      .finally(() => setFilling(false));
  };

  const handleExport = async (story = false, square = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportTakeawaysCoverPng(
        node,
        exportFilenameFromTitle(
          `${draft.title} ${takeawaysWeekPill(draft)}`,
          "takeaways-cover",
          draft.from,
        ),
        { ...draft, look, purpleFlair, photoGrade },
        story,
        square,
      );
      setStatus("Download started.");
    } catch (error) {
      console.error(error);
      setStatus("Could not export.");
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
        const index = photoTarget;
        setDraft((current) => ({
          ...current,
          cards: patchTakeawaysCard(current.cards, index, {
            photoSrc: dataUrl,
            customPhoto: true,
          }),
        }));
        setStatus("Pasted photo into that cover slot.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [photoTarget]);

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Takeaways cover"
        identity={
          <label className="sc-field sc-field--wide">
            Title
            <input
              value={draft.title}
              maxLength={48}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
            />
          </label>
        }
        data={
          <>
            <ComposerDateRange
              from={draft.from}
              to={draft.to}
              simpleSet="week"
              fillLabel={filling ? "Loading…" : "Fill names"}
              filling={filling}
              onFill={fillWeek}
              onChange={(next) => {
                setRange(next);
                setDraft((current) =>
                  applyTakeawaysRange(current, next.from, next.to),
                );
              }}
            />
            <ComposerLookToggle look={look} onChange={setLook} />
            <BaMarkToggle
              on={draft.showBa !== false}
              onChange={(showBa) =>
                setDraft((current) => ({ ...current, showBa }))
              }
            />
          </>
        }
        board={
          <>
            <ComposerHudSelect
              label="Faces"
              ariaLabel="Cover faces"
              value={String(draft.coverFaces) as "0" | "3" | "4"}
              options={[
                { value: "3", label: "3 portraits" },
                { value: "4", label: "4 portraits" },
                { value: "0", label: "Type only" },
              ]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  coverFaces: Number(value) as TakeawaysCoverFaces,
                }))
              }
            />
            <ComposerHudSelect
              label="Title"
              ariaLabel="Title style"
              value={draft.titleStyle}
              options={[
                { value: "lockup", label: "Gold lockup" },
                { value: "plate", label: "Metal plate" },
              ]}
              onChange={(titleStyle: TakeawaysTitleStyle) =>
                setDraft((current) => ({ ...current, titleStyle }))
              }
            />
            <ComposerHudSelect
              label="Week pip"
              ariaLabel="Week pip"
              value={draft.weekPip}
              options={[
                { value: "week-x", label: "WEEK X" },
                { value: "week-of", label: "WEEK OF" },
              ]}
              onChange={(weekPip: TakeawaysWeekPip) =>
                setDraft((current) => ({
                  ...current,
                  weekPip,
                  autoWeek: true,
                }))
              }
            />
            <ComposerHudSelect
              label="Field"
              ariaLabel="Cover field"
              value={draft.coverField}
              options={[
                { value: "standouts", label: "Standouts" },
                { value: "metal", label: "Metal" },
              ]}
              onChange={(coverField: TakeawaysCoverField) =>
                setDraft((current) => ({ ...current, coverField }))
              }
            />
            <ComposerHudSelect
              label="Cards"
              ariaLabel="Card count"
              value={String(draft.cards.length)}
              options={["3", "4", "5", "6", "7", "8"].map((value) => ({
                value,
                label: value,
              }))}
              onChange={(value) =>
                setDraft((current) => setTakeawaysCardCount(current, Number(value)))
              }
            />
            <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
            <PhotoGradeToggle
              on={photoGrade}
              onChange={setPhotoGrade}
              intensity={gradeIntensity}
              onIntensityChange={setGradeIntensity}
            />
            <ComposerHudExtras
              label="Cover extras"
              items={[
                {
                  key: "gold",
                  label: "Gold",
                  on: draft.showGold !== false,
                  onChange: (showGold) =>
                    setDraft((current) => ({ ...current, showGold })),
                },
                {
                  key: "range",
                  label: "Date range under pip",
                  on: draft.showRangeUnderPip,
                  onChange: (showRangeUnderPip) =>
                    setDraft((current) => ({ ...current, showRangeUnderPip })),
                },
              ]}
            />
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Story crop</span>
              <button
                type="button"
                className={storyCrop ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={storyCrop}
                onClick={() => setStoryCrop((on) => !on)}
              >
                {storyCrop ? "On" : "Off"}
              </button>
            </label>
          </>
        }
        persist={
          <ComposerSaves
            storageKey={TAKEAWAYS_SAVES_KEY}
            board={draft}
            onLoad={(next) => setDraft(normalizeTakeawaysDraft(next))}
          />
        }
        actions={
          <>
            <button
              type="button"
              className="sc-chip"
              disabled={!canUndo}
              onClick={() => {
                const prev = pop();
                if (prev) {
                  setDraft(prev);
                }
              }}
            >
              Undo
            </button>
            <button
              type="button"
              className="sc-chip"
              onClick={() =>
                copyGraphicCaption(
                  graphicCaption(
                    draft.title,
                    takeawaysCaptionLines(draft).slice(1),
                    [takeawaysWeekPill(draft)],
                  ),
                ).then(() => setStatus("Caption copied."))
              }
            >
              Copy caption
            </button>
            <button
              type="button"
              className="sc-chip"
              onClick={() => {
                push(draft);
                setDraft(keepComposerPhotos(defaultTakeawaysDraft(), draft));
                setStatus("Reset — photos kept.");
              }}
            >
              Reset keep photos
            </button>
            <button
              type="button"
              className="sc-chip"
              onClick={() => {
                if (!confirmBlankPost()) {
                  return;
                }
                push(draft);
                setDraft(defaultTakeawaysDraft());
                setStatus("Blank post.");
              }}
            >
              Blank post
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              disabled={exporting}
              onClick={() => {
                void (async () => {
                  setExporting(true);
                  try {
                    const filename = exportFilenameFromTitle(
                      `${draft.title} ${takeawaysWeekPill(draft)}`,
                      "takeaways-cover",
                      draft.from,
                    );
                    await downloadExportPack(
                      () =>
                        renderTakeawaysCoverCanvas(
                          { ...draft, look, purpleFlair, photoGrade },
                          2,
                        ),
                      filename,
                      [
                        {
                          filename: storyFilename(filename),
                          render: () =>
                            renderTakeawaysCoverCanvas(
                              {
                                ...draft,
                                look,
                                purpleFlair,
                                photoGrade,
                                story: true,
                              },
                              2,
                            ),
                        },
                      ],
                    );
                    setStatus("Pack download started (4:5 + 9:16 + 1:1).");
                  } catch (error) {
                    console.error(error);
                    setStatus("Could not export pack.");
                  } finally {
                    setExporting(false);
                  }
                })();
              }}
            >
              Export pack
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              disabled={exporting}
              onClick={() => {
                void (async () => {
                  setExporting(true);
                  try {
                    await exportTakeawaysCarouselZip({
                      ...draft,
                      look,
                      purpleFlair,
                      photoGrade,
                    });
                    setStatus("Cover + cards carousel download started.");
                  } catch (error) {
                    console.error(error);
                    setStatus("Could not export carousel.");
                  } finally {
                    setExporting(false);
                  }
                })();
              }}
            >
              Cover + cards
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
      {status ? <p className="sc-status">{status}</p> : null}
      <main className="sc-stage">
        <div className="sc-stage__frame">
          <div className="sc-board-wrap">
            <ComposerBoard
              height={storyCrop ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT}
            >
              <TakeawaysCoverGraphic
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
                onWeekLineChange={(weekLine) =>
                  setDraft((current) => ({
                    ...current,
                    weekLine,
                    autoWeek: false,
                  }))
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
                    cards: patchTakeawaysCard(current.cards, index, { pan }),
                  }));
                }}
                onUpload={(index, dataUrl) => {
                  setPhotoTarget(index);
                  setDraft((current) => ({
                    ...current,
                    cards: patchTakeawaysCard(current.cards, index, {
                      photoSrc: dataUrl,
                      customPhoto: true,
                    }),
                  }));
                }}
                onNameChange={(index, names) =>
                  setDraft((current) => ({
                    ...current,
                    cards: patchTakeawaysCard(current.cards, index, names),
                  }))
                }
                onSwap={(from, to) => {
                  push(draft);
                  setDraft((current) => ({
                    ...current,
                    cards: insertTakeawaysCards(current.cards, from, to),
                  }));
                }}
              />
            </ComposerBoard>
            <StoryCropGuide on={storyCrop} />
          </div>
        </div>
      </main>
      {pickerOpen ? (
        <PlayerPicker
          heading={`Pick takeaways player ${(activeIndex ?? 0) + 1}`}
          hint="Fill names from that week's TOTW, or pick. Never invents takeaway copy."
          currentId={draft.cards[activeIndex ?? 0]?.playerId}
          usedLabels={usedTakeawaysPlayerLabels(draft.cards)}
          onClose={closePicker}
          onClear={() => {
            const index = activeIndex ?? 0;
            push(draft);
            setDraft((current) => ({
              ...current,
              cards: clearTakeawaysCard(current.cards, index),
            }));
            setActiveIndex(null);
          }}
          onPick={(playerId) => {
            const index = activeIndex ?? 0;
            const card = draft.cards[index];
            if (card && hasCustomTakeawaysPhoto(card)) {
              const player = getPlayer(playerId);
              setKeepPrompt({
                index,
                playerId,
                playerName: player?.name ?? "this player",
              });
              return;
            }
            commitPick(index, playerId, false);
          }}
        />
      ) : null}
      {keepPrompt ? (
        <KeepCustomPhotoDialog
          playerName={keepPrompt.playerName}
          onKeep={() => {
            commitPick(keepPrompt.index, keepPrompt.playerId, true);
            setKeepPrompt(null);
          }}
          onReplace={() => {
            commitPick(keepPrompt.index, keepPrompt.playerId, false);
            setKeepPrompt(null);
          }}
          onClose={() => setKeepPrompt(null)}
        />
      ) : null}
    </div>
  );
}
