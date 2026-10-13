import { useEffect, useState } from "react";
import {
  deleteNamedGraphic,
  listNamedGraphics,
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

  useEffect(() => {
    setSaves(listNamedGraphics<T>(storageKey));
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
        }}
      >
        Save
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
        }}
      >
        Delete
      </button>
    </div>
  );
}
