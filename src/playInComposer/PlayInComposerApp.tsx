import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import {
  PLAY_IN_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  PLAY_IN_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { nbaTodayIso, shiftIsoDate } from "../playerOfTheDayComposer/lastGame";
import { fetchConferenceStandingsBundle } from "../standingsComposer/nbaStandings";
import { applyLivePlayInScores, fetchPlayInLiveGames } from "./playInLive";
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
  playInBoardEmpty,
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
  const [liveOn, setLiveOn] = useState(true);
  const [storyCrop, setStoryCrop] = useState(false);

  const pollLive = useCallback(async () => {
    const today = nbaTodayIso();
    const games = [
      ...(await fetchPlayInLiveGames(today)),
      ...(await fetchPlayInLiveGames(shiftIsoDate(today, -1))),
    ];
    if (!games.length) {
      return;
    }
    setDraft((current) => applyLivePlayInScores(current, games));
    const live = games.some((game) => game.inProgress);
    setStatus(
      live
        ? "Live scores updating — 9v10 winner drops onto the 8-seed plate."
        : "Play-in scores loaded. 9v10 winner auto-advances to the 8-seed plate.",
    );
  }, []);

  useEffect(() => {
    if (!liveOn) {
      return;
    }
    void pollLive();
    const id = window.setInterval(() => {
      void pollLive();
    }, 30000);
    return () => window.clearInterval(id);
  }, [liveOn, pollLive]);

  useEffect(() => {
    document.title = "Play-in graphic";
    const next = loadDraft();
    setDraft(next);
    setHydrated(true);
    if (playInBoardEmpty(next)) {
      void autoFill();
    }
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
      const today = nbaTodayIso();
      const games = [
        ...(await fetchPlayInLiveGames(today)),
        ...(await fetchPlayInLiveGames(shiftIsoDate(today, -1))),
      ];
      setDraft((current) => {
        const filled = {
          ...current,
          east: playInSlotsFromStandings(current.size, east.slots),
          west: playInSlotsFromStandings(current.size, west.slots),
          records: { ...east.records, ...west.records },
        };
        return games.length
          ? applyLivePlayInScores(filled, games)
          : filled;
      });
      setStatus(
        games.length
          ? "Filled 7–10 from current standings with live scores."
          : "Filled 7–10 from current standings.",
      );
    } catch (error) {
      console.error(error);
      setStatus("Could not load standings.");
    }
  };

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
    try {
      await exportPlayInPng(
        node,
        filename ?? exportFilenameFromTitle(draft.title, "play-in"),
        { ...draft, look, purpleFlair },
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
      <ComposerToolbar
        title="Play-in"
        identity={
          <>
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
          </>
        }
        data={
          <>
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
        <button
          type="button"
          className={liveOn ? "sc-chip is-on" : "sc-chip"}
          aria-pressed={liveOn}
          onClick={() => {
            setLiveOn((on) => !on);
            if (!liveOn) {
              void pollLive();
            }
          }}
        >
          Live scores
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
          </>
        }
        board={
          <>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <BaMarkToggle
          on={draft.showBa !== false}
          onChange={(showBa) => setDraft((current) => ({ ...current, showBa }))}
        />
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
          board={draft}
          onLoad={(next) => {
            setDraft(normalizePlayInDraft(next));
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
              const blank = defaultPlayInDraft();
              setDraft({
                ...blank,
                east: draft.east,
                west: draft.west,
                size: draft.size,
                eastScores: draft.eastScores,
                westScores: draft.westScores,
                records: draft.records,
              });
              setStatus("Reset — teams kept.");
            }}
          >
            Reset keep photos
          </button>
          <button
            type="button"
            className="sc-btn sc-btn--ghost"
            onClick={() => {
              push(draft);
              setDraft(defaultPlayInDraft());
              setStatus("Blank post.");
            }}
          >
            Blank post
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
                try {
                  const feedName = exportFilenameFromTitle(draft.title, "play-in");
                  await downloadExportPack(
                    () =>
                      renderPlayInCanvas({ ...draft, look, purpleFlair }, 2),
                    feedName,
                    [
                      {
                        filename: storyFilename(feedName),
                        render: () =>
                          renderPlayInCanvas(
                            { ...draft, look, purpleFlair, story: true },
                            2,
                          ),
                      },
                    ],
                    { letterbox: false },
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
          </>
        }
      />
      <main className="sc-stage">
        <div className="sc-stage__frame">
          <ComposerBoard>
            <PlayInGraphic
              ref={boardRef}
              draft={draft}
              look={look}
              purpleFlair={purpleFlair}
              story={storyCrop}
              onTitleChange={(title) =>
                setDraft((current) => ({ ...current, title }))
              }
              onPick={(conference, index) => setPicker({ conference, index })}
            />
            <StoryCropGuide on={storyCrop} />
          </ComposerBoard>
          <p className="sc-hint">
            Auto-fill seeds 7–10 from standings. Live scores poll ESPN; the
            9v10 winner drops onto the 8-seed plate. Optional W–L and scores
            on 7v8 and 9v10. Downloads a 4:5 Instagram PNG — nothing is posted.
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
