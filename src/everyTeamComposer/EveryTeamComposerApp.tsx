import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import {
  EVERY_TEAM_LOOK_KEY,
  useComposerLook,
} from "../instagramComposer/composerLook";
import {
  EVERY_TEAM_TITLE_PRESETS,
  exportDateStamp,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  onComposerTextChange,
} from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import {
  ALL_PLAYER_FILTER,
  EMPTY_PLAYER_FILTERS,
  POSITION_FILTERS,
  getPlayer,
} from "../tierListComposer/nbaActivePlayers";
import { EveryTeamGraphic } from "./EveryTeamGraphic";
import { exportEveryTeamPng } from "./exportEveryTeamPng";
import {
  assignPlayer,
  clearEveryTeamSlot,
  createEmptyEveryTeamSlots,
  DEFAULT_EVERY_TEAM_TITLE,
  isEveryTeamDraft,
  nextEmptyEveryTeamSlot,
  teamAtSlot,
  usedEveryTeamLabels,
  type EveryTeamSlots,
} from "./everyTeamState";
import "@fontsource/montserrat/latin-900.css";
import "./everyTeamComposer.css";

const STORAGE_KEY = "ddgm:every-team-composer";

interface EveryTeamComposerDraft {
  brand: string;
  title: string;
  slots: EveryTeamSlots;
  showBa?: boolean;
}

const loadDraft = (): EveryTeamComposerDraft => {
  const stored = readJson<Partial<EveryTeamComposerDraft>>(STORAGE_KEY);
  if (isEveryTeamDraft(stored)) {
    return {
      brand: stored.brand.trim() || DEFAULT_BRAND,
      title: stored.title.trim() || DEFAULT_EVERY_TEAM_TITLE,
      slots: stored.slots,
      showBa: stored.showBa === true,
    };
  }
  return {
    brand: stored?.brand?.trim() ? stored.brand : DEFAULT_BRAND,
    title: stored?.title?.trim() ? stored.title : DEFAULT_EVERY_TEAM_TITLE,
    slots: createEmptyEveryTeamSlots(),
    showBa: stored?.showBa === true,
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
  const [look, setLook] = useComposerLook(EVERY_TEAM_LOOK_KEY);
  const [showBa, setShowBa] = useState(false);
  const [samePosition, setSamePosition] = useState(false);
  const [fillPosition, setFillPosition] = useState("PG");
  const { push, pop, canUndo } = useComposerUndo<EveryTeamSlots>();

  useEffect(() => {
    document.title = "Every team graphic";
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    setBrand(draft.brand);
    setTitle(draft.title);
    setSlots(draft.slots);
    setShowBa(draft.showBa === true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, { brand, title, slots, showBa });
  }, [brand, title, slots, showBa, hydrated]);

  const closePicker = useCallback(() => setActiveIndex(null), []);

  const filenameFor = (story = false) =>
    exportFilenameFromTitle(title, "every-nba-team", exportDateStamp(), story);

  const handleExport = async (story = false) => {
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
      await exportEveryTeamPng(
        node,
        filenameFor(story),
        { brand, title, slots, look, showBa },
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

  const handleReset = () => {
    push(slots);
    setBrand(DEFAULT_BRAND);
    setTitle(DEFAULT_EVERY_TEAM_TITLE);
    setSlots(createEmptyEveryTeamSlots());
    setActiveIndex(null);
    setStatus("Board cleared.");
  };

  const activeTeam = activeIndex != null ? teamAtSlot(activeIndex) : null;
  const currentId = activeIndex != null ? slots[activeIndex] : null;
  const lockedFilters =
    samePosition && fillPosition !== ALL_PLAYER_FILTER
      ? { ...EMPTY_PLAYER_FILTERS, position: fillPosition }
      : undefined;

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
        <TitlePresetSelect
          value={title}
          presets={EVERY_TEAM_TITLE_PRESETS}
          onChange={setTitle}
        />
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Same position</span>
          <button
            type="button"
            className={samePosition ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={samePosition}
            aria-label="Same position on every team"
            onClick={() =>
              setSamePosition((current) => {
                if (!current && fillPosition === ALL_PLAYER_FILTER) {
                  setFillPosition("PG");
                }
                return !current;
              })
            }
          >
            {samePosition ? "On" : "Off"}
          </button>
        </label>
        {samePosition ? (
          <label className="sc-field">
            Position
            <select
              value={fillPosition}
              aria-label="Fill position"
              onChange={(event) => setFillPosition(event.target.value)}
            >
              {POSITION_FILTERS.filter((option) => option.id !== ALL_PLAYER_FILTER).map(
                (option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </label>
        ) : null}
        <ComposerLookToggle look={look} onChange={setLook} />
        <BaMarkToggle on={showBa} onChange={setShowBa} />
        <div className="sc-toolbar__actions">
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              const previous = pop();
              if (previous) {
                setSlots(previous);
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
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => void handleExport(true)}
            disabled={exporting}
          >
            Export 9:16
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
            look={look}
            showBa={showBa}
            activeIndex={exporting ? null : activeIndex}
            exporting={exporting}
            onBrandChange={setBrand}
            onTitleChange={setTitle}
            onSelectSlot={setActiveIndex}
            onClearSlot={(index) => {
              push(slots);
              setSlots((current) => clearEveryTeamSlot(current, index));
            }}
          />
          <p className="sc-hint">
            Each square is a fixed NBA team. Click it to pick a player from that
            roster. Filter the picker by position, or turn on same position to
            fill one spot on every team. Downloads a 4:5 Instagram PNG — nothing
            is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {activeIndex != null && activeTeam ? (
        <PlayerPicker
          key={activeTeam.id}
          heading={`Pick ${activeTeam.name} player`}
          hint={
            samePosition
              ? `Only ${fillPosition} on the ${activeTeam.name} roster. After you pick, the next empty team opens.`
              : `Only current ${activeTeam.name} roster players. Use Position to filter this list.`
          }
          currentId={currentId}
          usedLabels={usedEveryTeamLabels(slots, activeIndex)}
          lockedTeam={activeTeam.id}
          lockedFilters={lockedFilters}
          onPick={(playerId) => {
            const player = getPlayer(playerId);
            if (!player || player.team !== activeTeam.id) {
              return;
            }
            push(slots);
            const nextSlots = assignPlayer(slots, activeIndex, playerId);
            setSlots(nextSlots);
            if (samePosition) {
              const nextIndex = nextEmptyEveryTeamSlot(nextSlots, activeIndex);
              setActiveIndex(nextIndex);
              setStatus(
                nextIndex == null
                  ? `Picked ${player.name}. Board filled.`
                  : `Picked ${player.name}. Next: ${teamAtSlot(nextIndex)?.name}.`,
              );
            } else {
              setActiveIndex(null);
            }
          }}
          onClear={() => {
            push(slots);
            setSlots((current) => clearEveryTeamSlot(current, activeIndex));
            setActiveIndex(null);
          }}
          onClose={closePicker}
        />
      ) : null}
    </div>
  );
}
