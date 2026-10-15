import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerStatsSampleToggle } from "../instagramComposer/ComposerStatsSampleToggle";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { ComposerNightDate } from "../instagramComposer/ComposerNightDate";
import { ComposerPhotoHud } from "../instagramComposer/ComposerPhotoHud";
import {
  nightStandoutPickerRows,
  useComposerNight,
} from "../instagramComposer/composerNight";
import { useComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { copyGraphicCaption } from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  HEADLINE_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  HEADLINE_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import {
  fetchLastGame,
  fetchTeamLastNight,
} from "../playerOfTheDayComposer/lastGame";
import { NBA_TEAMS, getTeam } from "../standingsComposer/teams";
import { TeamPicker } from "../standingsComposer/TeamPicker";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { GRAPHIC_HEIGHT, STORY_DESIGN_HEIGHT } from "../standingsComposer/rankingState";
import { HeadlineGraphic } from "./HeadlineGraphic";
import { exportHeadlinePng } from "./exportHeadlinePng";
import { renderHeadlineCanvas } from "./renderHeadlineCanvas";
import {
  parseHeadlineKickerMode,
  parseHeadlineLockup,
  parseHeadlineNamePlacement,
  parseHeadlinePlateColor,
  parseHeadlineSubjectMode,
  parseHeadlineWatermark,
} from "./headlineLayout";
import {
  clearHeadlineSubject,
  clipHeadlineBody,
  defaultHeadlineDraft,
  fillHeadlineFromPlayer,
  fillHeadlineFromTeam,
  formatHeadlineBody,
  hasCustomPhoto,
  setHeadlineTeamId,
  HEADLINE_BODY_MAX,
  HEADLINE_MAX,
  headlineCaptionFor,
  headlinePlayerName,
  isHeadlineDraft,
  normalizeHeadlineDraft,
  setHeadlinePhoto,
  type HeadlineDraft,
} from "./headlineState";
import "@fontsource/montserrat/latin-900.css";
import "@fontsource/montserrat/latin-900-italic.css";
import "./headlineComposer.css";

const STORAGE_KEY = "ddgm:headline-composer";
const SAVES_KEY = "ddgm:headline-composer:saves";

const loadDraft = (): HeadlineDraft => {
  const stored = readJson<Partial<HeadlineDraft>>(STORAGE_KEY);
  if (isHeadlineDraft(stored)) {
    return normalizeHeadlineDraft(stored);
  }
  return defaultHeadlineDraft();
};

const renderInput = (
  draft: HeadlineDraft,
  look: ReturnType<typeof useComposerLook>[0],
  purpleFlair: boolean,
  photoGrade: boolean,
) => ({
  headline: draft.headline,
  body: draft.body,
  teamId: draft.teamId,
  firstName: draft.firstName,
  lastName: draft.lastName,
  photoSrc: draft.photoSrc,
  pan: draft.pan,
  watermark: parseHeadlineWatermark(draft.watermark),
  plateColor: parseHeadlinePlateColor(draft.plateColor),
  lockup: parseHeadlineLockup(draft.lockup),
  namePlacement: parseHeadlineNamePlacement(draft.namePlacement),
  showOpponentMark: draft.showOpponentMark === true,
  kickerMode: parseHeadlineKickerMode(draft.kickerMode),
  subjectMode: parseHeadlineSubjectMode(draft.subjectMode),
  opponentId: draft.opponentId ?? null,
  gameDate: draft.gameDate ?? null,
  look,
  purpleFlair,
  photoGrade,
  showBa: draft.showBa !== false,
});

export function HeadlineComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const empty = defaultHeadlineDraft();
  const [draft, setDraft] = useState<HeadlineDraft>(empty);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(HEADLINE_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade] = usePhotoGrade();
  const [statsSample, setStatsSample] = useComposerStatsSample();
  const [keepPrompt, setKeepPrompt] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);
  const [storyCrop, setStoryCrop] = useState(false);
  const { push, pop, canUndo } = useComposerUndo<HeadlineDraft>();
  const night = useComposerNight();
  const subject = parseHeadlineSubjectMode(draft.subjectMode);

  useEffect(() => {
    document.title = "Headline graphic";
  }, []);

  useEffect(() => {
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(STORAGE_KEY, draft);
  }, [draft, hydrated]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const fillAutoBody = async (next: HeadlineDraft, onDate = night.date) => {
    const team = getTeam(next.teamId);
    if (!team) {
      return;
    }
    try {
      const [playerGame, night] = await Promise.all([
        next.playerId
          ? fetchLastGame(next.playerId, statsSample, onDate)
          : Promise.resolve(null),
        fetchTeamLastNight(team.id, statsSample),
      ]);
      const game = playerGame ?? night.game;
      const body = formatHeadlineBody(team, game, night.record);
      setDraft((current) =>
        current.playerId === next.playerId && current.teamId === next.teamId
          ? {
              ...current,
              body: body ? clipHeadlineBody(body) : current.body,
              opponentId: game?.opponentId || current.opponentId || null,
              gameDate: game?.gameDate || current.gameDate || null,
            }
          : current,
      );
    } catch {
      /* still editable */
    }
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
      await exportHeadlinePng(
        node,
        filename ?? exportFilenameFromTitle(draft.headline, "headline"),
        renderInput(draft, look, purpleFlair, photoGrade),
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
    let next = fillHeadlineFromPlayer(player, draft, keepCustomPhoto);
    const standout = night.standouts.find((row) => row.athleteId === playerId);
    if (standout) {
      const team = getTeam(next.teamId);
      const body = formatHeadlineBody(team, standout.game, null);
      if (body) {
        next = {
          ...next,
          body: clipHeadlineBody(body),
          opponentId: standout.game.opponentId,
          gameDate: standout.game.gameDate,
        };
      }
    }
    setDraft(next);
    setPickerOpen(false);
    setKeepPrompt(null);
    setStatus(
      keepCustomPhoto
        ? `Kept the photo for ${player.name}.`
        : `Filled ${player.name} — upload or paste a photo. Last-night line is editable.`,
    );
    void fillAutoBody(next);
  };

  useEffect(() => {
    if (!pickerOpen || subject === "team") {
      return;
    }
    void night.ensureStandouts(night.date);
  }, [pickerOpen, subject, night.date, night.ensureStandouts]);

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

  const handleTeamPick = (teamId: string) => {
    push(draft);
    const next = fillHeadlineFromTeam(teamId, draft);
    setDraft(next);
    setPickerOpen(false);
    setStatus(`Team lockup set to ${getTeam(teamId)?.name ?? teamId}.`);
    void fillAutoBody(next);
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        setDraft((current) => setHeadlinePhoto(current, dataUrl));
        setStatus("Pasted photo into the frame.");
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Headline"
        identity={
          <>
        <label className="sc-field sc-field--wide">
          Headline
          <input
            value={draft.headline}
            maxLength={HEADLINE_MAX}
            onChange={(event) =>
              onComposerTextChange(
                event,
                (headline) => setDraft((current) => ({ ...current, headline })),
                HEADLINE_MAX,
              )
            }
          />
        </label>
        <TitlePresetSelect
          value={draft.headline}
          presets={HEADLINE_TITLE_PRESETS}
          onChange={(headline) => setDraft((current) => ({ ...current, headline }))}
        />
        <label className="sc-field sc-field--wide">
          Body
          <input
            value={draft.body}
            maxLength={HEADLINE_BODY_MAX}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                body: clipHeadlineBody(event.target.value),
              }))
            }
          />
        </label>
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
              void fillAutoBody(draft, iso);
            }}
          />
          <button
            type="button"
            className="sc-chip"
            onClick={() => void fillAutoBody(draft)}
            disabled={!draft.teamId}
          >
            Fill last night
          </button>
          <ComposerPhotoHud
            pickLabel={subject === "team" ? "Pick team" : "Pick player"}
            onPick={() => setPickerOpen(true)}
            onUpload={(dataUrl) => {
              setDraft((current) => setHeadlinePhoto(current, dataUrl));
              setStatus("Photo cropped inside the frame — pinch, scroll, or +/− to scale, drag to pan.");
            }}
          />
          </>
        }
        filters={
          <>
        <label className="sc-field">
          Subject
          <select
            value={subject}
            aria-label="Headline subject"
            onChange={(event) => {
              const nextMode = parseHeadlineSubjectMode(event.target.value);
              setDraft((current) =>
                nextMode === "team" && current.teamId
                  ? fillHeadlineFromTeam(current.teamId, { ...current, subjectMode: nextMode })
                  : { ...current, subjectMode: nextMode },
              );
            }}
          >
            <option value="player">Player</option>
            <option value="team">Team only</option>
          </select>
        </label>
        <label className="sc-field">
          Team
          <select
            value={draft.teamId ?? ""}
            aria-label="Team"
            onChange={(event) => {
              const teamId = event.target.value || null;
              const next = setHeadlineTeamId(draft, teamId);
              setDraft(next);
              void fillAutoBody(next);
            }}
          >
            <option value="">None</option>
            {NBA_TEAMS.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
          </>
        }
        board={
          <>
        <label className="sc-field">
          Plate
          <select
            value={parseHeadlinePlateColor(draft.plateColor)}
            aria-label="Headline plate color"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                plateColor: parseHeadlinePlateColor(event.target.value),
              }))
            }
          >
            <option value="white">White</option>
            <option value="team">Team color</option>
            <option value="black">Black</option>
          </select>
        </label>
        <label className="sc-field">
          Lockup
          <select
            value={parseHeadlineLockup(draft.lockup)}
            aria-label="Headline lockup"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                lockup: parseHeadlineLockup(event.target.value),
              }))
            }
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
          </select>
        </label>
        <label className="sc-field">
          Player name
          <select
            value={parseHeadlineNamePlacement(draft.namePlacement)}
            aria-label="Player name on plate"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                namePlacement: parseHeadlineNamePlacement(event.target.value),
              }))
            }
          >
            <option value="off">Off</option>
            <option value="plate">On plate</option>
            <option value="under">Under plate</option>
          </select>
        </label>
        <label className="sc-field">
          <span className="sc-toolbar__eyebrow">Opponent mark</span>
          <button
            type="button"
            className={draft.showOpponentMark ? "sc-chip is-on" : "sc-chip"}
            aria-pressed={draft.showOpponentMark === true}
            aria-label="Opponent mark"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                showOpponentMark: !current.showOpponentMark,
              }))
            }
          >
            {draft.showOpponentMark ? "On" : "Off"}
          </button>
        </label>
        <label className="sc-field">
          Date kicker
          <select
            value={parseHeadlineKickerMode(draft.kickerMode)}
            aria-label="Date kicker"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                kickerMode: parseHeadlineKickerMode(event.target.value),
              }))
            }
          >
            <option value="off">Off</option>
            <option value="date">Date</option>
            <option value="last-night">Last night</option>
          </select>
        </label>
        <label className="sc-field">
          Watermark
          <select
            value={parseHeadlineWatermark(draft.watermark)}
            aria-label="Team watermark"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                watermark: parseHeadlineWatermark(event.target.value),
              }))
            }
          >
            <option value="faint">Faint</option>
            <option value="medium">Medium</option>
            <option value="off">Off</option>
          </select>
        </label>
        <ComposerLookToggle look={look} onChange={setLook} />
        <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
        <PhotoGradeToggle on={photoGrade} onChange={setPhotoGrade} />
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
            setDraft(normalizeHeadlineDraft(next));
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
                setDraft(normalizeHeadlineDraft(previous));
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
              setDraft(defaultHeadlineDraft());
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
                headlineCaptionFor(
                  draft.headline,
                  draft.body,
                  headlinePlayerName(draft),
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
                exportFilenameFromTitle(draft.headline, "headline", "", true),
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
                  const feed = exportFilenameFromTitle(draft.headline, "headline");
                  await downloadExportPack(
                    () =>
                      renderHeadlineCanvas(
                        renderInput(draft, look, purpleFlair, photoGrade),
                        2,
                      ),
                    feed,
                    [
                      {
                        filename: storyFilename(feed),
                        render: () =>
                          renderHeadlineCanvas(
                            {
                              ...renderInput(draft, look, purpleFlair, photoGrade),
                              story: true,
                            },
                            2,
                          ),
                      },
                    ],
                    { letterbox: false },
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
        <div className={storyCrop ? "sc-stage__frame is-story" : "sc-stage__frame"}>
          <ComposerBoard
            height={storyCrop ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT}
          >
          <HeadlineGraphic
            ref={boardRef}
            headline={draft.headline}
            body={draft.body}
            teamId={draft.teamId}
            firstName={draft.firstName}
            lastName={draft.lastName}
            photoSrc={draft.photoSrc}
            customPhoto={draft.customPhoto}
            pan={draft.pan}
            watermark={parseHeadlineWatermark(draft.watermark)}
            plateColor={parseHeadlinePlateColor(draft.plateColor)}
            lockup={parseHeadlineLockup(draft.lockup)}
            namePlacement={parseHeadlineNamePlacement(draft.namePlacement)}
            showOpponentMark={draft.showOpponentMark === true}
            kickerMode={parseHeadlineKickerMode(draft.kickerMode)}
            subjectMode={subject}
            opponentId={draft.opponentId ?? null}
            gameDate={draft.gameDate ?? null}
            look={look}
            purpleFlair={purpleFlair}
            photoGrade={photoGrade}
            showBa={draft.showBa !== false}
            exporting={exporting}
            story={storyCrop}
            onHeadlineChange={(headline) =>
              setDraft((current) => ({ ...current, headline }))
            }
            onBodyChange={(body) => setDraft((current) => ({ ...current, body }))}
            onPan={(pan) => setDraft((current) => ({ ...current, pan }))}
            onUpload={(dataUrl) => {
              setDraft((current) => setHeadlinePhoto(current, dataUrl));
              setStatus(
                "Photo cropped inside the frame — pinch, scroll, or +/− to scale, drag to pan.",
              );
            }}
            onPick={() => setPickerOpen(true)}
          />
          </ComposerBoard>
          <p className="sc-hint">
            Empty photo first — upload or paste an action shot. City, plate,
            nickname, and last-night lines stack in the lower third with no
            overlap. 9:16 is a real story board, not a letterboxed 4:5.
            Downloads a 4:5 Instagram PNG — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>

      {pickerOpen && subject === "team" ? (
        <TeamPicker
          heading="Pick a team"
          hint="Sets the wordmark through the plate. Skip the player — upload or paste the photo."
          currentId={draft.teamId}
          usedLabels={draft.teamId ? { [draft.teamId]: "Headline" } : {}}
          onPick={handleTeamPick}
          onClear={() => {
            push(draft);
            setDraft((current) => ({
              ...clearHeadlineSubject(current),
              teamId: null,
              subjectMode: "team",
            }));
            setPickerOpen(false);
          }}
          onClose={closePicker}
        />
      ) : null}
      {pickerOpen && subject !== "team" ? (
        <PlayerPicker
          heading="Pick a player"
            hint="Sets the team wordmark through the plate and last-night lines. No mugshot — upload or paste the photo."
          currentId={draft.playerId}
          usedLabels={
            draft.playerId ? { [draft.playerId]: "Headline" } : {}
          }
          suggested={nightStandoutPickerRows(night.standouts)}
          suggestedHeading={night.heading}
          suggestedLoading={night.loading}
          onPick={handlePick}
          onClear={() => {
            push(draft);
            setDraft((current) => clearHeadlineSubject(current));
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
