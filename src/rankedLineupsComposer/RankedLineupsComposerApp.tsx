import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { TeamHairlineToggle } from "../instagramComposer/TeamHairlineToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  LINEUP_LOOK_KEY,
  RANKED_LINEUPS_LOOK_KEY,
  parseShowTeamHairline,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import {
  copyGraphicCaption,
  rankedLineupCaption,
} from "../instagramComposer/graphicCaption";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  LINEUP_TITLE_PRESETS,
  RANKED_LINEUP_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { downloadExportPack } from "../instagramComposer/exportPack";
import { RankedLineupsGraphic } from "./RankedLineupsGraphic";
import { renderRankedLineupsCanvas } from "./renderRankedLineupsCanvas";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { exportRankedLineupsPng } from "./exportRankedLineupsPng";
import {
  applyPlayerPick,
  clampActiveSlide,
  clearStrip,
  defaultRankedLineupsDraft,
  emptyLineupSlide,
  hasCustomPhoto,
  isRankedLineupsDraft,
  lineupPosition,
  nextRankPill,
  patchStrip,
  DEFAULT_LINEUP_TITLE,
  DEFAULT_RANK_DISPLAY,
  parsePositionLabels,
  parseRankDisplay,
  POSITION_LABEL_MAX,
  RANK_PILL_MAX,
  RANK_PILL_PRESETS,
  setStripPhoto,
  slidesFromDraft,
  usedLineupPlayerIds,
  withActiveSlide,
  type RankedLineupSlide,
  type RankedLineupStrip,
  type RankedLineupsDraft,
} from "./rankedLineupsState";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-900-italic.css";
import "./rankedLineupsComposer.css";

const RANKED_STORAGE_KEY = "ddgm:ranked-lineups-composer";
const RANKED_SAVES_KEY = "ddgm:ranked-lineups-composer:saves";
const LINEUP_STORAGE_KEY = "ddgm:lineup-composer";
const LINEUP_SAVES_KEY = "ddgm:lineup-composer:saves";

const loadDraft = (unranked: boolean): RankedLineupsDraft => {
  const stored = readJson<Partial<RankedLineupsDraft>>(
    unranked ? LINEUP_STORAGE_KEY : RANKED_STORAGE_KEY,
  );
  const empty = defaultRankedLineupsDraft();
  if (unranked) {
    empty.title = DEFAULT_LINEUP_TITLE;
    empty.rankDisplay = "none";
    empty.rank = "";
  }
  if (isRankedLineupsDraft(stored)) {
    const slides = slidesFromDraft(stored);
    return withActiveSlide(
      {
        ...empty,
        ...stored,
        showBa: stored.showBa === true,
        showFade: stored.showFade === true,
        showTeamHairline: parseShowTeamHairline(stored.showTeamHairline),
        rankDisplay: parseRankDisplay(
          stored.rankDisplay,
          unranked ? "none" : "pill",
        ),
        positionLabels: parsePositionLabels(stored.positionLabels),
      },
      slides,
      stored.activeSlide ?? 0,
    );
  }
  return {
    ...empty,
    brand: stored?.brand?.trim() ? stored.brand : empty.brand,
    title: stored?.title?.trim()
      ? stored.title
      : unranked
        ? DEFAULT_LINEUP_TITLE
        : empty.title,
    showBa: stored?.showBa === true,
    showFade: stored?.showFade === true,
    showTeamHairline: parseShowTeamHairline(stored?.showTeamHairline),
    rankDisplay: parseRankDisplay(
      stored?.rankDisplay,
      unranked ? "none" : "pill",
    ),
    positionLabels: parsePositionLabels(stored?.positionLabels),
  };
};

export function RankedLineupsComposerApp({
  unranked = false,
}: {
  unranked?: boolean;
}) {
  const boardRef = useRef<HTMLElement | null>(null);
  const storageKey = unranked ? LINEUP_STORAGE_KEY : RANKED_STORAGE_KEY;
  const savesKey = unranked ? LINEUP_SAVES_KEY : RANKED_SAVES_KEY;
  const empty = defaultRankedLineupsDraft();
  if (unranked) {
    empty.title = DEFAULT_LINEUP_TITLE;
    empty.rankDisplay = "none";
    empty.rank = "";
  }
  const [brand, setBrand] = useState(empty.brand);
  const [title, setTitle] = useState(empty.title);
  const [rank, setRank] = useState(empty.rank);
  const [strips, setStrips] = useState<RankedLineupStrip[]>(empty.strips);
  const [slides, setSlides] = useState<RankedLineupSlide[]>(empty.slides ?? []);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoTarget, setPhotoTarget] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(
    unranked ? LINEUP_LOOK_KEY : RANKED_LINEUPS_LOOK_KEY,
  );
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [showBa, setShowBa] = useState(false);
  const [showFade, setShowFade] = useState(false);
  const [showTeamHairline, setShowTeamHairline] = useState(true);
  const [rankDisplay, setRankDisplay] = useState(
    unranked ? "none" : DEFAULT_RANK_DISPLAY,
  );
  const [positionLabels, setPositionLabels] = useState(
    parsePositionLabels(empty.positionLabels),
  );
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<RankedLineupStrip[]>();

  const persistSlide = useCallback(
    (nextStrips: RankedLineupStrip[], nextRank = rank, index = activeSlide) => {
      setSlides((current) =>
        current.map((slide, slideIndex) =>
          slideIndex === index
            ? { rank: nextRank, strips: nextStrips }
            : slide,
        ),
      );
    },
    [activeSlide, rank],
  );

  useEffect(() => {
    document.title = unranked ? "Lineup graphic" : "Ranked lineups graphic";
  }, [unranked]);

  useEffect(() => {
    const draft = loadDraft(unranked);
    setBrand(draft.brand);
    setTitle(draft.title);
    setRank(draft.rank);
    setStrips(draft.strips);
    setSlides(slidesFromDraft(draft));
    setActiveSlide(draft.activeSlide ?? 0);
    setShowBa(draft.showBa === true);
    setShowFade(draft.showFade === true);
    setShowTeamHairline(parseShowTeamHairline(draft.showTeamHairline));
    setRankDisplay(parseRankDisplay(draft.rankDisplay, unranked ? "none" : "pill"));
    setPositionLabels(parsePositionLabels(draft.positionLabels));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(storageKey, {
      brand,
      title,
      rank,
      strips,
      slides,
      activeSlide,
      showBa,
      showFade,
      showTeamHairline,
      rankDisplay,
      positionLabels,
    });
  }, [brand, title, rank, strips, slides, activeSlide, showBa, showFade, showTeamHairline, rankDisplay, positionLabels, hydrated, storageKey]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

  const applyDraft = (draft: RankedLineupsDraft) => {
    const next = withActiveSlide(
      draft,
      slidesFromDraft(draft),
      draft.activeSlide ?? 0,
    );
    setBrand(next.brand);
    setTitle(next.title);
    setRank(next.rank);
    setStrips(next.strips);
    setSlides(slidesFromDraft(next));
    setActiveSlide(next.activeSlide ?? 0);
    setShowBa(next.showBa === true);
    setShowFade(next.showFade === true);
    setShowTeamHairline(parseShowTeamHairline(next.showTeamHairline));
    setRankDisplay(parseRankDisplay(next.rankDisplay));
    setPositionLabels(parsePositionLabels(next.positionLabels));
    setActiveIndex(null);
  };

  const selectSlide = (index: number) => {
    const committed = slides.map((slide, slideIndex) =>
      slideIndex === activeSlide ? { rank, strips } : slide,
    );
    const nextIndex = clampActiveSlide(committed, index);
    const slide = committed[nextIndex];
    if (!slide) {
      return;
    }
    setSlides(committed);
    setActiveSlide(nextIndex);
    setRank(slide.rank);
    setStrips(slide.strips);
    setActiveIndex(null);
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
      await exportRankedLineupsPng(
        node,
        filename ??
          exportFilenameFromTitle(
            title,
            unranked ? "lineup" : "ranked-lineups",
            unranked ? "" : rank.toLowerCase(),
          ),
        {
          brand,
          title,
          rank,
          strips,
          look,
          purpleFlair,
          showBa,
          showFade,
          showTeamHairline,
          rankDisplay: unranked ? "none" : rankDisplay,
          positionLabels,
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

  const handleExportAll = async () => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setActiveIndex(null);
    try {
      for (const [index, slide] of slides.entries()) {
        setStatus(`Rendering slide ${index + 1} of ${slides.length}…`);
        await exportRankedLineupsPng(
          node,
          exportFilenameFromTitle(
            title,
            "ranked-lineups",
            slide.rank.toLowerCase(),
          ),
          {
            brand,
            title,
            rank: slide.rank,
            strips: slide.strips,
            look,
            purpleFlair,
            showBa,
            showFade,
            showTeamHairline,
            rankDisplay,
            positionLabels,
          },
        );
        await new Promise((resolve) => window.setTimeout(resolve, 280));
      }
      setStatus(`Exported ${slides.length} PNG${slides.length === 1 ? "" : "s"}.`);
    } catch (error) {
      console.error(error);
      setStatus("Could not export all slides.");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    const next = defaultRankedLineupsDraft();
    push(strips);
    applyDraft(next);
    setStatus("Board cleared.");
  };

  const handleNextSlide = () => {
    const nextRank = nextRankPill(rank);
    const next = emptyLineupSlide(nextRank);
    const nextSlides = [
      ...slides.slice(0, activeSlide),
      { rank, strips },
      next,
    ];
    push(strips);
    setSlides(nextSlides);
    setActiveSlide(nextSlides.length - 1);
    setRank(next.rank);
    setStrips(next.strips);
    setActiveIndex(null);
    setStatus(`Started ${next.rank} with the same title.`);
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
    setStrips((current) => {
      const next = applyPlayerPick(current, index, player, keepCustomPhoto);
      persistSlide(next);
      return next;
    });
    setActiveIndex(null);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name} at ${lineupPosition(index)}.`
        : `Filled ${player.name} at ${lineupPosition(index)}.`,
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
        setStrips((current) => {
          const next = setStripPhoto(current, index, dataUrl);
          persistSlide(next);
          return next;
        });
        setStatus("Pasted photo into the strip.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeIndex, photoTarget, persistSlide]);

  const currentId =
    activeIndex != null ? strips[activeIndex]?.playerId ?? null : null;
  const activePos =
    activeIndex != null ? lineupPosition(activeIndex) : "PG";
  const board: RankedLineupsDraft = {
    brand,
    title,
    rank,
    strips,
    slides,
    activeSlide,
    showBa,
    showFade,
    showTeamHairline,
    rankDisplay,
    positionLabels,
  };

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">
            {unranked ? "Lineup" : "Ranked lineups"}
          </h1>
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
          presets={unranked ? LINEUP_TITLE_PRESETS : RANKED_LINEUP_TITLE_PRESETS}
          onChange={setTitle}
        />
        {unranked ? null : (
        <>
        <label className="sc-field">
          Rank
          <select
            value={
              (RANK_PILL_PRESETS as readonly string[]).includes(
                rank.toUpperCase(),
              )
                ? rank.toUpperCase()
                : ""
            }
            aria-label="Rank pill preset"
            onChange={(event) => {
              if (event.target.value) {
                setRank(event.target.value);
                persistSlide(strips, event.target.value);
              }
            }}
          >
            <option value="">Custom</option>
            {RANK_PILL_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </label>
        <div className="sc-look" role="group" aria-label="Rank style">
          <span className="sc-look__label">Rank style</span>
          <button
            type="button"
            className={rankDisplay === "headline" ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={rankDisplay === "headline"}
            onClick={() => setRankDisplay("headline")}
          >
            #1
          </button>
          <button
            type="button"
            className={rankDisplay === "pill" ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={rankDisplay === "pill"}
            onClick={() => setRankDisplay("pill")}
          >
            Pill
          </button>
        </div>
        <label className="sc-field">
          Pill
          <input
            value={rank}
            maxLength={RANK_PILL_MAX}
            aria-label="Rank pill text"
            onChange={(event) => {
              const next = event.target.value.slice(0, RANK_PILL_MAX);
              setRank(next);
              persistSlide(strips, next);
            }}
          />
        </label>
        </>
        )}
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <TeamHairlineToggle on={showTeamHairline} onChange={setShowTeamHairline} />
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Names in photo</span>
          <button
            type="button"
            className={showFade ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={showFade}
            aria-label="First and last name with team logo on the photo"
            onClick={() => setShowFade((on) => !on)}
          >
            {showFade ? "On" : "Off"}
          </button>
        </label>
        <ComposerSaves
          storageKey={savesKey}
          board={board}
          onLoad={(next) => {
            applyDraft(next);
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
                setStrips(previous);
                persistSlide(previous);
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
          {unranked ? null : (
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={handleNextSlide}
            disabled={exporting}
          >
            Next slide
          </button>
          )}
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void copyGraphicCaption(
                rankedLineupCaption(title, rank, strips),
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
                  title,
                  "ranked-lineups",
                  rank.toLowerCase(),
                  true,
                ),
                true,
              )
            }
            disabled={exporting}
          >
            Export 9:16
          </button>
          {unranked ? null : (
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => void handleExportAll()}
            disabled={exporting || slides.length === 0}
          >
            Export all slides
          </button>
          )}
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              void (async () => {
                setExporting(true);
                setStatus("Rendering pack…");
                try {
                  const stem = unranked ? "lineup" : "ranked-lineups";
                  const extras =
                    unranked || slides.length < 2
                      ? []
                      : slides.slice(activeSlide + 1, activeSlide + 2).map(
                          (slide) => ({
                            filename: exportFilenameFromTitle(
                              title,
                              stem,
                              slide.rank.toLowerCase(),
                            ),
                            render: () =>
                              renderRankedLineupsCanvas(
                                {
                                  brand,
                                  title,
                                  rank: slide.rank,
                                  strips: slide.strips,
                                  look,
                                  purpleFlair,
                                  showBa,
                                  showFade,
                                  showTeamHairline,
                                  rankDisplay,
                                  positionLabels,
                                },
                                2,
                              ),
                          }),
                        );
                  await downloadExportPack(
                    () =>
                      renderRankedLineupsCanvas(
                        {
                          brand,
                          title,
                          rank,
                          strips,
                          look,
                          purpleFlair,
                          showBa,
                          showFade,
                          showTeamHairline,
                          rankDisplay: unranked ? "none" : rankDisplay,
                          positionLabels,
                        },
                        2,
                      ),
                    exportFilenameFromTitle(
                      title,
                      stem,
                      unranked ? "" : rank.toLowerCase(),
                    ),
                    extras,
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
          <RankedLineupsGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            rank={rank}
            strips={strips}
            look={look}
            purpleFlair={purpleFlair}
            showBa={showBa}
            showFade={showFade}
            showTeamHairline={showTeamHairline}
            rankDisplay={unranked ? "none" : rankDisplay}
            positionLabels={positionLabels}
            onPositionChange={(index, label) =>
              setPositionLabels((current) => {
                const next = parsePositionLabels(current);
                next[index] = label.slice(0, POSITION_LABEL_MAX);
                return next;
              })
            }
            exporting={exporting}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onRankChange={(value) => {
              setRank(value);
              persistSlide(strips, value);
            }}
            onHover={setPhotoTarget}
            onPick={(index) => {
              setPhotoTarget(index);
              setActiveIndex(index);
            }}
            onPan={(index, pan) => {
              setPhotoTarget(index);
              setStrips((current) => {
                const next = patchStrip(current, index, { pan });
                persistSlide(next);
                return next;
              });
            }}
            onUpload={(index, dataUrl) => {
              setPhotoTarget(index);
              setStrips((current) => {
                const next = setStripPhoto(current, index, dataUrl);
                persistSlide(next);
                return next;
              });
              setStatus(
                "Photo cropped inside the strip — pinch, scroll, or +/− to scale, drag to pan.",
              );
            }}
            onNameChange={(index, names) => {
              setStrips((current) => {
                const next = patchStrip(current, index, names);
                persistSlide(next);
                return next;
              });
            }}
          />
          </ComposerBoard>
          {unranked ? null : (
          <div className="rl-series" role="tablist" aria-label="Carousel slides">
            {slides.map((slide, index) => (
              <button
                key={`slide-${index}-${slide.rank}`}
                type="button"
                role="tab"
                className={
                  index === activeSlide ? "rl-series__thumb is-on" : "rl-series__thumb"
                }
                aria-selected={index === activeSlide}
                aria-label={`${slide.rank} slide`}
                onClick={() => selectSlide(index)}
              >
                <span className="rl-series__rank">{slide.rank}</span>
                <span className="rl-series__strips" aria-hidden="true">
                  {slide.strips.map((strip, stripIndex) => (
                    <span
                      key={`${slide.rank}-${stripIndex}`}
                      className="rl-series__strip"
                      style={
                        strip.photoSrc
                          ? { backgroundImage: `url(${strip.photoSrc})` }
                          : undefined
                      }
                    />
                  ))}
                </span>
              </button>
            ))}
          </div>
          )}
          <p className="sc-hint">
            {unranked
              ? "Five PG–C strips with no rank pill. Positions are editable or removable. Custom photos, frames, purple, and named saves. Downloads a 4:5 Instagram PNG — nothing is posted."
              : "Five PG–C strips for one carousel part. Next slide keeps the title, bumps BEST to 2ND, and clears players. Paste or drop a photo onto a strip. Downloads a 4:5 Instagram PNG — nothing is posted."}
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={`Pick ${activePos}`}
          hint={`Only one player per strip. We’ll drop their headshot into ${activePos} — upload your own photo to replace it.`}
          currentId={currentId}
          usedLabels={usedLineupPlayerIds(strips)}
          onPick={handlePick}
          onClear={() => {
            push(strips);
            setStrips((current) => {
              const next = clearStrip(current, activeIndex);
              persistSlide(next);
              return next;
            });
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
