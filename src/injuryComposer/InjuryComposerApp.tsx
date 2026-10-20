import { useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import {
  INJURY_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack } from "../instagramComposer/exportPack";
import {
  copyGraphicCaption,
  graphicCaption,
} from "../instagramComposer/graphicCaption";
import {
  INJURY_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import { readJson, writeJson } from "../lib/browserStorage";
import { nbaTodayIso } from "../playerOfTheDayComposer/lastGame";
import { InjuryGraphic } from "./InjuryGraphic";
import { exportInjuryPng } from "./exportInjuryPng";
import { renderInjuryCanvas } from "./renderInjuryCanvas";
import {
  defaultInjuryDraft,
  fetchNbaInjuries,
  groupInjuriesByTeam,
  injuryDateLine,
  isInjuryDraft,
  normalizeInjuryDraft,
  setInjuryPlayerStatus,
  type InjuryDraft,
} from "./injuryState";
import "@fontsource/montserrat/latin-900.css";
import "./injuryComposer.css";

const STORAGE_KEY = "ddgm:injury-composer";
const SAVES_KEY = "ddgm:injury-composer:saves";

const loadDraft = (): InjuryDraft => {
  const stored = readJson<Partial<InjuryDraft>>(STORAGE_KEY);
  if (isInjuryDraft(stored)) {
    return normalizeInjuryDraft(stored);
  }
  return defaultInjuryDraft();
};

export function InjuryComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<InjuryDraft>(defaultInjuryDraft);
  const [exporting, setExporting] = useState(false);
  const [filling, setFilling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(INJURY_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const { push, pop, canUndo } = useComposerUndo<InjuryDraft>();
  const [storyCrop, setStoryCrop] = useState(false);

  useEffect(() => {
    document.title = "Injury report graphic";
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const fillReport = async () => {
    setFilling(true);
    setStatus("Loading injury report…");
    try {
      const players = await fetchNbaInjuries();
      const teams = groupInjuriesByTeam(players);
      push(draft);
      setDraft((current) => ({
        ...current,
        teams,
        dateLine: current.dateLine || injuryDateLine(nbaTodayIso()),
      }));
      setStatus(
        teams.length
          ? `Loaded ${players.length} OUT / GTD names across ${teams.length} teams.`
          : "No injuries returned.",
      );
    } finally {
      setFilling(false);
    }
  };

  const handleExport = async (story = false, square = false) => {
    const node = boardRef.current;
    if (!node) {
      setStatus("Graphic is not ready to export.");
      return;
    }
    setExporting(true);
    try {
      await exportInjuryPng(
        node,
        exportFilenameFromTitle(draft.title, "injury-report"),
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

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Injury"
        identity={
          <>
            <label className="sc-field sc-field--wide">
              Title
              <input
                value={draft.title}
                maxLength={48}
                onChange={(event) =>
                  onComposerTextChange(event, (title) =>
                    setDraft((current) => ({ ...current, title })),
                  )
                }
              />
            </label>
            <TitlePresetSelect
              value={draft.title}
              presets={INJURY_TITLE_PRESETS}
              onChange={(title) => setDraft((current) => ({ ...current, title }))}
            />
          </>
        }
        data={
          <>
            <button
              type="button"
              className="sc-chip"
              onClick={() => void fillReport()}
              disabled={filling}
            >
              {filling ? "Loading…" : "Fill report"}
            </button>
          </>
        }
        board={
          <>
            <ComposerLookToggle look={look} onChange={setLook} />
            <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
            <BaMarkToggle
              on={draft.showBa === true}
              onChange={(showBa) =>
                setDraft((current) => ({ ...current, showBa }))
              }
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
              setDraft(normalizeInjuryDraft(next));
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
                setDraft(defaultInjuryDraft());
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
                    draft.teams.flatMap((block) =>
                      block.players.map(
                        (player) => `${block.teamId} ${player.status} ${player.name}`,
                      ),
                    ),
                    [draft.kicker, draft.dateLine],
                  ),
                )
              }
            >
              Copy caption
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
              className="sc-btn sc-btn--ghost sc-btn--aside"
              onClick={() => void handleExport(false, true)}
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
                    await downloadExportPack(
                      () =>
                        renderInjuryCanvas({ ...draft, look, purpleFlair }, 2),
                      exportFilenameFromTitle(draft.title, "injury-report"),
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
        <div className={storyCrop ? "sc-stage__frame is-story" : "sc-stage__frame"}>
          <ComposerBoard>
            <InjuryGraphic
              ref={boardRef}
              draft={draft}
              look={look}
              purpleFlair={purpleFlair}
              exporting={exporting}
              story={storyCrop}
              onBrandChange={(brand) =>
                setDraft((current) => ({ ...current, brand }))
              }
              onTitleChange={(title) =>
                setDraft((current) => ({ ...current, title }))
              }
              onKickerChange={(kicker) =>
                setDraft((current) => ({ ...current, kicker }))
              }
              onDateLineChange={(dateLine) =>
                setDraft((current) => ({ ...current, dateLine }))
              }
              onStatusCycle={(teamId, playerId, status) => {
                push(draft);
                setDraft((current) => ({
                  ...current,
                  teams: setInjuryPlayerStatus(
                    current.teams,
                    teamId,
                    playerId,
                    status,
                  ),
                }));
              }}
            />
          </ComposerBoard>
          <StoryCropGuide on={storyCrop} />
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
    </div>
  );
}
