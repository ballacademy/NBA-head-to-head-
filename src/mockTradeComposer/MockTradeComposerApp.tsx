import { useCallback, useEffect, useRef, useState } from "react";
import { BaMarkToggle } from "../instagramComposer/BaMarkToggle";
import { ComposerBoard } from "../instagramComposer/ComposerBoard";
import { ComposerLookToggle } from "../instagramComposer/ComposerLookToggle";
import { ComposerSaves } from "../instagramComposer/ComposerSaves";
import { ComposerToolbar } from "../instagramComposer/ComposerToolbar";
import { StoryCropGuide } from "../instagramComposer/StoryCropGuide";
import { PhotoGradeToggle } from "../instagramComposer/PhotoGradeToggle";
import { PurpleFlairToggle } from "../instagramComposer/PurpleFlairToggle";
import { usePhotoGrade } from "../instagramComposer/photoGrade";
import {
  MOCK_TRADE_LOOK_KEY,
  useComposerLook,
  usePurpleFlair,
} from "../instagramComposer/composerLook";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { copyGraphicCaption } from "../instagramComposer/graphicCaption";
import { KeepCustomPhotoDialog } from "../instagramComposer/KeepCustomPhotoDialog";
import { useComposerUndo } from "../instagramComposer/useComposerUndo";
import {
  MOCK_TRADE_TITLE_PRESETS,
  exportFilenameFromTitle,
} from "../instagramComposer/composerPresets";
import { TitlePresetSelect } from "../instagramComposer/TitlePresetSelect";
import { onComposerTextChange } from "../instagramComposer/titleLayout";
import { readJson, writeJson } from "../lib/browserStorage";
import { dataUrlFromClipboard } from "../playerOfTheDayComposer/PhotoFrame";
import { splitPlayerName } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import { PlayerPicker } from "../tierListComposer/PlayerPicker";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { NBA_TEAMS } from "../standingsComposer/teams";
import { MockTradeGraphic } from "./MockTradeGraphic";
import { exportMockTradePng } from "./exportMockTradePng";
import { renderMockTradeCanvas } from "./renderMockTradeCanvas";
import {
  addMockTradePick,
  addMockTradePlayer,
  addMockTradeTeam,
  clearMockTradePlayer,
  defaultMockTradeDraft,
  fillMockTradePlayer,
  hasCustomPhoto,
  isMockTradeDraft,
  MOCK_TRADE_PICK_MAX,
  MOCK_TRADE_PLAYER_MAX,
  MOCK_TRADE_TITLE_MAX,
  MOCK_TRADE_YEARS,
  mockTradeCaptionFor,
  mockTradePickLabel,
  mockTradeTeamCount,
  normalizeMockTradeDraft,
  parseMockTradeRound,
  parseMockTradeYear,
  patchMockTradeSide,
  removeMockTradePick,
  removeMockTradePlayer,
  removeMockTradeTeam,
  setMockTradePhoto,
  setMockTradeSideTeam,
  swapMockTradeSides,
  type MockTradeDraft,
} from "./mockTradeState";
import "@fontsource/montserrat/latin-900.css";
import "./mockTradeComposer.css";

const STORAGE_KEY = "ddgm:mock-trade-composer";
const SAVES_KEY = "ddgm:mock-trade-composer:saves";

const loadDraft = (): MockTradeDraft => {
  const stored = readJson<Partial<MockTradeDraft>>(STORAGE_KEY);
  if (isMockTradeDraft(stored)) {
    return normalizeMockTradeDraft(stored);
  }
  return defaultMockTradeDraft();
};

export function MockTradeComposerApp() {
  const boardRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<MockTradeDraft>(defaultMockTradeDraft);
  const [picker, setPicker] = useState<{ side: number; player: number } | null>(
    null,
  );
  const [focus, setFocus] = useState<{ side: number; player: number }>({
    side: 0,
    player: 0,
  });
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useComposerLook(MOCK_TRADE_LOOK_KEY);
  const [purpleFlair, setPurpleFlair] = usePurpleFlair();
  const [photoGrade, setPhotoGrade, gradeIntensity, setGradeIntensity] =
    usePhotoGrade();
  const [storyCrop, setStoryCrop] = useState(false);
  const [keepPrompt, setKeepPrompt] = useState<{
    side: number;
    player: number;
    playerId: string;
    playerName: string;
  } | null>(null);
  const { push, pop, canUndo } = useComposerUndo<MockTradeDraft>();

  useEffect(() => {
    document.title = "Mock trade graphic";
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      writeJson(STORAGE_KEY, draft);
    }
  }, [draft, hydrated]);

  const commitPick = (side: number, player: number, playerId: string, keep: boolean) => {
    const person = getPlayer(playerId);
    if (!person) {
      return;
    }
    const current = draft.sides[side]?.players[player];
    if (!current) {
      return;
    }
    push(draft);
    setDraft((board) =>
      patchMockTradeSide(board, side, {
        ...board.sides[side]!,
        players: board.sides[side]!.players.map((slot, index) =>
          index === player ? fillMockTradePlayer(person, slot, keep) : slot,
        ),
      }),
    );
    setPicker(null);
    setKeepPrompt(null);
    setStatus(
      keep
        ? `Kept the photo for ${person.name}.`
        : `Filled ${person.name} — paste or upload to replace.`,
    );
  };

  const handlePick = (playerId: string) => {
    if (!picker) {
      return;
    }
    const person = getPlayer(playerId);
    const current = draft.sides[picker.side]?.players[picker.player];
    if (!person || !current) {
      return;
    }
    if (hasCustomPhoto(current)) {
      setKeepPrompt({
        side: picker.side,
        player: picker.player,
        playerId: person.id,
        playerName: person.name,
      });
      setPicker(null);
      return;
    }
    commitPick(picker.side, picker.player, person.id, false);
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
      await exportMockTradePng(
        node,
        filename ?? exportFilenameFromTitle(draft.title, "mock-trade"),
        { ...draft, look, purpleFlair, photoGrade },
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

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void dataUrlFromClipboard(event).then((dataUrl) => {
        if (!dataUrl) {
          return;
        }
        event.preventDefault();
        const side = focus.side;
        const player = focus.player;
        setDraft((current) => {
          const column = current.sides[side];
          if (!column?.players[player]) {
            return current;
          }
          return patchMockTradeSide(current, side, {
            ...column,
            players: column.players.map((slot, index) =>
              index === player ? setMockTradePhoto(slot, dataUrl) : slot,
            ),
          });
        });
        setStatus(`Pasted photo into team ${side + 1} player ${player + 1}.`);
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [focus]);

  const closePicker = useCallback(() => setPicker(null), []);
  const used: Record<string, string> = {};
  draft.sides.forEach((side, sideIndex) => {
    side.players.forEach((player, playerIndex) => {
      if (player.playerId) {
        used[player.playerId] = `T${sideIndex + 1} P${playerIndex + 1}`;
      }
    });
  });
  const teamCount = mockTradeTeamCount(draft);

  const teamSelect = (index: number) => (
    <label key={`mt-team-${index}`} className="sc-field">
      {`Team ${index + 1}`}
      <select
        value={draft.sides[index]?.teamId ?? ""}
        aria-label={`Team ${index + 1}`}
        onChange={(event) => {
          const teamId = event.target.value || null;
          push(draft);
          setDraft((current) => setMockTradeSideTeam(current, index, teamId));
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
  );

  return (
    <div className="sc-composer">
      <ComposerToolbar
        title="Mock trade"
        identity={
          <>
            <label className="sc-field sc-field--wide">
              Title
              <input
                value={draft.title}
                maxLength={MOCK_TRADE_TITLE_MAX}
                onChange={(event) =>
                  onComposerTextChange(
                    event,
                    (title) => setDraft((current) => ({ ...current, title })),
                    MOCK_TRADE_TITLE_MAX,
                  )
                }
              />
            </label>
            <TitlePresetSelect
              value={draft.title}
              presets={MOCK_TRADE_TITLE_PRESETS}
              onChange={(title) => setDraft((current) => ({ ...current, title }))}
            />
          </>
        }
        data={
          <>
            {draft.sides.map((_, index) => teamSelect(index))}
            <button
              type="button"
              className="sc-chip"
              aria-label="Swap sides"
              onClick={() => setDraft((current) => swapMockTradeSides(current))}
            >
              Swap sides
            </button>
            {teamCount < 3 ? (
              <button
                type="button"
                className="sc-chip"
                onClick={() => {
                  push(draft);
                  setDraft((current) => addMockTradeTeam(current));
                }}
              >
                Add 3rd team
              </button>
            ) : (
              <button
                type="button"
                className="sc-chip"
                onClick={() => {
                  push(draft);
                  setDraft((current) => removeMockTradeTeam(current));
                }}
              >
                Remove 3rd team
              </button>
            )}
            {draft.sides.map((side, sideIndex) => (
              <div
                key={`mt-slots-${sideIndex}`}
                className="sc-look"
                role="group"
                aria-label={`Team ${sideIndex + 1} assets`}
              >
                <span className="sc-look__label">{`Team ${sideIndex + 1} gets`}</span>
                <button
                  type="button"
                  className="sc-chip"
                  disabled={side.players.length >= MOCK_TRADE_PLAYER_MAX}
                  onClick={() => {
                    push(draft);
                    setDraft((current) =>
                      patchMockTradeSide(
                        current,
                        sideIndex,
                        addMockTradePlayer(current.sides[sideIndex]!),
                      ),
                    );
                    setFocus({
                      side: sideIndex,
                      player: side.players.length,
                    });
                  }}
                >
                  Add player
                </button>
                <button
                  type="button"
                  className="sc-chip"
                  disabled={!side.players.length}
                  onClick={() => {
                    push(draft);
                    setDraft((current) =>
                      patchMockTradeSide(
                        current,
                        sideIndex,
                        removeMockTradePlayer(current.sides[sideIndex]!),
                      ),
                    );
                  }}
                >
                  Remove player
                </button>
                <button
                  type="button"
                  className="sc-chip"
                  disabled={side.picks.length >= MOCK_TRADE_PICK_MAX}
                  onClick={() => {
                    push(draft);
                    setDraft((current) =>
                      patchMockTradeSide(
                        current,
                        sideIndex,
                        addMockTradePick(current.sides[sideIndex]!),
                      ),
                    );
                  }}
                >
                  Add pick
                </button>
                <button
                  type="button"
                  className="sc-chip"
                  disabled={!side.picks.length}
                  onClick={() => {
                    push(draft);
                    setDraft((current) =>
                      patchMockTradeSide(
                        current,
                        sideIndex,
                        removeMockTradePick(current.sides[sideIndex]!),
                      ),
                    );
                  }}
                >
                  Remove pick
                </button>
                {side.picks.map((pick, pickIndex) => (
                  <label
                    key={`mt-pick-${sideIndex}-${pickIndex}`}
                    className="sc-field"
                  >
                    {`Pick ${pickIndex + 1}`}
                    <select
                      value={pick.year}
                      aria-label={`Team ${sideIndex + 1} pick ${pickIndex + 1} year`}
                      onChange={(event) => {
                        const year = parseMockTradeYear(event.target.value);
                        setDraft((current) =>
                          patchMockTradeSide(current, sideIndex, {
                            ...current.sides[sideIndex]!,
                            picks: current.sides[sideIndex]!.picks.map((row, index) =>
                              index === pickIndex ? { ...row, year } : row,
                            ),
                          }),
                        );
                      }}
                    >
                      {MOCK_TRADE_YEARS.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <select
                      value={pick.round}
                      aria-label={`Team ${sideIndex + 1} pick ${pickIndex + 1} round`}
                      onChange={(event) => {
                        const round = parseMockTradeRound(event.target.value);
                        setDraft((current) =>
                          patchMockTradeSide(current, sideIndex, {
                            ...current.sides[sideIndex]!,
                            picks: current.sides[sideIndex]!.picks.map((row, index) =>
                              index === pickIndex ? { ...row, round } : row,
                            ),
                          }),
                        );
                      }}
                    >
                      <option value="1st">1st</option>
                      <option value="2nd">2nd</option>
                    </select>
                    <select
                      value={pick.fromTeamId ?? ""}
                      aria-label={`Team ${sideIndex + 1} pick ${pickIndex + 1} from`}
                      onChange={(event) => {
                        const fromTeamId = event.target.value || null;
                        setDraft((current) =>
                          patchMockTradeSide(current, sideIndex, {
                            ...current.sides[sideIndex]!,
                            picks: current.sides[sideIndex]!.picks.map((row, index) =>
                              index === pickIndex ? { ...row, fromTeamId } : row,
                            ),
                          }),
                        );
                      }}
                    >
                      <option value="">From</option>
                      {NBA_TEAMS.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.id}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={pick.swap ? "sc-chip is-on" : "sc-chip"}
                      aria-pressed={pick.swap}
                      aria-label={`Team ${sideIndex + 1} pick ${pickIndex + 1} swap`}
                      onClick={() =>
                        setDraft((current) =>
                          patchMockTradeSide(current, sideIndex, {
                            ...current.sides[sideIndex]!,
                            picks: current.sides[sideIndex]!.picks.map((row, index) =>
                              index === pickIndex
                                ? { ...row, swap: !row.swap }
                                : row,
                            ),
                          }),
                        )
                      }
                    >
                      {pick.swap ? "Swap on" : "Swap"}
                    </button>
                    <button
                      type="button"
                      className={pick.top4 ? "sc-chip is-on" : "sc-chip"}
                      aria-pressed={pick.top4 === true}
                      aria-label={`Team ${sideIndex + 1} pick ${pickIndex + 1} top-4`}
                      onClick={() =>
                        setDraft((current) =>
                          patchMockTradeSide(current, sideIndex, {
                            ...current.sides[sideIndex]!,
                            picks: current.sides[sideIndex]!.picks.map((row, index) =>
                              index === pickIndex
                                ? { ...row, top4: !row.top4, cash: false, twoWay: false }
                                : row,
                            ),
                          }),
                        )
                      }
                    >
                      Top-4
                    </button>
                    <button
                      type="button"
                      className={pick.twoWay ? "sc-chip is-on" : "sc-chip"}
                      aria-pressed={pick.twoWay === true}
                      aria-label={`Team ${sideIndex + 1} pick ${pickIndex + 1} two-way`}
                      onClick={() =>
                        setDraft((current) =>
                          patchMockTradeSide(current, sideIndex, {
                            ...current.sides[sideIndex]!,
                            picks: current.sides[sideIndex]!.picks.map((row, index) =>
                              index === pickIndex
                                ? { ...row, twoWay: !row.twoWay, cash: false }
                                : row,
                            ),
                          }),
                        )
                      }
                    >
                      Two-way
                    </button>
                    <button
                      type="button"
                      className={pick.cash ? "sc-chip is-on" : "sc-chip"}
                      aria-pressed={pick.cash === true}
                      aria-label={`Team ${sideIndex + 1} pick ${pickIndex + 1} cash`}
                      onClick={() =>
                        setDraft((current) =>
                          patchMockTradeSide(current, sideIndex, {
                            ...current.sides[sideIndex]!,
                            picks: current.sides[sideIndex]!.picks.map((row, index) =>
                              index === pickIndex
                                ? { ...row, cash: !row.cash, twoWay: false, top4: false }
                                : row,
                            ),
                          }),
                        )
                      }
                    >
                      Cash
                    </button>
                    <span className="sc-toolbar__eyebrow">
                      {mockTradePickLabel(pick)}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </>
        }
        board={
          <>
            <ComposerLookToggle look={look} onChange={setLook} />
            <PurpleFlairToggle on={purpleFlair} onChange={setPurpleFlair} />
            <PhotoGradeToggle
              on={photoGrade}
              onChange={setPhotoGrade}
              intensity={gradeIntensity}
              onIntensityChange={setGradeIntensity}
            />
            <BaMarkToggle
              on={draft.showBa !== false}
              onChange={(showBa) => setDraft((current) => ({ ...current, showBa }))}
            />
            <label className="sc-field">
              <span className="sc-toolbar__eyebrow">Salaries</span>
              <button
                type="button"
                className={draft.showSalaries ? "sc-chip is-on" : "sc-chip"}
                aria-pressed={Boolean(draft.showSalaries)}
                aria-label="Show cap numbers"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    showSalaries: !current.showSalaries,
                  }))
                }
              >
                {draft.showSalaries ? "On" : "Off"}
              </button>
            </label>
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
              setDraft(normalizeMockTradeDraft(next));
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
                setDraft({
                  ...defaultMockTradeDraft(),
                  showBa: draft.showBa,
                  sides: draft.sides.map((side) => ({
                    ...side,
                    teamId: null,
                    players: side.players.map((player) =>
                      player.customPhoto && player.photoSrc
                        ? {
                            ...player,
                            playerId: null,
                            teamId: null,
                            firstName: "",
                            lastName: "",
                          }
                        : {
                            ...player,
                            playerId: null,
                            teamId: null,
                            firstName: "",
                            lastName: "",
                            photoSrc: null,
                            customPhoto: false,
                          },
                    ),
                  })),
                });
                setStatus("Reset — photos kept.");
              }}
            >
              Reset keep photos
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              onClick={() => {
                push(draft);
                setDraft(defaultMockTradeDraft());
                setStatus("Blank post.");
              }}
            >
              Blank post
            </button>
            <button
              type="button"
              className="sc-btn sc-btn--ghost"
              onClick={() =>
                void copyGraphicCaption(mockTradeCaptionFor(draft)).then(
                  () => setStatus("Caption copied."),
                  () => setStatus("Could not copy caption."),
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
                  exportFilenameFromTitle(draft.title, "mock-trade", "", true),
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
              aria-label="Export 1:1"
              onClick={() => void handleExport(undefined, false, true)}
              disabled={exporting}
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
                    const feed = exportFilenameFromTitle(draft.title, "mock-trade");
                    const input = { ...draft, look, purpleFlair, photoGrade };
                    await downloadExportPack(
                      () => renderMockTradeCanvas(input, 2),
                      feed,
                      [
                        {
                          filename: storyFilename(feed),
                          render: () =>
                            renderMockTradeCanvas({ ...input, story: true }, 2),
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
        <div className="sc-stage__frame">
          <ComposerBoard>
            <MockTradeGraphic
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
              onPlayerNameChange={(side, player, value) =>
                setDraft((current) => {
                  const names = splitPlayerName(value);
                  return patchMockTradeSide(current, side, {
                    ...current.sides[side]!,
                    players: current.sides[side]!.players.map((slot, index) =>
                      index === player
                        ? {
                            ...slot,
                            firstName: names.firstName,
                            lastName: names.lastName,
                          }
                        : slot,
                    ),
                  });
                })
              }
              onPickPlayer={(side, player) => {
                setFocus({ side, player });
                setPicker({ side, player });
              }}
              onPan={(side, player, pan) =>
                setDraft((current) =>
                  patchMockTradeSide(current, side, {
                    ...current.sides[side]!,
                    players: current.sides[side]!.players.map((slot, index) =>
                      index === player ? { ...slot, pan } : slot,
                    ),
                  }),
                )
              }
              onUpload={(side, player, dataUrl) => {
                setFocus({ side, player });
                setDraft((current) =>
                  patchMockTradeSide(current, side, {
                    ...current.sides[side]!,
                    players: current.sides[side]!.players.map((slot, index) =>
                      index === player ? setMockTradePhoto(slot, dataUrl) : slot,
                    ),
                  }),
                );
                setStatus("Photo cropped inside the frame.");
              }}
            />
            <StoryCropGuide on={storyCrop} />
          </ComposerBoard>
          <p className="sc-hint">
            Each column is what that team gets — players first, then pick chips.
            Default two teams; add a third when you need it. Empty photo-first.
            Downloads a 4:5 Instagram PNG at 2400×3000 — nothing is posted.
          </p>
          {status ? <p className="sc-status">{status}</p> : null}
        </div>
      </main>
      {picker ? (
        <PlayerPicker
          heading={`Pick a player for team ${picker.side + 1}`}
          hint="Sets the headshot and name. The column team stays the club that acquires them."
          currentId={draft.sides[picker.side]?.players[picker.player]?.playerId}
          usedLabels={used}
          onPick={handlePick}
          onClear={() => {
            const slot = draft.sides[picker.side]?.players[picker.player];
            if (!slot) {
              return;
            }
            push(draft);
            setDraft((current) =>
              patchMockTradeSide(current, picker.side, {
                ...current.sides[picker.side]!,
                players: current.sides[picker.side]!.players.map((row, index) =>
                  index === picker.player ? clearMockTradePlayer(row) : row,
                ),
              }),
            );
            setPicker(null);
          }}
          onClose={closePicker}
        />
      ) : null}
      {keepPrompt ? (
        <KeepCustomPhotoDialog
          playerName={keepPrompt.playerName}
          onKeep={() =>
            commitPick(keepPrompt.side, keepPrompt.player, keepPrompt.playerId, true)
          }
          onReplace={() =>
            commitPick(
              keepPrompt.side,
              keepPrompt.player,
              keepPrompt.playerId,
              false,
            )
          }
          onClose={() => setKeepPrompt(null)}
        />
      ) : null}
    </div>
  );
}
