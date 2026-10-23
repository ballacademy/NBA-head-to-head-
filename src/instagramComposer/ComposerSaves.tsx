import { useEffect, useRef, useState } from "react";
import { peekCachedAccountNeedsRelogin } from "../lib/accountGate";
import {
  pullAndMergeComposerLibrary,
  pushComposerLibraryIfLinked,
} from "../lib/composerLibraryRemote";
import { getOrCreatePlayerIdentity } from "../lib/playerIdentity";
import { stripComposerPhotos } from "./composerPhotos";
import {
  COMPOSER_LIBRARY_EVENT,
  deleteNamedGraphic,
  downloadComposerLibrary,
  importComposerLibrary,
  listNamedGraphics,
  parseComposerLibraryFile,
  upsertNamedGraphic,
  type NamedGraphic,
} from "./composerLibrary";

interface ComposerSavesProps<T> {
  storageKey: string;
  board: T;
  onLoad: (board: T) => void;
}

export function ComposerSaves<T>({
  storageKey,
  board,
  onLoad,
}: ComposerSavesProps<T>) {
  const [saves, setSaves] = useState<NamedGraphic<T>[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => setSaves(listNamedGraphics<T>(storageKey));
    refresh();
    void pullAndMergeComposerLibrary().then((merged) => {
      if (merged) {
        refresh();
        setStatus("Loaded named graphics from your account.");
      }
    });
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) {
        refresh();
      }
    };
    const onLibrary = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(COMPOSER_LIBRARY_EVENT, onLibrary);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(COMPOSER_LIBRARY_EVENT, onLibrary);
    };
  }, [storageKey]);

  return (
    <div className="sc-saves" role="group" aria-label="Named graphics">
      <label className="sc-field">
        Save as
        <input
          value={name}
          maxLength={40}
          placeholder="Name this graphic"
          aria-label="Graphic name"
          onChange={(event) => setName(event.target.value.slice(0, 40))}
        />
      </label>
      <button
        type="button"
        className="sc-btn sc-btn--ghost"
        onClick={() => {
          const { saves: next, saved } = upsertNamedGraphic(
            storageKey,
            name,
            board,
            selected || undefined,
          );
          setSaves(next);
          setSelected(saved.id);
          setName(saved.name);
          void pushComposerLibraryIfLinked({ force: true }).then((synced) => {
            if (synced) {
              setStatus("Saved to your account — restores on phone.");
              return;
            }
            const playerId = getOrCreatePlayerIdentity().playerId;
            setStatus(
              peekCachedAccountNeedsRelogin(playerId)
                ? "Sign in to restore named graphics on your phone."
                : "Saved on this device — Export all to move to phone.",
            );
          });
        }}
      >
        Save
      </button>
      <button
        type="button"
        className="sc-btn sc-btn--ghost"
        onClick={() => {
          const copyName = `${(name.trim() || "Graphic").slice(0, 32)} copy`;
          const { saves: next, saved } = upsertNamedGraphic(
            storageKey,
            copyName,
            board,
          );
          setSaves(next);
          setSelected(saved.id);
          setName(saved.name);
          setStatus("Duplicated — photos stay on that copy.");
        }}
      >
        Duplicate this post
      </button>
      <button
        type="button"
        className="sc-btn sc-btn--ghost"
        onClick={() => {
          const { saves: next, saved } = upsertNamedGraphic(
            storageKey,
            name || "Template",
            stripComposerPhotos(board),
            selected || undefined,
          );
          setSaves(next);
          setSelected(saved.id);
          setName(saved.name);
          setStatus("Saved as template (no photos).");
        }}
      >
        Save as template
      </button>
      <label className="sc-field">
        Load
        <select
          value={selected}
          aria-label="Saved graphics"
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">Saved graphics</option>
          {saves.map((save) => (
            <option key={save.id} value={save.id}>
              {save.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="sc-btn sc-btn--ghost"
        disabled={!selected}
        onClick={() => {
          const save = saves.find((item) => item.id === selected);
          if (save) {
            onLoad(save.board);
            setName(save.name);
            setStatus("Loaded named graphic.");
          }
        }}
      >
        Load
      </button>
      <button
        type="button"
        className="sc-btn sc-btn--ghost"
        disabled={!selected}
        onClick={() => {
          const next = deleteNamedGraphic<T>(storageKey, selected);
          setSaves(next);
          setSelected("");
          setStatus("Deleted.");
        }}
      >
        Delete
      </button>
      <button
        type="button"
        className="sc-btn sc-btn--ghost"
        onClick={() => {
          downloadComposerLibrary();
          setStatus("Downloaded all named graphics.");
        }}
      >
        Export all
      </button>
      <button
        type="button"
        className="sc-btn sc-btn--ghost"
        onClick={() => fileRef.current?.click()}
      >
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Import named graphics"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) {
            return;
          }
          void file.text().then((text) => {
            try {
              const parsed = JSON.parse(text) as unknown;
              if (!parseComposerLibraryFile(parsed)) {
                setStatus("That file is not a composer save library.");
                return;
              }
              const result = importComposerLibrary(parsed);
              setSaves(listNamedGraphics<T>(storageKey));
              setStatus(
                result.saves
                  ? `Imported ${result.saves} save${result.saves === 1 ? "" : "s"}.`
                  : "No matching saves in that file.",
              );
            } catch {
              setStatus("Could not read that save file.");
            }
          });
        }}
      />
      {status ? <p className="sc-saves__status">{status}</p> : null}
    </div>
  );
}
