import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerDateRange } from "../instagramComposer/ComposerDateRange";
import { ComposerHudExtras } from "../instagramComposer/ComposerHudExtras";
import { ComposerHudSelect } from "../instagramComposer/ComposerHudSelect";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerPhotoHud } from "../instagramComposer/ComposerPhotoHud";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";
import {
  carriedPlayerId,
  rememberComposerPlayer,
} from "../instagramComposer/composerCarry";
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
import { TakeawaysCardGraphic } from "./TakeawaysCardGraphic";
import {
  exportTakeawaysCardPng,
  exportTakeawaysCarouselZip,
} from "./exportTakeawaysPng";
import { renderTakeawaysCardCanvas } from "./renderTakeawaysCardCanvas";
import {
  TAKEAWAYS_LINE_MAX,
  TAKEAWAYS_SAVES_KEY,
  TAKEAWAYS_STORAGE_KEY,
  applyTakeawaysRange,
  clearTakeawaysCard,
  defaultTakeawaysDraft,
  fillTakeawaysNames,
  hasCustomTakeawaysPhoto,
  isTakeawaysDraft,
  landCarriedTakeawaysPlayer,
  normalizeTakeawaysDraft,
  patchTakeawaysCard,
  setTakeawaysCardCount,
  setTakeawaysCardPlayer,
  takeawaysCaptionLines,
  takeawaysCardName,
  takeawaysWeekPill,
  usedTakeawaysPlayerLabels,
  type TakeawaysDraft,
  type TakeawaysWell,
} from "./takeawaysState";
import "@fontsource/montserrat/latin-900.css";
import "./takeawaysComposer.css";

const loadDraft = (): TakeawaysDraft => {
  const stored = readJson<Partial<TakeawaysDraft>>(TAKEAWAYS_STORAGE_KEY);
  if (isTakeawaysDraft(stored)) {
    return normalizeTakeawaysDraft(stored);
  }
  return defaultTakeawaysDraft();
};

export function TakeawaysCardComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultTakeawaysDraft();
  const [draft, setDraft] = useState<TakeawaysDraft>(empty);
  const [pickerOpen, setPickerOpen] = useState(false);
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
  const card = draft.cards[draft.currentIndex] ?? draft.cards[0]!;
  const cardIndex = draft.currentIndex;

  useEffect(() => {
    document.title = "NBA takeaways cards";
    void hydrateJsonStorage().then(() => {
      setDraft(landCarriedTakeawaysPlayer(loadDraft(), carriedPlayerId()));
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

  const closePicker = useCallback(() => setPickerOpen(false), []);

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
    setPickerOpen(nextEmpty != null);
    if (nextEmpty != null) {
      setDraft((current) => ({ ...current, currentIndex: nextEmpty }));
    }
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
          const filled = next.cards.filter((row) => row.playerId).length;
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

  const stepCard = (delta: number) => {
    setDraft((current) => {
      const count = current.cards.length;
      const next = (current.currentIndex + delta + count) % count;
      return { ...current, currentIndex: next };
    });
  };

  const handleExport = async (story = false, square = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportTakeawaysCardPng(
        node,
        exportFilenameFromTitle(
          `${draft.title} ${takeawaysWeekPill(draft)}`,
          "takeaways",
          draft.from,
          false,
          takeawaysCardName(card),
        ),
        { ...draft, look, purpleFlair, photoGrade, currentIndex: cardIndex },
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
        setDraft((current) => ({
          ...current,
          cards: patchTakeawaysCard(current.cards, current.currentIndex, {
            photoSrc: dataUrl,
            customPhoto: true,
          }),
        }));
        setStatus("Pasted photo into this card.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const renderInput = { ...draft, look, purpleFlair, photoGrade };

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Takeaway cards"
        identity={
          <>
            <label className="sc-field sc-field--wide">
              Takeaway
              <input
                value={card.line1}
                maxLength={TAKEAWAYS_LINE_MAX}
                placeholder="Add takeaway"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    cards: patchTakeawaysCard(
                      current.cards,
                      current.currentIndex,
                      { line1: event.target.value },
                    ),
                  }))
                }
              />
            </label>
            <label className="sc-field sc-field--wide">
              Second line
              <input
                value={card.line2}
                maxLength={TAKEAWAYS_LINE_MAX}
                placeholder="Optional"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    cards: patchTakeawaysCard(
                      current.cards,
                      current.currentIndex,
                      { line2: event.target.value },
                    ),
                  }))
                }
              />
            </label>
          </>
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
            <ComposerPhotoHud
              pickLabel="Pick player"
              onPick={() => setPickerOpen(true)}
              onUpload={(dataUrl) =>
                setDraft((current) => ({
                  ...current,
                  cards: patchTakeawaysCard(
                    current.cards,
                    current.currentIndex,
                    { photoSrc: dataUrl, customPhoto: true },
                  ),
                }))
              }
            />
            <div className="sc-look" role="group" aria-label="Card">
              <span className="sc-look__label">Card</span>
              <button
                type="button"
                className="sc-chip"
                onClick={() => stepCard(-1)}
              >
                Prev
              </button>
              <span className="sc-chip is-on">
                {cardIndex + 1} / {draft.cards.length}
              </span>
              <button
                type="button"
                className="sc-chip"
                onClick={() => stepCard(1)}
              >
                Next
              </button>
            </div>
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
              label="Well"
              ariaLabel="Text well floor"
              value={draft.well}
              options={[
                { value: "fade", label: "Fade" },
                { value: "overlay", label: "Overlay" },
                { value: "metal", label: "Metal" },
                { value: "charcoal", label: "Charcoal" },
                { value: "team", label: "Team color" },
              ]}
              onChange={(well: TakeawaysWell) =>
                setDraft((current) => ({ ...current, well }))
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
              label="Card extras"
              items={[
                {
                  key: "index",
                  label: "Slide index",
                  on: draft.showIndex,
                  onChange: (showIndex) =>
                    setDraft((current) => ({ ...current, showIndex })),
                },
                {
                  key: "ghost",
                  label: "WEEK pip on cards",
                  on: draft.showWeekGhost,
                  onChange: (showWeekGhost) =>
                    setDraft((current) => ({ ...current, showWeekGhost })),
                },
                {
                  key: "fact",
                  label: "Fact chip",
                  on: draft.showFactChip,
                  onChange: (showFactChip) =>
                    setDraft((current) => ({ ...current, showFactChip })),
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
                      "takeaways",
                      draft.from,
                      false,
                      takeawaysCardName(card),
                    );
                    await downloadExportPack(
                      () =>
                        renderTakeawaysCardCanvas(
                          { ...renderInput, currentIndex: cardIndex },
                          2,
                          cardIndex,
                        ),
                      filename,
                      [
                        {
                          filename: storyFilename(filename),
                          render: () =>
                            renderTakeawaysCardCanvas(
                              {
                                ...renderInput,
                                currentIndex: cardIndex,
                                story: true,
                              },
                              2,
                              cardIndex,
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
                    await exportTakeawaysCarouselZip(renderInput);
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
              <TakeawaysCardGraphic
                ref={boardRef}
                draft={draft}
                card={card}
                index={cardIndex}
                look={look}
                purpleFlair={purpleFlair}
                photoGrade={photoGrade}
                exporting={exporting}
                onLine1Change={(line1) =>
                  setDraft((current) => ({
                    ...current,
                    cards: patchTakeawaysCard(current.cards, cardIndex, {
                      line1,
                    }),
                  }))
                }
                onLine2Change={(line2) =>
                  setDraft((current) => ({
                    ...current,
                    cards: patchTakeawaysCard(current.cards, cardIndex, {
                      line2,
                    }),
                  }))
                }
                onFactChange={(fact) =>
                  setDraft((current) => ({
                    ...current,
                    cards: patchTakeawaysCard(current.cards, cardIndex, {
                      fact,
                    }),
                  }))
                }
                onPan={(pan) =>
                  setDraft((current) => ({
                    ...current,
                    cards: patchTakeawaysCard(current.cards, cardIndex, {
                      pan,
                    }),
                  }))
                }
                onUpload={(dataUrl) =>
                  setDraft((current) => ({
                    ...current,
                    cards: patchTakeawaysCard(current.cards, cardIndex, {
                      photoSrc: dataUrl,
                      customPhoto: true,
                    }),
                  }))
                }
                onPick={() => setPickerOpen(true)}
                onNameChange={(names) =>
                  setDraft((current) => ({
                    ...current,
                    cards: patchTakeawaysCard(current.cards, cardIndex, names),
                  }))
                }
              />
            </ComposerBoard>
            <StoryCropGuide on={storyCrop} />
          </div>
        </div>
      </main>
      {pickerOpen ? (
        <PlayerPicker
          heading={`Pick takeaway ${cardIndex + 1}`}
          hint="Names only — type the takeaway yourself. Never auto-fills PTS/REB/AST."
          currentId={card.playerId}
          usedLabels={usedTakeawaysPlayerLabels(draft.cards)}
          onClose={closePicker}
          onClear={() => {
            push(draft);
            setDraft((current) => ({
              ...current,
              cards: clearTakeawaysCard(current.cards, current.currentIndex),
            }));
            setPickerOpen(false);
          }}
          onPick={(playerId) => {
            const index = draft.currentIndex;
            const slot = draft.cards[index];
            if (slot && hasCustomTakeawaysPhoto(slot)) {
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
