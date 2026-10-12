import { useCallback, useEffect, useRef, useState } from "react";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import {
  PLAYER_OF_THE_DAY_LOOK_KEY,
  useComposerLook,
} from "../instagramComposer/composerLook";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { fetchLastGame } from "./lastGame";
import { PlayerOfTheDayGraphic } from "./PlayerOfTheDayGraphic";
import { dataUrlFromClipboard } from "./PhotoFrame";
import {
  exportPlayerOfTheDayPng,
  exportPotdFilename,
} from "./exportPlayerOfTheDayPng";
import {
  applyPlayerPick,
  clearCard,
  defaultPotdDraft,
  isPotdDraft,
  patchCard,
  setCardPhoto,
  usedPlayerIds,
  type PotdCard,
  type PotdDraft,
} from "./playerOfTheDayState";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-900-italic.css";
import "./playerOfTheDayComposer.css";

const STORAGE_KEY = "ddgm:player-of-the-day-composer";

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

  useEffect(() => {
    document.title = "Player of the Day graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setTitle(draft.title);
    setDate(draft.date);
    setCards(draft.cards);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, { brand, title, date, cards });
  }, [brand, title, date, cards, hydrated]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

  const handleExport = async () => {
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
      await exportPlayerOfTheDayPng(node, exportPotdFilename(title), {
        brand,
        title,
        date,
        cards,
        look,
      });
      setStatus("Download started.");
    } catch (error) {
      console.error(error);
      setStatus("Could not export PNG.");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    const next = defaultPotdDraft();
    setBrand(next.brand);
    setTitle(next.title);
    setDate(next.date);
    setCards(next.cards);
    setActiveIndex(null);
    setStatus("Board cleared.");
  };

  const handlePick = async (playerId: string) => {
    if (activeIndex == null) {
      return;
    }
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    setStatus("Loading latest game…");
    const game = await fetchLastGame(player.id);
    setCards((current) => applyPlayerPick(current, activeIndex, player, game));
    if (game?.dateLabel) {
      setDate(game.dateLabel);
    }
    setActiveIndex(null);
    setStatus(
      game
        ? `Filled ${player.name} from ${game.dateLabel}.`
        : `Filled ${player.name}. No recent game stats found.`,
    );
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
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Player of the Day</h1>
        </div>
        <label className="sc-field sc-field--wide">
          Title
          <input
            value={title}
            maxLength={COMPOSER_TITLE_MAX_LENGTH}
            onChange={(event) => onComposerTextChange(event, setTitle)}
          />
        </label>
        <ComposerLookToggle look={look} onChange={setLook} />
        <div className="sc-toolbar__actions">
          <button type="button" className="sc-btn sc-btn--ghost" onClick={handleReset}>
            Reset
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
          <PlayerOfTheDayGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            date={date}
            cards={cards}
            look={look}
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
              setStatus("Photo cropped inside the frame — drag to pan.");
            }}
          />
          <p className="sc-hint">
            Pick a player to auto-fill their latest game. Upload or paste a
            photo, then drag it inside the frame. Downloads a 4:5 Instagram PNG
            — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null ? (
        <PlayerPicker
          heading={activeIndex === 0 ? "Pick left player" : "Pick right player"}
          hint="Search a name. We’ll fill the latest game, team color, and headshot."
          currentId={currentId}
          usedLabels={usedPlayerIds(cards)}
          onPick={(playerId) => {
            void handlePick(playerId);
          }}
          onClear={() => {
            setCards((current) => clearCard(current, activeIndex));
            setActiveIndex(null);
          }}
          onClose={closePicker}
        />
      ) : null}
    </div>
  );
}
