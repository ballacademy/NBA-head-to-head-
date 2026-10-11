import { useCallback, useEffect, useRef, useState } from "react";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { EveryTeamGraphic } from "./EveryTeamGraphic";
import { exportEveryTeamFilename, exportEveryTeamPng } from "./exportEveryTeamPng";
import {
  assignPlayer,
  clearEveryTeamSlot,
  createEmptyEveryTeamSlots,
  DEFAULT_EVERY_TEAM_TITLE,
  isEveryTeamDraft,
  teamAtSlot,
  type EveryTeamSlots,
} from "./everyTeamState";
import "@fontsource/montserrat/latin-900.css";
import "./everyTeamComposer.css";

const STORAGE_KEY = "ddgm:every-team-composer";

interface EveryTeamComposerDraft {
  brand: string;
  title: string;
  slots: EveryTeamSlots;
}

const loadDraft = (): EveryTeamComposerDraft => {
  const stored = readJson<Partial<EveryTeamComposerDraft>>(STORAGE_KEY);
  if (isEveryTeamDraft(stored)) {
    return {
      brand: stored.brand.trim() || DEFAULT_BRAND,
      title: stored.title.trim() || DEFAULT_EVERY_TEAM_TITLE,
      slots: stored.slots,
    };
  }
  return {
    brand: stored?.brand?.trim() ? stored.brand : DEFAULT_BRAND,
    title: stored?.title?.trim() ? stored.title : DEFAULT_EVERY_TEAM_TITLE,
    slots: createEmptyEveryTeamSlots(),
  };
};

export function EveryTeamComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [title, setTitle] = useState(DEFAULT_EVERY_TEAM_TITLE);
  const [slots, setSlots] = useState<EveryTeamSlots>(createEmptyEveryTeamSlots);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    document.title = "Every team graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setTitle(draft.title);
    setSlots(draft.slots);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, { brand, title, slots });
  }, [brand, title, slots, hydrated]);

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
      await exportEveryTeamPng(node, exportEveryTeamFilename(title), {
        brand,
        title,
        slots,
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
    setBrand(DEFAULT_BRAND);
    setTitle(DEFAULT_EVERY_TEAM_TITLE);
    setSlots(createEmptyEveryTeamSlots());
    setActiveIndex(null);
    setStatus("Board cleared.");
  };

  const activeTeam = activeIndex != null ? teamAtSlot(activeIndex) : null;
  const currentId = activeIndex != null ? slots[activeIndex] : null;

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Every team</h1>
        </div>
        <label className="sc-field sc-field--wide">
          Title
          <input
            value={title}
            maxLength={COMPOSER_TITLE_MAX_LENGTH}
            onChange={(event) => onComposerTextChange(event, setTitle)}
          />
        </label>
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
          <EveryTeamGraphic
            ref={boardRef}
            brand={brand}
            title={title}
            slots={slots}
            activeIndex={exporting ? null : activeIndex}
            exporting={exporting}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onSelectSlot={setActiveIndex}
            onClearSlot={(index) =>
              setSlots((current) => clearEveryTeamSlot(current, index))
            }
          />
          <p className="sc-hint">
            Each square is a fixed NBA team. Click it to pick a player from that
            roster. Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null && activeTeam ? (
        <PlayerPicker
          heading={`Pick ${activeTeam.name} player`}
          hint={`Only current ${activeTeam.name} roster players.`}
          currentId={currentId}
          usedLabels={
            currentId
              ? { [currentId]: "This slot" }
              : {}
          }
          lockedTeam={activeTeam.id}
          onPick={(playerId) => {
            const player = getPlayer(playerId);
            if (!player || player.team !== activeTeam.id) {
              return;
            }
            setSlots((current) => assignPlayer(current, activeIndex, playerId));
            setActiveIndex(null);
          }}
          onClear={() => {
            setSlots((current) => clearEveryTeamSlot(current, activeIndex));
            setActiveIndex(null);
          }}
          onClose={closePicker}
        />
      ) : null}
    </div>
  );
}
