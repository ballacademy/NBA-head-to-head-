import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import {
  STAT_CARD_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack } from "../instagramComposer/exportPack";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import { readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { fetchLastGame } from "../playerOfTheDayComposer/lastGame";
import {
  everyTeamCurrentSeason,
  everyTeamSeasons,
  loadEveryTeamRosters,
} from "../everyTeamComposer/historicalRosters";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { StatCardGraphic } from "./StatCardGraphic";
import { exportStatCardPng } from "./exportStatCardPng";
import { renderStatCardCanvas } from "./renderStatCardCanvas";
import {
  addStatCardLine,
  applyPlayerName,
  clipStatLabel,
  clearStatCardSubject,
  defaultStatCardDraft,
  fillStatCardFromGame,
  fillStatCardFromPlayer,
  fillStatCardFromSeason,
  hasCustomPhoto,
  isStatCardDraft,
  normalizeStatCardDraft,
  parseStatCardKey,
  parseStatCardSource,
  playerName,
  removeStatCardLine,
  setStatCardLineKey,
  setStatCardPhoto,
  nextStatCardLine,
  STAT_CARD_LINE_OPTIONS,
  STC_STAT_COUNT,
  STC_STAT_MAX,
  type StatCardDraft,
  type StatCardSource,
} from "./statCardState";
import "@fontsource/montserrat/latin-900.css";
import "./statCardComposer.css";

const STORAGE_KEY = "ddgm:stat-card-composer";
const SAVES_KEY = "ddgm:stat-card-composer:saves";

const loadDraft = (): StatCardDraft => {
  const stored = readJson<Partial<StatCardDraft>>(STORAGE_KEY);
  if (isStatCardDraft(stored)) {
    return normalizeStatCardDraft(stored);
  }
  return defaultStatCardDraft();
};

export function StatCardComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultStatCardDraft();
  const [draft, setDraft] = useState<StatCardDraft>(empty);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(STAT_CARD_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [rostersReady, setRostersReady] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<StatCardDraft>();

  useEffect(() => {
    document.title = "Stat card graphic";
    void loadEveryTeamRosters()
      .then(() => setRostersReady(true))
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(() => {
        setDraft(loadDraft());
        setHydrated(true);
      });
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const fillStats = async (
    next: StatCardDraft,
    sample = statsSample,
  ) => {
    if (!next.playerId) {
      return;
    }
    const source = parseStatCardSource(next.source);
    try {
      if (source === "season") {
        await loadEveryTeamRosters();
        setDraft((current) =>
          current.playerId === next.playerId
            ? fillStatCardFromSeason(current, next.season, sample)
            : current,
        );
        return;
      }
      const game = await fetchLastGame(next.playerId, sample);
      setDraft((current) =>
        current.playerId === next.playerId
          ? fillStatCardFromGame(current, game)
          : current,
      );
    } catch {
      /* still editable */
    }
  };

  const setSource = (source: StatCardSource) => {
    const next = { ...draft, source };
    setDraft(next);
    void fillStats(next);
  };

  const handleExport = async (filename?: string, story = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    setStatus("Rendering PNG…");
    setPickerOpen(false);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await exportStatCardPng(
        node,
        filename ??
          exportFilenameFromTitle(playerName(draft) || "stat-card", "stat-card"),
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

  const commitPick = (playerId: string, keepCustomPhoto: boolean) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    push(draft);
    const next = fillStatCardFromPlayer(player, draft, keepCustomPhoto);
    setDraft(next);
    setPickerOpen(false);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name}.`
        : `Filled ${player.name} — upload an action photo.`,
    );
    void fillStats(next);
  };

  const handlePick = (playerId: string) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    if (hasCustomPhoto(draft)) {
      setKeepPrompt({ playerId: player.id, playerName: player.name });
      setPickerOpen(false);
      return;
    }
    commitPick(player.id, false);
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        setDraft((current) => setStatCardPhoto(current, dataUrl));
        setStatus("Pasted photo into the frame.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const stem = playerName(draft) || "stat-card";
  const nextLine = nextStatCardLine(draft.stats);

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Stat card"
        identity={
          <label className="sc-field sc-field--wide">
            Name
            <input
              value={playerName(draft)}
              maxLength={32}
              onChange={(event) =>
                setDraft((current) =>
                  applyPlayerName(current, event.target.value),
                )
              }
            />
          </label>
        }
        data={
          <>
        <div className="sc-look" role="group" aria-label="Stat source">
          <span className="sc-look__label">Stats</span>
          <button
            type="button"
            className={
              parseStatCardSource(draft.source) === "last-game"
                ? "sc-chip is-on"
                : "sc-chip"
            }
            aria-pressed={parseStatCardSource(draft.source) === "last-game"}
            onClick={() => setSource("last-game")}
          >
            Last game
          </button>
          <button
            type="button"
            className={
              parseStatCardSource(draft.source) === "season"
                ? "sc-chip is-on"
                : "sc-chip"
            }
            aria-pressed={parseStatCardSource(draft.source) === "season"}
            onClick={() => setSource("season")}
          >
            Season avg
          </button>
        </div>
        <ComposerStatsSampleToggle
          sample={statsSample}
          onChange={(nextSample) => {
            setStatsSample(nextSample);
            void fillStats(draft, nextSample);
          }}
        />
        <label className="sc-field">
          Season
          <select
            value={draft.season || everyTeamCurrentSeason()}
            aria-label="Stat card season"
            disabled={
              !rostersReady || parseStatCardSource(draft.source) !== "season"
            }
            onChange={(event) => {
              const next = { ...draft, season: event.target.value };
              setDraft(next);
              void fillStats(next);
            }}
          >
            {everyTeamSeasons().map((option) => (
              <option key={option} value={option}>
                {option}
                {option === everyTeamCurrentSeason() ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
        {draft.stats.map((line, index) => (
          <label key={`${line.key}-hud`} className="sc-field">
            {line.label || "Stat"}
            <select
              value={line.key}
              aria-label={`Stat ${index + 1} metric`}
              onChange={(event) => {
                const key = parseStatCardKey(event.target.value);
                const next = {
                  ...draft,
                  stats: setStatCardLineKey(
                    draft.stats,
                    index,
                    key,
                    parseStatCardSource(draft.source),
                  ),
                };
                setDraft(next);
                void fillStats(next);
              }}
            >
              {STAT_CARD_LINE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button
          type="button"
          className="sc-chip"
          disabled={draft.stats.length >= STC_STAT_MAX}
          onClick={() => {
            const next = { ...draft, stats: addStatCardLine(draft.stats) };
            setDraft(next);
            void fillStats(next);
          }}
        >
          {nextLine ? `Add ${nextLine.label}` : "8 stats"}
        </button>
        {draft.stats.length > STC_STAT_COUNT ? (
          <button
            type="button"
            className="sc-chip"
            onClick={() => {
              const next = {
                ...draft,
                stats: removeStatCardLine(
                  draft.stats,
                  draft.stats.length - 1,
                ),
              };
              setDraft(next);
              void fillStats(next);
            }}
          >
            {draft.stats.length === STC_STAT_COUNT + 1
              ? "3 stats"
              : "Remove last"}
          </button>
        ) : null}
          </>
        }
        board={
          <>
            <ComposerLookToggle look={look} onChange={setLook} />
            <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
            <BaMarkToggle
              on={draft.showBa !== false}
              onChange={(showBa) =>
                setDraft((current) => ({ ...current, showBa }))
              }
            />
          </>
        }
        persist={
          <ComposerSaves
            storageKey={SAVES_KEY}
            board={draft}
            onLoad={(next) => {
              const loaded = normalizeStatCardDraft(next);
              setDraft(loaded);
              setStatus("Loaded named graphic.");
              void fillStats(loaded);
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
              setDraft(defaultStatCardDraft());
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
                graphicCaption(
                  playerName(draft) || "Stat card",
                  [],
                  draft.stats.map((line) => `${line.value} ${line.label}`),
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
                exportFilenameFromTitle(stem, "stat-card", "", true),
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
                      renderStatCardCanvas({ ...draft, look, purpleFlair }, 2),
                    exportFilenameFromTitle(stem, "stat-card"),
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
          <ComposerBoard>
            <StatCardGraphic
              ref={boardRef}
              draft={draft}
              look={look}
              purpleFlair={purpleFlair}
              exporting={exporting}
              onNameChange={(value) =>
                setDraft((current) => applyPlayerName(current, value))
              }
              onStatValue={(index, value) =>
                setDraft((current) => ({
                  ...current,
                  stats: current.stats.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, value } : row,
                  ),
                }))
              }
              onStatLabel={(index, value) =>
                setDraft((current) => ({
                  ...current,
                  stats: current.stats.map((row, rowIndex) =>
                    rowIndex === index
                      ? { ...row, label: clipStatLabel(value) }
                      : row,
                  ),
                }))
              }
              onPan={(pan) => setDraft((current) => ({ ...current, pan }))}
              onUpload={(dataUrl) => {
                setDraft((current) => setStatCardPhoto(current, dataUrl));
                setStatus("Photo cropped inside the frame — pinch or drag.");
              }}
              onPick={() => setPickerOpen(true)}
            />
          </ComposerBoard>
          <p className="sc-hint">
            Empty photo first — pick a player for the team-color name bar and
            3 huge stats on a light panel, then upload the action shot. Toggle
            last-game or season averages and add up to 8 stats. Downloads a 4:5
            Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {pickerOpen ? (
        <PlayerPicker
          heading="Pick a player"
          hint="Fills the name bar, team color, and stats. No mugshot — upload or paste the action photo."
          currentId={draft.playerId}
          usedLabels={draft.playerId ? { [draft.playerId]: "Stat card" } : {}}
          onPick={handlePick}
          onClear={() => {
            push(draft);
            setDraft((current) => clearStatCardSubject(current));
            setPickerOpen(false);
          }}
          onClose={closePicker}
        />
      ) : null}
      {keepPrompt ? (
        <KeepCustomPhotoDialog
          playerName={keepPrompt.playerName}
          onKeep={() => commitPick(keepPrompt.playerId, true)}
          onReplace={() => commitPick(keepPrompt.playerId, false)}
          onClose={() => setKeepPrompt(null)}
        />
      ) : null}
    </div>
  );
}
