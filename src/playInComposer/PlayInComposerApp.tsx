import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import {
  PLAY_IN_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack } from "../instagramComposer/exportPack";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  PLAY_IN_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { fetchConferenceStandingsBundle } from "../standingsComposer/nbaStandings";
import { TeamPicker } from "../standingsComposer/TeamPicker";
import { getTeam } from "../standingsComposer/teams";
import { PlayInGraphic } from "./PlayInGraphic";
import { exportPlayInPng } from "./exportPlayInPng";
import { renderPlayInCanvas } from "./renderPlayInCanvas";
import {
  defaultPlayInDraft,
  emptyPlayInScores,
  isPlayInDraft,
  normalizePlayInDraft,
  patchPlayInScore,
  PLAY_IN_SIZES,
  playInSeeds,
  playInSlotsFromStandings,
  type PlayInDraft,
  type PlayInSize,
} from "./playInState";
import "@fontsource/montserrat/latin-900.css";
import "./playInComposer.css";

const STORAGE_KEY = "ddgm:play-in-composer";
const SAVES_KEY = "ddgm:play-in-composer:saves";

const loadDraft = (): PlayInDraft => {
  const stored = readJson<Partial<PlayInDraft>>(STORAGE_KEY);
  if (isPlayInDraft(stored)) {
    return normalizePlayInDraft(stored);
  }
  return defaultPlayInDraft();
};

export function PlayInComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<PlayInDraft>(defaultPlayInDraft);
  const [picker, setPicker] = useState<{
    conference: "east" | "west";
    index: number;
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(PLAY_IN_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const { push, pop, canUndo } = useComposerUndo<PlayInDraft>();

  useEffect(() => {
    document.title = "Play-in graphic";
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const setSize = (size: PlayInSize) => {
    if (size === draft.size) {
      return;
    }
    push(draft);
    setDraft((current) =>
      normalizePlayInDraft({
        ...current,
        size,
      }),
    );
  };

  const autoFill = async () => {
    setStatus("Loading standings…");
    try {
      const [east, west] = await Promise.all([
        fetchConferenceStandingsBundle("East"),
        fetchConferenceStandingsBundle("West"),
      ]);
      push(draft);
      setDraft((current) => ({
        ...current,
        east: playInSlotsFromStandings(current.size, east.slots),
        west: playInSlotsFromStandings(current.size, west.slots),
        records: { ...east.records, ...west.records },
      }));
      setStatus("Filled 7–10 from current standings.");
    } catch (error) {
      console.error(error);
      setStatus("Could not load standings.");
    }
  };

  const handleExport = async (filename?: string, story = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportPlayInPng(
        node,
        filename ?? exportFilenameFromTitle(draft.title, "play-in"),
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

  const closePicker = useCallback(() => setPicker(null), []);
  const used: Record<string, string> = {};
  const seeds = playInSeeds(draft.size);
  draft.east.forEach((id, index) => {
    if (id) {
      used[id] = `East ${seeds[index]}`;
    }
  });
  draft.west.forEach((id, index) => {
    if (id) {
      used[id] = `West ${seeds[index]}`;
    }
  });

  return (
    <div className="sc-composer">
      <header className="sc-toolbar">
        <div className="sc-toolbar__brand">
          <p className="sc-toolbar__eyebrow">Compose only</p>
          <h1 className="sc-toolbar__title">Play-in</h1>
        </div>
        <label className="sc-field sc-field--wide">
          Title
          <input
            value={draft.title}
            maxLength={32}
            onChange={(event) =>
              onComposerTextChange(
                event,
                (title) => setDraft((current) => ({ ...current, title })),
                32,
              )
            }
          />
        </label>
        <TitlePresetSelect
          value={draft.title}
          presets={PLAY_IN_TITLE_PRESETS}
          onChange={(title) => setDraft((current) => ({ ...current, title }))}
        />
        <div className="sc-look" role="group" aria-label="Field size">
          <span className="sc-look__label">Teams</span>
          {PLAY_IN_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={draft.size === size ? "sc-chip is-on" : "sc-chip"}
              aria-pressed={draft.size === size}
              onClick={() => setSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="sc-chip"
          onClick={() => void autoFill()}
        >
          Auto-fill 7–10
        </button>
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">W–L</span>
          <button
            type="button"
            className={draft.showWl ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={Boolean(draft.showWl)}
            onClick={() =>
              setDraft((current) => ({ ...current, showWl: !current.showWl }))
            }
          >
            {draft.showWl ? "On" : "Off"}
          </button>
        </label>
        {(
          [
            ["East 7v8", "east", "sevenEight"],
            ["East 9v10", "east", "nineTen"],
            ["West 7v8", "west", "sevenEight"],
            ["West 9v10", "west", "nineTen"],
          ] as const
        ).map(([label, conference, game]) => {
          const scores =
            (conference === "east" ? draft.eastScores : draft.westScores) ??
            emptyPlayInScores();
          const pair = scores[game];
          return (
            <label key={label} className="sc-field">
              {label}
              <span className="sc-field__row">
                <input
                  value={pair[0]}
                  maxLength={3}
                  inputMode="numeric"
                  aria-label={`${label} first score`}
                  onChange={(event) =>
                    setDraft((current) => {
                      const currentScores =
                        (conference === "east"
                          ? current.eastScores
                          : current.westScores) ?? emptyPlayInScores();
                      const nextScores = patchPlayInScore(
                        currentScores,
                        game,
                        0,
                        event.target.value,
                      );
                      return conference === "east"
                        ? { ...current, eastScores: nextScores }
                        : { ...current, westScores: nextScores };
                    })
                  }
                />
                <input
                  value={pair[1]}
                  maxLength={3}
                  inputMode="numeric"
                  aria-label={`${label} second score`}
                  onChange={(event) =>
                    setDraft((current) => {
                      const currentScores =
                        (conference === "east"
                          ? current.eastScores
                          : current.westScores) ?? emptyPlayInScores();
                      const nextScores = patchPlayInScore(
                        currentScores,
                        game,
                        1,
                        event.target.value,
                      );
                      return conference === "east"
                        ? { ...current, eastScores: nextScores }
                        : { ...current, westScores: nextScores };
                    })
                  }
                />
              </span>
            </label>
          );
        })}
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle
          on={draft.showBa !== false}
          onChange={(showBa) => setDraft((current) => ({ ...current, showBa }))}
        />
        <ComposerSaves
          storageKey={SAVES_KEY}
          board={draft}
          onLoad={(next) => {
            setDraft(normalizePlayInDraft(next));
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
                setDraft(previous);
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
              setDraft(defaultPlayInDraft());
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void copyGraphicCaption(
                graphicCaption(
                  draft.title,
                  [...draft.east, ...draft.west]
                    .map((id) => getTeam(id)?.name ?? "")
                    .filter(Boolean),
                ),
              )
            }
          >
            Copy caption
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() =>
              void handleExport(
                exportFilenameFromTitle(draft.title, "play-in", "", true),
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
                try {
                  await downloadExportPack(
                    () =>
                      renderPlayInCanvas({ ...draft, look, purpleFlair }, 2),
                    exportFilenameFromTitle(draft.title, "play-in"),
                  );
                  setStatus("Pack download started (4:5 + 9:16).");
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
            <PlayInGraphic
              ref={boardRef}
              draft={draft}
              look={look}
              purpleFlair={purpleFlair}
              onTitleChange={(title) =>
                setDraft((current) => ({ ...current, title }))
              }
              onPick={(conference, index) => setPicker({ conference, index })}
            />
          </ComposerBoard>
          <p className="sc-hint">
            Auto-fill seeds 7–10 from standings. Optional W–L, scores on 7v8
            and 9v10, and the 9v10 winner drops onto the 8-seed plate. One
            label per matchup. Downloads a 4:5 Instagram PNG — nothing is
            posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
      {picker ? (
        <TeamPicker
          heading={`${picker.conference === "east" ? "East" : "West"} seed ${playInSeeds(draft.size)[picker.index]}`}
          currentId={
            (picker.conference === "east" ? draft.east : draft.west)[
              picker.index
            ]
          }
          usedLabels={used}
          onPick={(teamId) => {
            push(draft);
            setDraft((current) => {
              const side = [...(picker.conference === "east"
                ? current.east
                : current.west)];
              side[picker.index] = teamId;
              return picker.conference === "east"
                ? { ...current, east: side }
                : { ...current, west: side };
            });
            setPicker(null);
          }}
          onClear={() => {
            push(draft);
            setDraft((current) => {
              const side = [...(picker.conference === "east"
                ? current.east
                : current.west)];
              side[picker.index] = null;
              return picker.conference === "east"
                ? { ...current, east: side }
                : { ...current, west: side };
            });
            setPicker(null);
          }}
          onClose={closePicker}
        />
      ) : null}
    </div>
  );
}
