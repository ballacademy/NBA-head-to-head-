import { useCallback, useEffect, useRef, useState } from "react";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { ComposerNightDate } from "../instagramComposer/ComposerNightDate";
import { useComposerNight } from "../instagramComposer/composerNight";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import {
  copyGraphicCaption,
  graphicCaption,
  stripCaptionName,
} from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { keepComposerPhotos } from "../instagramComposer/composerPhotos";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  PLAYER_OF_THE_DAY_LOOK_KEY,
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
import { showComposerToast } from "../instagramComposer/composerFillToast";
import { fetchRecentGames, formatDateLabel, type LastGame } from "./lastGame";
import {
  fetchNightBoxAppearances,
  type NightStandout,
} from "./nightStandouts";
import { GamePicker } from "./GamePicker";
import { POTD_TITLE_PRESETS, exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { downloadExportPack } from "../instagramComposer/exportPack";
import {
  addNamedLeaderboardEntries,
  readLeaderboardDraft,
} from "../potdLeaderboardComposer/potdLeaderboardState";
import { renderPotdLeaderboardCanvas } from "../potdLeaderboardComposer/renderPotdLeaderboardCanvas";
import { PlayerOfTheDayGraphic } from "./PlayerOfTheDayGraphic";
import { renderPlayerOfTheDayCanvas } from "./renderPlayerOfTheDayCanvas";
import { dataUrlFromClipboard } from "./PhotoFrame";
import {
  exportPlayerOfTheDayPng,
} from "./exportPlayerOfTheDayPng";
import {
  applyLeaderboardTotals,
  applyPlayerPick,
  cardPlayerName,
  fillPotdFromStandouts,
  hasCustomPhoto,
  leaderboardTotalForName,
  clearCard,
  defaultPotdDraft,
  isPotdDraft,
  patchCard,
  potdNightHeading,
  potdPickerHeading,
  potdPickerSuggestions,
  potdSlotLabel,
  rankPotdNightBest,
  resizePotdCards,
  setCardPhoto,
  usedPlayerIds,
  type PotdCard,
  type PotdDraft,
} from "./playerOfTheDayState";
import { subscribeLeaderboard } from "../potdLeaderboardComposer/potdLeaderboardState";

import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-900-italic.css";
import "./playerOfTheDayComposer.css";
import { confirmBlankPost } from "../instagramComposer/confirmBlankPost";
import {
  nextEmptySlotIndex,
  slotMissingPlayer,
} from "../instagramComposer/nextEmptySlot";

const STORAGE_KEY = "ddgm:player-of-the-day-composer";
const SAVES_KEY = "ddgm:player-of-the-day-composer:saves";

const loadDraft = (): PotdDraft => {
  const stored = readJson<Partial<PotdDraft>>(STORAGE_KEY);
  if (isPotdDraft(stored)) {
    return stored;
  }
  const empty = defaultPotdDraft();
  return {
    brand: stored?.brand?.trim() ? stored.brand : empty.brand,
    title: stored?.title?.trim() ? stored.title : empty.title,
    date: stored?.date?.trim() ? stored.date : empty.date,
    cards: empty.cards,
    showBa: stored?.showBa === true,
    wlColor: stored?.wlColor === true,
  };
};

export function PlayerOfTheDayComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultPotdDraft();
  const [brand, setBrand] = useState(empty.brand);
  const [title, setTitle] = useState(empty.title);
  const [date, setDate] = useState(empty.date);
  const [cards, setCards] = useState<PotdCard[]>(empty.cards);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [photoTarget, setPhotoTarget] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(PLAYER_OF_THE_DAY_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] = usePhotoGrade();
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [showBa, setShowBa] = useState(false);
  const [wlColor, setWlColor] = useState(false);
  const [gameChoices, setGameChoices] = useState<LastGame[] | null>(null);
  const [keepPrompt, setKeepPrompt] = useState<{
    index: number;
    playerId: string;
    playerName: string;
    game: LastGame | null;
    total: string;
  } | null>(null);
  const pendingPick = useRef<{
    index: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<PotdCard[]>();
  const night = useComposerNight();
  const [nightBest, setNightBest] = useState<NightStandout[]>([]);
  const [nightBestLoading, setNightBestLoading] = useState(false);

  useEffect(() => {
    document.title = "Player of the Day graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setTitle(draft.title);
    setDate(draft.date);
    setCards(applyLeaderboardTotals(draft.cards));
    setShowBa(draft.showBa === true);
    setWlColor(draft.wlColor === true);
    setHydrated(true);
  }, []);

  useEffect(() => subscribeLeaderboard(() => {
    setCards((current) => applyLeaderboardTotals(current));
  }), []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, { brand, title, date, cards, showBa, wlColor });
  }, [brand, title, date, cards, showBa, wlColor, hydrated]);

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
      await exportPlayerOfTheDayPng(
        node,
        filename ?? exportFilenameFromTitle(title, "player-of-the-day", date),
        { brand, title, date, cards, look, purpleFlair, photoGrade, showBa, wlColor },
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

  const handleResetKeepPhotos = () => {
    const blank = defaultPotdDraft();
    const kept = keepComposerPhotos(blank, { ...blank, brand, title, date, cards });
    push(cards);
    setBrand(kept.brand);
    setTitle(kept.title);
    setDate(kept.date);
    setCards(kept.cards);
    setActiveIndex(null);
    setStatus("Reset — photos kept.");
  };

  const handleReset = () => {
    if (!confirmBlankPost()) {
      return;
    }
    const next = defaultPotdDraft();
    push(cards);
    setBrand(next.brand);
    setTitle(next.title);
    setDate(next.date);
    setCards(next.cards);
    setShowBa(next.showBa === true);
    setWlColor(next.wlColor === true);
    setActiveIndex(null);
    setStatus("Blank post.");
  };

  const loadNightBest = useCallback(async (iso = night.date) => {
    setNightBestLoading(true);
    try {
      const rows = rankPotdNightBest(await fetchNightBoxAppearances(iso));
      setNightBest(rows);
      return rows;
    } catch (error) {
      console.error(error);
      return [] as NightStandout[];
    } finally {
      setNightBestLoading(false);
    }
  }, [night.date]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    void loadNightBest(night.date);
  }, [hydrated, night.date, loadNightBest]);

  useEffect(() => {
    if (activeIndex == null) {
      return;
    }
    void loadNightBest(night.date);
  }, [activeIndex, night.date, loadNightBest]);

  const handleFillNight = async () => {
    setStatus("Loading this night’s box scores…");
    const rows = await loadNightBest(night.date);
    push(cards);
    const next = fillPotdFromStandouts(cards, rows);
    setCards(next);
    setDate(formatDateLabel(night.date));
    const names = next.map(cardPlayerName).filter(Boolean);
    if (names.length >= 3) {
      setStatus(`Filled ${names.slice(0, -1).join(", ")}, and ${names.at(-1)}.`);
    } else if (names.length === 2) {
      setStatus(`Filled ${names.join(" and ")}.`);
    } else if (names.length === 1) {
      setStatus(`Filled ${names[0]}. Only one line for that night.`);
    } else {
      setStatus("No box scores for that night yet — pick players for the empty slots.");
    }
    if (statsSample === "preseason") {
      showComposerToast("Fill is preseason.");
    }
  };

  const handlePick = async (playerId: string) => {
    if (activeIndex == null) {
      return;
    }
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    const standout = nightBest.find((row) => row.athleteId === playerId);
    pendingPick.current = {
      index: activeIndex,
      playerId: player.id,
      playerName: player.name,
    };
    if (standout) {
      applyPickedGame(standout.game);
      return;
    }
    setStatus("Loading recent games…");
    const games = await fetchRecentGames(player.id, statsSample);
    if (games.length > 1) {
      setGameChoices(games);
      setStatus(`Pick a game for ${player.name}.`);
      return;
    }
    applyPickedGame(games[0] ?? null);
  };

  const commitPick = (
    index: number,
    playerId: string,
    game: LastGame | null,
    total: string,
    keepCustomPhoto: boolean,
  ) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    push(cards);
    setCards((current) => {
      const next = applyPlayerPick(current, index, player, game, total, keepCustomPhoto);
      setActiveIndex(nextEmptySlotIndex(next, index, slotMissingPlayer));
      return next;
    });
    if (game?.dateLabel) {
      setDate(game.dateLabel);
    }
    setGameChoices(null);
    setKeepPrompt(null);
    pendingPick.current = null;
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name}.`
        : game
          ? `Filled ${player.name} from ${game.dateLabel}.`
          : `Filled ${player.name}. No recent game stats found.`,
    );
  };

  const applyPickedGame = (game: LastGame | null) => {
    const pending = pendingPick.current;
    const player = pending ? getPlayer(pending.playerId) : null;
    const index = pending?.index ?? activeIndex;
    if (player == null || index == null) {
      setGameChoices(null);
      return;
    }
    const total = leaderboardTotalForName(player.name);
    const current = cards[index];
    if (current && hasCustomPhoto(current)) {
      setKeepPrompt({
        index,
        playerId: player.id,
        playerName: player.name,
        game,
        total,
      });
      setGameChoices(null);
      setActiveIndex(null);
      return;
    }
    commitPick(index, player.id, game, total, false);
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        const index = activeIndex ?? photoTarget;
        setCards((current) => setCardPhoto(current, index, dataUrl));
        setStatus("Pasted photo into the frame.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [activeIndex, photoTarget]);

  const currentId =
    activeIndex != null ? cards[activeIndex]?.playerId ?? null : null;

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Player of the Day"
        identity={
          <>
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
          presets={POTD_TITLE_PRESETS}
          onChange={setTitle}
        />
          </>
        }
        data={
          <>
          <ComposerStatsSampleToggle
            sample={statsSample}
            onChange={setStatsSample}
          />
          <ComposerNightDate
            date={night.date}
            todayIso={night.todayIso}
            yesterdayIso={night.yesterdayIso}
            onChange={(iso) => {
              night.setDate(iso);
              setDate(formatDateLabel(iso));
            }}
          />
          <button
            type="button"
            className="sc-chip"
            aria-label="Fill players from this night’s best lines"
            onClick={() => void handleFillNight()}
            disabled={nightBestLoading}
          >
            Fill
          </button>
          <div className="sc-look" role="group" aria-label="Player count">
            <span className="sc-look__label">Players</span>
            {[2, 3].map((count) => (
              <button
                key={count}
                type="button"
                className={cards.length === count ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={cards.length === count}
                aria-label={`${count} players`}
                onClick={() => {
                  if (cards.length === count) {
                    return;
                  }
                  push(cards);
                  setCards((current) => resizePotdCards(current, count));
                  if (count === 2 && activeIndex != null && activeIndex > 1) {
                    setActiveIndex(null);
                    setPhotoTarget(0);
                  }
                }}
              >
                {count}
              </button>
            ))}
          </div>
          <div className="sc-look" role="group" aria-label="Slots">
            <span className="sc-look__label">Slots</span>
            {cards.map((_, index) => (
              <button
                key={`slot-${index}`}
                type="button"
                className="sc-chip"
                onClick={() => {
                  setPhotoTarget(index);
                  setActiveIndex(index);
                }}
              >
                {potdSlotLabel(index, cards.length).replace(" card", "")}
              </button>
            ))}
            <button
              type="button"
              className="sc-chip"
              aria-label="Add names to the POTD leaderboard"
              onClick={() => {
                const names = cards.map(cardPlayerName).filter(Boolean);
                if (names.length < 2) {
                  setStatus("Pick at least two players first.");
                  return;
                }
                addNamedLeaderboardEntries(names);
                setStatus("Added names to the leaderboard.");
              }}
            >
              Add both to board
            </button>
            <button
              type="button"
              className="sc-chip"
              aria-label="Swap sides"
              onClick={() =>
                setCards((current) =>
                  current.length < 2 ? current : current.slice().reverse(),
                )
              }
            >
              Swap sides
            </button>
          </div>
          </>
        }
        board={
          <>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <PhotoGradeToggle on={photoGrade} onChange={setPhotoGrade} intensity={gradeIntensity} onIntensityChange={setGradeIntensity} />
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">W/L color</span>
          <button
            type="button"
            className={wlColor ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={wlColor}
            aria-label="Color W/L on the score strip"
            onClick={() => setWlColor((current) => !current)}
          >
            {wlColor ? "On" : "Off"}
          </button>
        </label>
        <BaMarkToggle on={showBa} onChange={setShowBa} />
          </>
        }
        persist={
        <ComposerSaves
          storageKey={SAVES_KEY}
          board={{ brand, title, date, cards, showBa, wlColor }}
          onLoad={(next) => {
            setBrand(next.brand);
            setTitle(next.title);
            setDate(next.date);
            setCards(next.cards);
            setShowBa(next.showBa === true);
            setWlColor(next.wlColor === true);
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
                setCards(previous);
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
                  cards.map(stripCaptionName).filter(Boolean),
                  [date],
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
                exportFilenameFromTitle(title, "player-of-the-day", date, true),
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
                setStatus("Rendering POTD pack…");
                try {
                  const matchup = exportFilenameFromTitle(
                    title,
                    "player-of-the-day",
                    date,
                  );
                  const board = readLeaderboardDraft();
                  await downloadExportPack(
                    () =>
                      renderPlayerOfTheDayCanvas(
                        {
                          brand,
                          title,
                          date,
                          cards,
                          look,
                          purpleFlair,
                          photoGrade,
                          showBa,
                          wlColor,
                        },
                        2,
                      ),
                    matchup,
                    [
                      {
                        filename: exportFilenameFromTitle(
                          board.title,
                          "potd-leaderboard",
                          date,
                        ),
                        render: () =>
                          renderPotdLeaderboardCanvas(
                            { ...board, look, purpleFlair },
                            2,
                          ),
                      },
                    ],
                    { letterbox: false },
                  );
                  setStatus("Pack download started (matchup + leaderboard).");
                } catch (error) {
                  console.error(error);
                  setStatus("Could not export POTD pack.");
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
          <ComposerBoard>
          <PlayerOfTheDayGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            date={date}
            cards={cards}
            look={look}
            purpleFlair={purpleFlair}
            photoGrade={photoGrade}
            showBa={showBa}
            wlColor={wlColor}
            exporting={exporting}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onDateChange={setDate}
            onPick={(index) => {
              setPhotoTarget(index);
              setActiveIndex(index);
            }}
            onTotalChange={(index, value) =>
              setCards((current) => patchCard(current, index, { total: value }))
            }
            onStatsChange={(index, stats) =>
              setCards((current) => patchCard(current, index, { stats }))
            }
            onResultChange={(index, value) =>
              setCards((current) => patchCard(current, index, { result: value }))
            }
            onPan={(index, pan) => {
              setPhotoTarget(index);
              setCards((current) => patchCard(current, index, { pan }));
            }}
            onUpload={(index, dataUrl) => {
              setPhotoTarget(index);
              setCards((current) => setCardPhoto(current, index, dataUrl));
              setStatus("Photo cropped inside the frame — pinch, scroll, or +/− to scale, drag to pan.");
            }}
          />
          </ComposerBoard>
          <p className="sc-hint">
            Pick a player, then choose a recent box score — the date matches
            that game. Upload or paste a photo, then drag to pan and pinch or
            scroll to zoom. Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={potdPickerHeading(activeIndex, cards.length)}
          hint="Gold cards are this night’s best lines — same ranking as Fill. Already-used names of the set are marked. Search still lists everyone."
          currentId={currentId}
          usedLabels={usedPlayerIds(cards)}
          suggested={potdPickerSuggestions(nightBest)}
          suggestedHeading={potdNightHeading(
            night.date,
            night.todayIso,
            night.yesterdayIso,
          )}
          suggestedLoading={nightBestLoading}
          suggestedEmpty="No box scores for this night yet."
          onPick={(playerId) => {
            void handlePick(playerId);
          }}
          onClear={() => {
            push(cards);
            setCards((current) => clearCard(current, activeIndex));
            setActiveIndex(null);
          }}
          onClose={closePicker}
        />
      ) : null}
      {gameChoices ? (
        <GamePicker
          playerName={pendingPick.current?.playerName ?? "this player"}
          games={gameChoices}
          onPick={(game) => applyPickedGame(game)}
          onClose={() => {
            setGameChoices(null);
            applyPickedGame(gameChoices[0] ?? null);
          }}
        />
      ) : null}
      {keepPrompt ? (
        <KeepCustomPhotoDialog
          playerName={keepPrompt.playerName}
          onKeep={() =>
            commitPick(
              keepPrompt.index,
              keepPrompt.playerId,
              keepPrompt.game,
              keepPrompt.total,
              true,
            )
          }
          onReplace={() =>
            commitPick(
              keepPrompt.index,
              keepPrompt.playerId,
              keepPrompt.game,
              keepPrompt.total,
              false,
            )
          }
          onClose={() => {
            setKeepPrompt(null);
            pendingPick.current = null;
          }}
        />
      ) : null}
    </div>
  );
}
