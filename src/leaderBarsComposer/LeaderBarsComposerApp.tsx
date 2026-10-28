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
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { hydrateJsonStorage, readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { fetchRangeProduction } from "../playerOfTheDayComposer/nightStandouts";
import {
  GRAPHIC_HEIGHT,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  EVERY_TEAM_STAT_METRICS,
  everyTeamCurrentSeason,
  everyTeamSeasons,
  loadEveryTeamRosters,
  parseEveryTeamSeason,
  parseEveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import {
  fillToLeaderRows,
  leaderRowName,
  leaderTitleFor,
  listNightLeaders,
  listSeasonLeaders,
  parseLeaderRowCount,
  patchLeaderRow,
  resizeLeaderRows,
  type LeaderRow,
} from "../leaderboardComposer/leaderboardFill";
import { LeaderBarsGraphic } from "./LeaderBarsGraphic";
import { exportLeaderBarsPng } from "./exportLeaderBarsPng";
import { renderLeaderBarsCanvas } from "./renderLeaderBarsCanvas";
import {
  applyLeaderBarsHero,
  DEFAULT_LEADER_BARS_TITLE,
  defaultLeaderBarsDraft,
  hasCustomLeaderPhoto,
  isLeaderBarsDraft,
  LEADER_BARS_SAVES_KEY,
  LEADER_BARS_STORAGE_KEY,
  leaderBarsCaption,
  normalizeLeaderBarsDraft,
  setLeaderBarsPhoto,
  type LeaderBarsBarStyle,
  type LeaderBarsDraft,
  type LeaderBarsPhotoPos,
} from "./leaderBarsState";
import "@fontsource/montserrat/latin-900.css";
import "./leaderBarsComposer.css";

const LOOK_KEY = "ddgm:leader-bars-composer-look";

const loadDraft = (): LeaderBarsDraft => {
  const stored = readJson<Partial<LeaderBarsDraft>>(LEADER_BARS_STORAGE_KEY);
  if (isLeaderBarsDraft(stored)) {
    return normalizeLeaderBarsDraft(stored);
  }
  return defaultLeaderBarsDraft(everyTeamCurrentSeason());
};

export function LeaderBarsComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultLeaderBarsDraft(everyTeamCurrentSeason());
  const [draft, setDraft] = useState<LeaderBarsDraft>(empty);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] =
    usePhotoGrade();
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [storyCrop, setStoryCrop] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<LeaderBarsDraft>();
  const { range, setRange } = useComposerDateRange();

  useEffect(() => {
    document.title = "Leader bars";
    void hydrateJsonStorage().then(() => {
      setDraft(loadDraft());
      setHydrated(true);
    });
    void loadEveryTeamRosters().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(LEADER_BARS_STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const commitPick = (playerId: string, keepPhoto: boolean) => {
    const player = getPlayer(playerId);
    if (!player) {
      return;
    }
    rememberComposerPlayer(playerId);
    push(draft);
    setDraft((current) => applyLeaderBarsHero(current, player, keepPhoto));
    setKeepPrompt(null);
    setPickerOpen(false);
  };

  const fillBoard = () => {
    setFilling(true);
    const applyFills = (fills: ReturnType<typeof listSeasonLeaders>) => {
      setDraft((current) => {
        const rows = fillToLeaderRows(
          current.rows,
          fills,
          current.metric,
          current.windowKind,
        );
        const first = fills[0];
        const player = first ? getPlayer(first.playerId) : null;
        let next: LeaderBarsDraft = {
          ...current,
          rows,
          title:
            current.title === DEFAULT_LEADER_BARS_TITLE ||
            current.title === leaderTitleFor(current.metric, current.windowKind)
              ? leaderTitleFor(current.metric, current.windowKind)
              : current.title,
        };
        if (player) {
          next = applyLeaderBarsHero(next, player, hasCustomLeaderPhoto(next));
        }
        setStatus(
          fills.length
            ? `Filled ${fills.length} from the real ${current.windowKind === "season" ? "season" : "range"} table.`
            : "No rows in that table — nothing invented.",
        );
        return next;
      });
    };
    if (draft.windowKind === "season") {
      void loadEveryTeamRosters()
        .then(() => {
          applyFills(
            listSeasonLeaders(
              draft.season || everyTeamCurrentSeason(),
              draft.metric,
              statsSample,
              draft.rows.length,
            ),
          );
        })
        .finally(() => setFilling(false));
      return;
    }
    void fetchRangeProduction(range.from, range.to)
      .then((rows) => {
        applyFills(listNightLeaders(rows, draft.metric, draft.rows.length));
      })
      .finally(() => setFilling(false));
  };

  const renderInput = () => ({
    ...draft,
    look,
    purpleFlair,
    photoGrade,
  });

  const filenameFor = () =>
    exportFilenameFromTitle(
      draft.title,
      "leader-bars",
      draft.windowKind === "season" ? draft.season : draft.from,
      false,
      leaderRowName(draft.rows[0] ?? {
        firstName: "",
        lastName: "",
        playerId: null,
        teamId: null,
        value: "",
        rawValue: null,
        headshotUrl: null,
      }),
    );

  const handleExport = async (story = false, square = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportLeaderBarsPng(node, filenameFor(), renderInput(), story, square);
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
        setDraft((current) => setLeaderBarsPhoto(current, dataUrl));
        setStatus("Pasted photo.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Leader bars"
        identity={
          <label className="sc-field sc-field--wide">
            Title
            <input
              value={draft.title}
              maxLength={72}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
            />
          </label>
        }
        data={
          <>
            <ComposerHudSelect
              label="Window"
              ariaLabel="Fill window"
              value={draft.windowKind}
              options={[
                { value: "season", label: "Season" },
                { value: "range", label: "Range" },
              ]}
              onChange={(windowKind) =>
                setDraft((current) => ({ ...current, windowKind }))
              }
            />
            {draft.windowKind === "season" ? (
              <>
                <label className="sc-field">
                  Season
                  <select
                    value={draft.season}
                    aria-label="Season"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        season: parseEveryTeamSeason(event.target.value),
                      }))
                    }
                  >
                    {everyTeamSeasons().map((option) => (
                      <option key={option} value={option}>
                        {option}
                        {option === everyTeamCurrentSeason() ? " (current)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <ComposerStatsSampleToggle
                  sample={statsSample}
                  onChange={setStatsSample}
                />
                <button
                  type="button"
                  className="sc-chip"
                  disabled={filling}
                  onClick={fillBoard}
                >
                  {filling ? "Loading…" : "Fill"}
                </button>
              </>
            ) : (
              <ComposerDateRange
                from={range.from}
                to={range.to}
                simpleSet="week"
                fillLabel={filling ? "Loading…" : "Fill"}
                filling={filling}
                onFill={fillBoard}
                onChange={(next) => {
                  setRange(next);
                  setDraft((current) => ({
                    ...current,
                    from: next.from,
                    to: next.to,
                    windowKind: "range",
                  }));
                }}
              />
            )}
            <label className="sc-field">
              Stat
              <select
                value={draft.metric}
                aria-label="Leader stat"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    metric: parseEveryTeamStatMetric(event.target.value),
                  }))
                }
              >
                {EVERY_TEAM_STAT_METRICS.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="sc-chip"
              onClick={() => setPickerOpen(true)}
            >
              Pick photo
            </button>
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
              label="Rows"
              ariaLabel="Row count"
              value={String(parseLeaderRowCount(draft.rows.length)) as "5" | "8" | "10"}
              options={[
                { value: "5", label: "5" },
                { value: "8", label: "8" },
                { value: "10", label: "10" },
              ]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  rows: resizeLeaderRows(current.rows, Number(value)),
                }))
              }
            />
            <ComposerHudSelect
              label="Photo"
              ariaLabel="Photo position"
              value={draft.photoPos}
              options={[
                { value: "top", label: "Photo on top" },
                { value: "bottom", label: "Photo under bars" },
              ]}
              onChange={(photoPos: LeaderBarsPhotoPos) =>
                setDraft((current) => ({ ...current, photoPos }))
              }
            />
            <ComposerHudSelect
              label="Bars"
              ariaLabel="Bar style"
              value={draft.barStyle}
              options={[
                { value: "gold", label: "Gold #1" },
                { value: "team", label: "Team color" },
              ]}
              onChange={(barStyle: LeaderBarsBarStyle) =>
                setDraft((current) => ({ ...current, barStyle }))
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
              label="Board extras"
              items={[
                {
                  key: "faces",
                  label: "Bar headshots",
                  on: draft.showBarHeadshots,
                  onChange: (showBarHeadshots) =>
                    setDraft((current) => ({ ...current, showBarHeadshots })),
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
            storageKey={LEADER_BARS_SAVES_KEY}
            board={draft}
            onLoad={(next) => setDraft(normalizeLeaderBarsDraft(next))}
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
                    leaderBarsCaption(draft).slice(1),
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
                setDraft(keepComposerPhotos(defaultLeaderBarsDraft(draft.season), draft));
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
                setDraft(defaultLeaderBarsDraft(everyTeamCurrentSeason()));
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
                    const filename = filenameFor();
                    await downloadExportPack(
                      () => renderLeaderBarsCanvas(renderInput(), 2),
                      filename,
                      [
                        {
                          filename: storyFilename(filename),
                          render: () =>
                            renderLeaderBarsCanvas(
                              { ...renderInput(), story: true },
                              2,
                            ),
                        },
                      ],
                      { letterbox: false },
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
              <LeaderBarsGraphic
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
                onRowChange={(index, patch: Partial<LeaderRow>) =>
                  setDraft((current) => ({
                    ...current,
                    rows: patchLeaderRow(current.rows, index, patch),
                  }))
                }
                onPan={(pan) => setDraft((current) => ({ ...current, pan }))}
                onUpload={(dataUrl) =>
                  setDraft((current) => setLeaderBarsPhoto(current, dataUrl))
                }
                onPick={() => setPickerOpen(true)}
              />
            </ComposerBoard>
            <StoryCropGuide on={storyCrop} />
          </div>
        </div>
      </main>
      {pickerOpen ? (
        <PlayerPicker
          heading="Pick leader photo"
          hint="Fill writes real table leaders. Pick sets the hero photo."
          currentId={draft.playerId}
          usedLabels={draft.playerId ? { [draft.playerId]: "Photo" } : {}}
          onClose={closePicker}
          onClear={() => {
            push(draft);
            setDraft((current) => ({
              ...current,
              playerId: null,
              teamId: null,
              photoSrc: hasCustomLeaderPhoto(current) ? current.photoSrc : null,
              customPhoto: hasCustomLeaderPhoto(current),
            }));
            closePicker();
          }}
          onPick={(playerId) => {
            if (hasCustomLeaderPhoto(draft)) {
              const player = getPlayer(playerId);
              setKeepPrompt({
                playerId,
                playerName: player?.name ?? "this player",
              });
              setPickerOpen(false);
              return;
            }
            commitPick(playerId, false);
          }}
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
